import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("USDA proxy error:", error);
      res.status(500).json({ foods: [] });
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
