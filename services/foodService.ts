const OFF_BASE = "https://world.openfoodfacts.org";
const OFF_FR_BASE = "https://fr.openfoodfacts.org";
const OFF_USER_AGENT = "CaloTrack - WebApp - Version 1.0";
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_API_KEY = "SBFfcU1dYSIQkGUKBUstxhJUkJVim2DqaWbnBd0J";

// Proxy CORS de secours — utilisé uniquement si la requête directe échoue (iOS Safari)
const CORS_PROXY = "https://corsproxy.io/?url=";

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

// Fetch avec fallback proxy CORS automatique si la requête directe est bloquée (CORS/503)
const fetchWithCORSFallback = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> => {
  try {
    const res = await fetchWithTimeout(url, options, timeoutMs);
    // 503 = souvent le signe d'un blocage CORS côté serveur sur iOS
    if (res.status === 503) throw new Error(`HTTP 503`);
    return res;
  } catch (e) {
    // Retry via proxy CORS (sans User-Agent — le proxy ne le transmet pas toujours)
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
    kcalPer100g: get(1008),
    proteinsPer100g: get(1003),
    carbsPer100g: get(1005),
    fatPer100g: get(1004),
    imageUrl: undefined,
    source: "USDA" as const,
    servingQuantity: 100,
  };
};

// ─── OFF : barcode ────────────────────────────────────────────────────────────

const fetchOFFByBarcode = async (barcode: string): Promise<UnifiedProduct | null> => {
  try {
    const res = await fetchWithCORSFallback(
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

// ─── OFF : search FR (fr.openfoodfacts.org — priorité EU/FR) ─────────────────

const searchOFF_FR = async (query: string, pageSize = 20): Promise<UnifiedProduct[]> => {
  try {
    const url = `${OFF_FR_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=${pageSize}&sort_by=unique_scans_n`;
    const res = await fetchWithCORSFallback(url, { headers: { "User-Agent": OFF_USER_AGENT } });
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

// ─── OFF : search world (world.openfoodfacts.org — fallback mondial) ──────────
// Note : world bloque corsproxy.io avec 503 — on tente quand même en direct
// (fonctionne sur desktop/Android), mais on ne le met plus en parallèle bloquant

const searchOFF = async (query: string, pageSize = 20): Promise<UnifiedProduct[]> => {
  try {
    const url = `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=${pageSize}&sort_by=unique_scans_n`;
    // Pas de fallback proxy pour world (il bloque corsproxy.io) — tentative directe uniquement
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": OFF_USER_AGENT } }, 6000);
    if (!res.ok) return [];
    const data = await safeJson(res);
    if (!data) return [];
    return (data.products || [])
      .filter((p: any) => p.product_name && (p.nutriments?.["energy-kcal_100g"] || 0) > 0)
      .slice(0, pageSize)
      .map(mapOFFProduct);
  } catch (e) {
    // Silencieux — world peut échouer sur iOS, FR suffit
    return [];
  }
};

// ─── USDA : search ────────────────────────────────────────────────────────────

const searchUSDA = async (query: string, limit = 10): Promise<UnifiedProduct[]> => {
  try {
    const url = `${USDA_BASE}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=${limit}&dataType=Foundation,SR%20Legacy,Branded`;
    const res = await fetchWithCORSFallback(url);
    if (!res.ok) return [];
    const data = await safeJson(res);
    if (!data?.foods) return [];
    return data.foods.slice(0, limit).map(mapUSDAProduct);
  } catch (e) {
    console.warn("USDA search error:", e);
    return [];
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const deduplicateById = (products: UnifiedProduct[]): UnifiedProduct[] => {
  const seen = new Set<string>();
  return products.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
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

  const [frResults, worldResults] = await Promise.all([
    searchOFF_FR(query, 20),
    searchOFF(query, 20),
  ]);

  const allResults = deduplicateById([...frResults, ...worldResults]);

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
    const offResult = await fetchOFFByBarcode(input);
    if (offResult) return { source: "OFF", products: [offResult] };
    console.warn("Barcode non trouvé dans OFF:", input);
    return { source: "OFF", products: [] };

  } else {
    // Stratégie : FR en priorité (fonctionne sur iOS via proxy CORS)
    // World lancé en parallèle mais non-bloquant (peut échouer sur iOS, c'est OK)
    const worldPromise = searchOFF(input, 20); // lancé mais pas encore attendu

    const frResults = await searchOFF_FR(input, 20);
    console.log("🇫🇷 OFF-FR:", frResults.length);

    // Si FR a assez de résultats, on n'attend même pas world
    if (frResults.length >= 5) {
      return { source: "OFF-FR", products: frResults };
    }

    // FR insuffisant → on attend world (il a eu le même temps que FR pour répondre)
    const worldResults = await worldPromise;
    console.log("🌍 OFF-world:", worldResults.length);

    const offResults = deduplicateById([...frResults, ...worldResults]);

    if (offResults.length >= 3) {
      return { source: "OFF", products: offResults };
    }

    // USDA uniquement si OFF (FR + world) insuffisant
    const usdaResults = await searchUSDA(input, 10);
    return {
      source: "OFF+USDA",
      products: deduplicateById([...offResults, ...usdaResults]),
    };
  }
};
