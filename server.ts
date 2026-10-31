import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OFF_FIELDS =
  "code,product_name,product_name_fr,product_name_en,generic_name,generic_name_fr,brands,nutriments,image_front_small_url,image_small_url,image_thumb_url,image_front_thumb_url,image_url,serving_quantity,serving_size,quantity,unique_scans_n";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Proxy for Open Food Facts search (Search-a-licious modern engine)
  app.get("/api/food/search/:query", async (req, res) => {
    const { query } = req.params;
    try {
      const searchUrl = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&langs=fr&page_size=30&fields=${OFF_FIELDS}`;
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "CaloTrack - WebApp - Version 2.0",
        },
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          return res.json(data);
        }
      }

      // Fallback to Open Food Facts v2 search
      const fallbackUrl = `https://fr.openfoodfacts.org/api/v2/search?categories_tags_fr=${encodeURIComponent(query)}&page_size=24&fields=${OFF_FIELDS}`;
      const fbRes = await fetch(fallbackUrl, {
        headers: { "User-Agent": "CaloTrack - WebApp - Version 2.0" },
      });
      if (fbRes.ok) {
        const fbData = await fbRes.json();
        return res.json(fbData);
      }

      return res.status(502).json({ status: 0, hits: [], products: [] });
    } catch (error) {
      console.error("Search proxy error:", error);
      res.status(500).json({ status: 0, hits: [], products: [] });
    }
  });

  // API Proxy for Open Food Facts barcode (FR first, then World fallback)
  app.get("/api/food/:barcode", async (req, res) => {
    const { barcode } = req.params;
    const endpoints = [
      `https://fr.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OFF_FIELDS}`,
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${OFF_FIELDS}`,
    ];

    try {
      for (const endpoint of endpoints) {
        const response = await fetch(endpoint, {
          headers: {
            "User-Agent": "CaloTrack - WebApp - Version 2.0",
          },
        });

        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (data?.product) {
              return res.json(data);
            }
          }
        }
      }
      return res.status(404).json({ status: 0, status_verbose: "Product not found" });
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ status: 0, status_verbose: "Failed to fetch from food database" });
    }
  });

  // API Proxy for USDA
  app.get("/api/food/usda/:query", async (req, res) => {
    const { query } = req.params;
    const USDA_API_KEY = process.env.VITE_USDA_API_KEY || "DEMO_KEY";
    try {
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=15`
      );

      if (!response.ok) {
        return res.status(response.status).json({ foods: [] });
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        res.json(data);
      } else {
        res.status(502).json({ foods: [] });
      }
    } catch (error) {
      console.error("USDA proxy error:", error);
      res.status(500).json({ foods: [] });
    }
  });

  // API for Gemini AI Multimodal Food Analysis
  app.post("/api/food/analyze-image", async (req, res) => {
    const { image, model: reqModel } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Aucune donnée d'image reçue." });
    }

    const customApiKey = req.headers["x-gemini-api-key"];
    const apiKey =
      typeof customApiKey === "string" && customApiKey.trim()
        ? customApiKey.trim()
        : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: "Clé API Gemini manquante. Veuillez en configurer une dans les paramètres de l'application.",
      });
    }

    const customModelHeader = req.headers["x-gemini-model"];
    const preferredModel =
      (typeof customModelHeader === "string" && customModelHeader.trim()) ||
      (typeof reqModel === "string" && reqModel.trim()) ||
      process.env.GEMINI_MODEL ||
      "gemini-3.8-flash";

    const candidateModels = Array.from(
      new Set([
        preferredModel,
        "gemini-3.8-flash",
        "gemini-4-argon",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
      ])
    );

    try {
      const ai = new GoogleGenAI({ apiKey });
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      const promptText =
        "Analyze this food image. Identify the food item and estimate its nutritional values. " +
        "IMPORTANT: Provide the response STRICTLY as a single raw JSON object. Do not wrap the JSON in ```json markdown blocks, just return raw JSON text. " +
        "The JSON keys MUST be exactly: " +
        "'name' (string, the French name of the food or dish e.g. 'Salade César', 'Pizza Reine', 'Pomme Rouge'), " +
        "'estimatedWeight' (number, the estimated portion weight in grams), " +
        "'kcalPer100g' (number, estimated calories per 100g of this item), " +
        "'proteinPer100g' (number, estimated proteins in grams per 100g), " +
        "'carbsPer100g' (number, estimated carbohydrates in grams per 100g), " +
        "'fatPer100g' (number, estimated fats/lipids in grams per 100g).";

      let lastError: any = null;
      let text = "";

      for (const modelToTry of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelToTry,
            contents: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data,
                },
              },
              promptText,
            ],
            config: {
              responseMimeType: "application/json",
            },
          });

          if (response.text) {
            text = response.text;
            break;
          }
        } catch (modelErr: any) {
          lastError = modelErr;
          console.warn(
            `Modèle ${modelToTry} non disponible ou erreur, essai du suivant...`,
            modelErr?.message || modelErr
          );
        }
      }

      if (!text) {
        throw lastError || new Error("L'API Gemini a retourné une réponse vide.");
      }

      let cleanJson = text.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }

      const result = JSON.parse(cleanJson);
      res.json(result);
    } catch (error: any) {
      console.error("Gemini Image Analysis Error:", error);
      res.status(500).json({ error: error.message || "Erreur lors de l'analyse de l'image." });
    }
  });

  // API for Gemini AI Text Nutritional Estimation
  app.post("/api/food/analyze-text", async (req, res) => {
    const { query, model: reqModel } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Veuillez saisir une description d'aliment ou de plat." });
    }

    const customApiKey = req.headers["x-gemini-api-key"];
    const apiKey =
      typeof customApiKey === "string" && customApiKey.trim()
        ? customApiKey.trim()
        : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: "Clé API Gemini manquante. Veuillez en configurer une dans les paramètres.",
      });
    }

    const customModelHeader = req.headers["x-gemini-model"];
    const preferredModel =
      (typeof customModelHeader === "string" && customModelHeader.trim()) ||
      (typeof reqModel === "string" && reqModel.trim()) ||
      process.env.GEMINI_MODEL ||
      "gemini-3.8-flash";

    const candidateModels = Array.from(
      new Set([
        preferredModel,
        "gemini-3.8-flash",
        "gemini-4-argon",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
      ])
    );

    try {
      const ai = new GoogleGenAI({ apiKey });
      const promptText =
        `Tu es un expert en nutrition française (table CIQUAL / ANSES). Analyse l'aliment ou le plat suivant : "${query}". ` +
        "Fournis une estimation nutritionnelle précise pour 100g ainsi que le poids moyen d'une portion normale. " +
        "IMPORTANT: Réponds UNIQUEMENT avec un objet JSON brut valide (sans balises markdown) contenant exactement les clés : " +
        "'name' (string, nom clair en français ex: 'Couscous Royal', 'Croissant aux amandes'), " +
        "'estimatedWeight' (number, poids moyen d'une portion en grammes), " +
        "'kcalPer100g' (number, calories pour 100g), " +
        "'proteinPer100g' (number, protéines en g pour 100g), " +
        "'carbsPer100g' (number, glucides en g pour 100g), " +
        "'fatPer100g' (number, lipides en g pour 100g).";

      let lastError: any = null;
      let text = "";

      for (const modelToTry of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelToTry,
            contents: [promptText],
            config: {
              responseMimeType: "application/json",
            },
          });

          if (response.text) {
            text = response.text;
            break;
          }
        } catch (modelErr: any) {
          lastError = modelErr;
        }
      }

      if (!text) {
        throw lastError || new Error("L'API Gemini a retourné une réponse vide.");
      }

      let cleanJson = text.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }

      const result = JSON.parse(cleanJson);
      res.json(result);
    } catch (error: any) {
      console.error("Gemini Text Analysis Error:", error);
      res.status(500).json({ error: error.message || "Erreur lors de l'estimation par IA." });
    }
  });

  // API for app version check
  app.get("/api/version", (req, res) => {
    try {
      const versionData = { version: process.env.APP_VERSION || "2026-10-31T19:35:00Z" };
      res.json(versionData);
    } catch (error) {
      res.status(500).json({ version: "unknown" });
    }
  });

  // Centralized Server Storage & Synchronization
  const DATA_DIR = path.join(process.cwd(), "data");
  const DATA_FILE = path.join(DATA_DIR, "calotrack.json");

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  app.get("/api/sync", (req, res) => {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        return res.json(JSON.parse(raw));
      }
      return res.json({ exists: false });
    } catch (error) {
      console.error("Error reading sync data:", error);
      res.status(500).json({ error: "Failed to read sync data" });
    }
  });

  app.post("/api/sync", (req, res) => {
    try {
      const data = req.body;
      if (!data || typeof data !== "object") {
        return res.status(400).json({ error: "Invalid data payload" });
      }
      const payload = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      const tmpFile = `${DATA_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), "utf-8");
      fs.renameSync(tmpFile, DATA_FILE);
      res.json({ success: true, updatedAt: payload.updatedAt });
    } catch (error) {
      console.error("Error saving sync data:", error);
      res.status(500).json({ error: "Failed to save sync data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use("/compteur-KCAL", express.static(distPath));
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
