const OFF_BASE = "https://world.openfoodfacts.org";
const USER_AGENT = "CaloTrack - WebApp - Version 1.0";

// Vérifie que la réponse est bien du JSON avant de parser
const safeJson = async (response: Response): Promise<any | null> => {
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("application/json") && !ct.includes("text/json")) {
    console.warn("OFF: réponse non-JSON reçue (content-type:", ct, ")");
    return null;
  }
  try {
    return await response.json();
  } catch (e) {
    console.warn("OFF: échec du parsing JSON", e);
    return null;
  }
};

// Fetch avec timeout configurable
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

export const fetchProductByBarcode = async (barcode: string): Promise<OFFProduct | null> => {
  try {
    const response = await fetchWithTimeout(
      `${OFF_BASE}/api/v2/product/${barcode}.json`,
      { headers: { "User-Agent": USER_AGENT } }
    );
    if (!response.ok) return null;
    const data = await safeJson(response);
    if (!data) return null;
    if (data.status === 1) return data.product as OFFProduct;
    return null;
  } catch (error) {
    console.error("Erreur fetchProductByBarcode:", error);
    return null;
  }
};

export const searchProductsByName = async (query: string): Promise<OFFProduct[]> => {
  if (!query || query.trim().length < 2) return [];
  try {
    const response = await fetchWithTimeout(
      `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=24`,
      { headers: { "User-Agent": USER_AGENT } }
    );
    if (!response.ok) return [];
    const data = await safeJson(response);
    if (!data) return [];
    return Array.isArray(data.products) ? (data.products as OFFProduct[]) : [];
  } catch (error) {
    console.error("Erreur searchProductsByName:", error);
    return [];
  }
};

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

export const fetchNutritionData = async (
  input: string
): Promise<{ source: string; products: UnifiedProduct[] }> => {
  const isBarcode = /^\d+$/.test(input);

  if (isBarcode) {
    try {
      const response = await fetchWithTimeout(
        `${OFF_BASE}/api/v2/product/${input}.json`,
        { headers: { "User-Agent": USER_AGENT } }
      );
      if (!response.ok) return { source: "OFF", products: [] };
      const data = await safeJson(response);
      if (!data?.product) return { source: "OFF", products: [] };
      return { source: "OFF", products: [mapOFFProduct(data.product)] };
    } catch (e) {
      console.error("Erreur fetch barcode OFF:", e);
      return { source: "OFF", products: [] };
    }
  } else {
    try {
      const response = await fetchWithTimeout(
        `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(input)}&json=1&page_size=20`,
        { headers: { "User-Agent": USER_AGENT } }
      );
      if (!response.ok) return { source: "OFF", products: [] };
      const data = await safeJson(response);
      if (!data) return { source: "OFF", products: [] };

      const offProducts: UnifiedProduct[] = (data.products || [])
        .slice(0, 20)
        .map(mapOFFProduct);

      return { source: "OFF", products: offProducts };
    } catch (e) {
      console.error("Erreur search OFF:", e);
      return { source: "OFF", products: [] };
    }
  }
};
