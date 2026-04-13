const OFF_BASE = "https://world.openfoodfacts.org";
const OFF_FR_BASE = "https://fr.openfoodfacts.org"; // Priorité FR/EU pour recherches manuelles
const OFF_USER_AGENT = "CaloTrack - WebApp - Version 1.0";
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_API_KEY = "SBFfcU1dYSIQkGUKBUstxhJUkJVim2DqaWbnBd0J";

// ─── Helpers ────────────────────────────────────────────────────────────────

const safeJson = async (response: Response): Promise<any | null> => {
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("application/json") && !ct.includes("text/json")) {
    console.warn("API: réponse non-JSON (content-type:", ct, ")");
    return null;
  }
  try {
    return await response.json();
  } catch (e) {
    console.warn("API: échec du parsing JSON", e);
    return null;
  }
};

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OFFProduct {
  code: string;
  product_name: string;
  image_url?: string;
  nutriments: {
    "energy-kcal_100g"?: number;
    "energy-kcal_serving"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
  serving_size?: string;
  serving_quantity?: number;
}

export interface UnifiedProduct {
  id: string;
  name: string;
  kcalPer100g: number;
  proteinsPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  imageUrl?: string;
  source: "OFF" | "USDA";
  servingQuantity?: number;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

const mapOFFProduct = (p: any): UnifiedProduct => ({
  id: p.code || Math.random().toString(),
  name: p.product_name || "Inconnu",
  kcalPer100g: p.nutriments?.["energy-kcal_100g"] || 0,
  proteinsPer100g: p.nutriments?.proteins_100g || 0,
  carbsPer100g: p.nutriments?.carbohydrates_100g || 0,
  fatPer100g: p.nutriments?.fat_100g || 0,
  imageUrl: p.image_url,
  source: "OFF" as const,
  servingQuantity: p.serving_quantity || 100,
});

const mapUSDAProduct = (p: any): UnifiedProduct => {
  const nutrients = p.foodNutrients || [];
  const get = (id: number) => nutrients.find((n: any) => n.nutrientId === id)?.value || 0;
  return {
    id: String(p.fdcId || Math.random()),
    name: p.description || "Inconnu",
    kcalPer100g: get(1008),       // Energy (kcal)
    proteinsPer100g: get(1003),   // Protein
    carbsPer100g: get(1005),      // Carbohydrates
    fatPer100g: get(1004),        // Total fat
    imageUrl: undefined,
    source: "USDA" as const,
    servingQuantity: 100,
  };
};

// ─── OFF : barcode ────────────────────────────────────────────────────────────

const fetchOFFByBarcode = async (barcode: string): Promise<UnifiedProduct | null> => {
  try {
    const res = await fetchWithTimeout(
      `${OFF_BASE}/api/v2/product/${barcode}.json`,
      { headers: { "User-Agent": OFF_USER_AGENT } }
    );
    if (!res.ok) return null;
    const data = await safeJson(res);
    if (!data?.product) return null;
    return mapOFFProduct(data.product);
  } catch (e) {
    console.warn("OFF barcode error:", e);
    return null;
  }
};

// ─── OFF : search (fr.openfoodfacts.org — priorité EU/FR) ────────────────────

const searchOFF_FR = async (query: string, pageSize = 20): Promise<UnifiedProduct[]> => {
  try {
    const res = await fetchWithTimeout(
      `${OFF_FR_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=${pageSize}&sort_by=unique_scans_n`,
      { headers: { "User-Agent": OFF_USER_AGENT } }
    );
    if (!res.ok) return [];
    const data = await safeJson(res);
    if (!data) return [];
    return (data.products || [])
      .filter((p: any) => p.product_name && (p.nutriments?.["energy-kcal_100g"] || 0) > 0)
      .slice(0, pageSize)
      .map(mapOFFProduct);
  } catch (e) {
    console.warn("OFF FR search error:", e);
    return [];
  }
};

// ─── OFF : search (world.openfoodfacts.org — fallback mondial) ────────────────

const searchOFF = async (query: string, pageSize = 20): Promise<UnifiedProduct[]> => {
  try {
    const res = await fetchWithTimeout(
      `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=${pageSize}&sort_by=unique_scans_n`,
      { headers: { "User-Agent": OFF_USER_AGENT } }
    );
    if (!res.ok) return [];
    const data = await safeJson(res);
    if (!data) return [];
    return (data.products || [])
      .filter((p: any) => p.product_name && (p.nutriments?.["energy-kcal_100g"] || 0) > 0)
      .slice(0, pageSize)
      .map(mapOFFProduct);
  } catch (e) {
    console.warn("OFF search error:", e);
    return [];
  }
};

// ─── USDA : search ────────────────────────────────────────────────────────────

const searchUSDA = async (query: string, limit = 10): Promise<UnifiedProduct[]> => {
  try {
    const url = `${USDA_BASE}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=${limit}&dataType=Foundation,SR%20Legacy,Branded`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = await safeJson(res);
    if (!data?.foods) return [];
    return data.foods.slice(0, limit).map(mapUSDAProduct);
  } catch (e) {
    console.warn("USDA search error:", e);
    return [];
  }
};

// ─── API publique ─────────────────────────────────────────────────────────────

export const fetchProductByBarcode = async (barcode: string): Promise<OFFProduct | null> => {
  const result = await fetchOFFByBarcode(barcode);
  if (!result) return null;
  return {
    code: result.id,
    product_name: result.name,
    image_url: result.imageUrl,
    nutriments: {
      "energy-kcal_100g": result.kcalPer100g,
      proteins_100g: result.proteinsPer100g,
      carbohydrates_100g: result.carbsPer100g,
      fat_100g: result.fatPer100g,
    },
    serving_quantity: result.servingQuantity,
  };
};

// Déduplique par id (un même produit peut apparaître dans fr et world)
const deduplicateById = (products: UnifiedProduct[]): UnifiedProduct[] => {
  const seen = new Set<string>();
  return products.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
};

export const searchProductsByName = async (query: string): Promise<OFFProduct[]> => {
  if (!query || query.trim().length < 2) return [];

  // 1. Priorité : fr.openfoodfacts.org (produits FR/EU)
  const frResults = await searchOFF_FR(query, 20);

  // 2. Fallback : world.openfoodfacts.org si résultats insuffisants
  let allResults = frResults;
  if (frResults.length < 5) {
    const worldResults = await searchOFF(query, 20);
    allResults = deduplicateById([...frResults, ...worldResults]);
  }

  return allResults.map((r) => ({
    code: r.id,
    product_name: r.name,
    image_url: r.imageUrl,
    nutriments: {
      "energy-kcal_100g": r.kcalPer100g,
      proteins_100g: r.proteinsPer100g,
      carbohydrates_100g: r.carbsPer100g,
      fat_100g: r.fatPer100g,
    },
    serving_quantity: r.servingQuantity,
  }));
};

export const fetchNutritionData = async (
  input: string
): Promise<{ source: string; products: UnifiedProduct[] }> => {
  const isBarcode = /^\d+$/.test(input);

  if (isBarcode) {
    // Barcode : world OFF suffit (déjà très efficace)
    const offResult = await fetchOFFByBarcode(input);
    if (offResult) return { source: "OFF", products: [offResult] };
    console.warn("Barcode non trouvé dans OFF:", input);
    return { source: "OFF", products: [] };

  } else {
    // Recherche manuelle : fr → world → USDA (dernier recours)
    const frResults = await searchOFF_FR(input, 20);

    console.log("🔍 searchOFF_FR →", frResults.length, "résultats pour:", input);

    if (frResults.length >= 5) {
      return { source: "OFF-FR", products: frResults };
    }

    const worldResults = await searchOFF(input, 20);
    const offResults = deduplicateById([...frResults, ...worldResults]);

    if (offResults.length >= 3) {
      return { source: "OFF", products: offResults };
    }

    // USDA seulement si OFF (FR + world) insuffisant
    const usdaResults = await searchUSDA(input, 10);
    return {
      source: "OFF+USDA",
      products: deduplicateById([...offResults, ...usdaResults]),
    };
  }
};
