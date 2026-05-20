import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Proxy for Open Food Facts search
  app.get("/api/food/search/:query", async (req, res) => {
    const { query } = req.params;
    try {
      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=24`, {
        headers: {
          "User-Agent": "CaloTrack - WebApp - Version 1.0"
        }
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ status: 0, products: [] });
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        res.json(data);
      } else {
        const text = await response.text();
        console.error("Non-JSON response from OFF Search:", text.substring(0, 100));
        res.status(502).json({ status: 0, products: [] });
      }
    } catch (error) {
      console.error("Search proxy error:", error);
      res.status(500).json({ status: 0, products: [] });
    }
  });

  // API Proxy for Open Food Facts to avoid CORS issues
  app.get("/api/food/:barcode", async (req, res) => {
    const { barcode } = req.params;
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
        headers: {
          "User-Agent": "CaloTrack - WebApp - Version 1.0"
        }
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ status: 0, status_verbose: "Product not found or API error" });
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        res.json(data);
      } else {
        const text = await response.text();
        console.error("Non-JSON response from OFF:", text.substring(0, 100));
        res.status(502).json({ status: 0, status_verbose: "Invalid response from food database" });
      }
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ status: 0, status_verbose: "Failed to fetch from food database" });
    }
  });

  // API Proxy for USDA
  app.get("/api/food/usda/:query", async (req, res) => {
    const { query } = req.params;
    const USDA_API_KEY = process.env.VITE_USDA_API_KEY;
    try {
      const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        return res.status(response.status).json({ foods: [] });
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        res.json(data);
      } else {
        const text = await response.text();
        console.error("Non-JSON response from USDA:", text.substring(0, 100));
        res.status(502).json({ foods: [] });
      }
    } catch (error) {
      console.error("USDA proxy error:", error);
      res.status(500).json({ foods: [] });
    }
  });

  // API for Gemini AI Multimodal Food Analysis
  app.post("/api/food/analyze-image", async (req, res) => {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Aucune donnée d'image reçue." });
    }

    const customApiKey = req.headers["x-gemini-api-key"];
    const apiKey = typeof customApiKey === "string" && customApiKey.trim()
      ? customApiKey.trim()
      : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: "Clé API Gemini manquante. Veuillez en configurer une dans les paramètres de l'application." });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data
            }
          },
          "Analyze this food image. Identify the food item and estimate its nutritional values. " +
          "IMPORTANT: Provide the response STRICTLY as a single raw JSON object. Do not wrap the JSON in ```json markdown blocks, just return raw JSON text. " +
          "The JSON keys MUST be exactly: " +
          "'name' (string, the French name of the food or dish e.g. 'Salade César', 'Pizza Reine', 'Pomme Rouge'), " +
          "'estimatedWeight' (number, the estimated portion weight in grams), " +
          "'kcalPer100g' (number, estimated calories per 100g of this item), " +
          "'proteinPer100g' (number, estimated proteins in grams per 100g), " +
          "'carbsPer100g' (number, estimated carbohydrates in grams per 100g), " +
          "'fatPer100g' (number, estimated fats/lipids in grams per 100g)."
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("L'API Gemini a retourné une réponse vide.");
      }

      // Cleanup markdown if Gemini wrapped it anyway
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

  // API for app version check
  app.get("/api/version", (req, res) => {
    try {
      const versionData = { version: process.env.APP_VERSION || "2026-04-12T14:48:00Z" };
      res.json(versionData);
    } catch (error) {
      res.status(500).json({ version: "unknown" });
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
