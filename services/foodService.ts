const OFF_FR_BASE = "https://fr.openfoodfacts.org";
const OFF_USER_AGENT = "CaloTrack - WebApp - Version 1.0";
const CORS_PROXY = "https://corsproxy.io/?url=";

// ─── Helpers ────────────────────────────────────────────────────────────────

const safeJson = async (response: Response): Promise<any | null> => {
  try {
    const text = await response.text();
    if (!text || text.trim().startsWith("<")) return null;
    return JSON.parse(text);
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

const fetchWithCORSFallback = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> => {
  try {
    const res = await fetchWithTimeout(url, options, timeoutMs);
    if (res.status === 503) throw new Error(`HTTP 503`);
    return res;
  } catch (e) {
    console.warn("Requête directe échouée, retry via proxy CORS:", url);
    const proxied = `${CORS_PROXY}${encodeURIComponent(url)}`;
    return fetchWithTimeout(proxied, {}, timeoutMs);
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
  source: "OFF";
  servingQuantity?: number;
}

// ─── Mapper ──────────────────────────────────────────────────────────────────

const getOFFImageUrl = (p: any): string | undefined => {
  return (
    p.image_front_small_url ||
    p.image_small_url ||
    p.image_thumb_url ||
    p.image_front_thumb_url ||
    (p.image_url ? p.image_url.replace(/\.400\.jpg$/, ".200.jpg") : undefined) ||
    p.image_url
  );
};

const mapOFFProduct = (p: any): UnifiedProduct => ({
  id: p.code || Math.random().toString(),
  name: p.product_name || "Inconnu",
  kcalPer100g: p.nutriments?.["energy-kcal_100g"] || 0,
  proteinsPer100g: p.nutriments?.proteins_100g || 0,
  carbsPer100g: p.nutriments?.carbohydrates_100g || 0,
  fatPer100g: p.nutriments?.fat_100g || 0,
  imageUrl: getOFFImageUrl(p),
  source: "OFF" as const,
  servingQuantity: p.serving_quantity || 100,
});

// ─── OFF : barcode ────────────────────────────────────────────────────────────

const fetchOFFByBarcode = async (barcode: string): Promise<UnifiedProduct | null> => {
  try {
    const res = await fetchWithCORSFallback(
      `${OFF_FR_BASE}/api/v2/product/${barcode}.json`,
      { headers: { "User-Agent": OFF_USER_AGENT } },
      8000
    );
    if (!res.ok) return null;
    const data = await safeJson(res);
    if (!data?.product?.product_name) return null;
    return mapOFFProduct(data.product);
  } catch (e) {
    return null;
  }
};

// ─── OFF : search ─────────────────────────────────────────────────────────────

const searchOFF_FR = async (query: string, pageSize = 20): Promise<UnifiedProduct[]> => {
  try {
    const url = `${OFF_FR_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=${pageSize}&sort_by=unique_scans_n`;
    const res = await fetchWithCORSFallback(url, { headers: { "User-Agent": OFF_USER_AGENT } }, 12000);
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

export const searchProductsByName = async (query: string): Promise<OFFProduct[]> => {
  if (!query || query.trim().length < 2) return [];
  const results = await searchOFF_FR(query, 20);
  return results.map((r) => ({
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
    const result = await fetchOFFByBarcode(input);
    if (result) return { source: "OFF", products: [result] };
    console.warn("Barcode non trouvé dans OFF:", input);
    return { source: "OFF", products: [] };
  } else {
    const results = await searchOFF_FR(input, 20);
    console.log("🇫🇷 OFF-FR:", results.length);
    return { source: "OFF-FR", products: results };
  }
};
