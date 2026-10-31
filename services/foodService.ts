import { searchCiqual, normalizeText } from "./ciqualData";

const OFF_FR_BASE = "https://fr.openfoodfacts.org";
const OFF_WORLD_BASE = "https://world.openfoodfacts.org";
const OFF_SEARCH_BASE = "https://search.openfoodfacts.org/search";
const CORS_PROXY = "https://corsproxy.io/?url=";

const OFF_FIELDS =
  "code,product_name,product_name_fr,product_name_en,generic_name,generic_name_fr,brands,nutriments,image_front_small_url,image_small_url,image_thumb_url,image_front_thumb_url,image_url,serving_quantity,serving_size,quantity,unique_scans_n";

// ─── Helpers ────────────────────────────────────────────────────────────────

const safeJson = async (response: Response): Promise<any | null> => {
  try {
    const text = await response.text();
    if (!text || text.trim().startsWith("<")) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 7000
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
  brand?: string;
  kcalPer100g: number;
  proteinsPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  imageUrl?: string;
  source: "OFF" | "CIQUAL" | "USDA" | "IA";
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

export const extractOFFProduct = (p: any): UnifiedProduct | null => {
  if (!p) return null;

  const rawBrand = Array.isArray(p.brands)
    ? p.brands[0]
    : typeof p.brands === "string"
      ? p.brands.split(",")[0]?.trim()
      : "";

  const rawName = (
    p.product_name_fr ||
    p.product_name ||
    p.generic_name_fr ||
    p.generic_name ||
    p.product_name_en ||
    rawBrand ||
    ""
  ).trim();

  if (!rawName) return null;

  const n = p.nutriments || {};
  const proteins = Math.max(0, Number(n.proteins_100g ?? n.proteins_value ?? n.proteins ?? 0) || 0);
  const carbs = Math.max(0, Number(n.carbohydrates_100g ?? n.carbohydrates_value ?? n.carbohydrates ?? 0) || 0);
  const fat = Math.max(0, Number(n.fat_100g ?? n.fat_value ?? n.fat ?? 0) || 0);

  let kcal = Number(
    n["energy-kcal_100g"] ??
    n["energy-kcal_value"] ??
    n["energy-kcal"] ??
    0
  ) || 0;

  if (!kcal && (n["energy-kj_100g"] || n["energy_100g"])) {
    const kj = Number(n["energy-kj_100g"] || n["energy_100g"]) || 0;
    if (kj > 0) kcal = Math.round(kj / 4.184);
  }

  if (!kcal && (proteins > 0 || carbs > 0 || fat > 0)) {
    kcal = Math.round(proteins * 4 + carbs * 4 + fat * 9);
  }

  // Formatage lisible du nom avec marque si absente du titre
  let displayName = rawName;
  if (rawBrand && !normalizeText(rawName).includes(normalizeText(rawBrand))) {
    displayName = `${rawName} (${rawBrand})`;
  }

  let servingQty = Number(p.serving_quantity) || 0;
  if (!servingQty && typeof p.serving_size === "string") {
    const match = p.serving_size.match(/(\d+(?:[.,]\d+)?)\s*g/i);
    if (match) servingQty = parseFloat(match[1].replace(",", "."));
  }
  if (!servingQty || servingQty <= 0 || servingQty > 1000) {
    servingQty = 100;
  }

  return {
    id: String(p.code || Math.random().toString(36).slice(2)),
    name: displayName,
    brand: rawBrand || undefined,
    kcalPer100g: Math.round(kcal),
    proteinsPer100g: Math.round(proteins * 10) / 10,
    carbsPer100g: Math.round(carbs * 10) / 10,
    fatPer100g: Math.round(fat * 10) / 10,
    imageUrl: getOFFImageUrl(p),
    source: "OFF",
    servingQuantity: Math.round(servingQty),
  };
};

// ─── OFF : barcode ────────────────────────────────────────────────────────────

const fetchOFFByBarcode = async (barcode: string): Promise<UnifiedProduct | null> => {
  const cleanCode = barcode.trim();

  // 1. Essai via notre backend Express (/api/food/:barcode) qui interroge FR + World sans CORS
  try {
    const res = await fetchWithTimeout(`/api/food/${encodeURIComponent(cleanCode)}`, {}, 5000);
    if (res.ok) {
      const data = await safeJson(res);
      const parsed = extractOFFProduct(data?.product);
      if (parsed) return parsed;
    }
  } catch {
    // Fallback client direct si mode statique
  }

  // 2. Essai direct sur Open Food Facts FR puis World (sans header User-Agent custom qui bloque CORS)
  const urls = [
    `${OFF_FR_BASE}/api/v2/product/${encodeURIComponent(cleanCode)}.json?fields=${OFF_FIELDS}`,
    `${OFF_WORLD_BASE}/api/v2/product/${encodeURIComponent(cleanCode)}.json?fields=${OFF_FIELDS}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetchWithTimeout(url, {}, 6000);
      if (!res.ok) continue;
      const data = await safeJson(res);
      const parsed = extractOFFProduct(data?.product);
      if (parsed) return parsed;
    } catch {
      // continue
    }
  }

  return null;
};

// ─── OFF : Recherche moderne Search-a-licious + Fallback ──────────────────────

const searchOFFModern = async (query: string, pageSize = 25): Promise<UnifiedProduct[]> => {
  // 1. Via notre proxy Express (/api/food/search/:query) -> ultra rapide, pas de CORS
  try {
    const res = await fetchWithTimeout(`/api/food/search/${encodeURIComponent(query)}`, {}, 6500);
    if (res.ok) {
      const data = await safeJson(res);
      const rawList = data?.hits || data?.products || [];
      if (Array.isArray(rawList) && rawList.length > 0) {
        const mapped = rawList
          .map(extractOFFProduct)
          .filter((p): p is UnifiedProduct => p !== null && p.kcalPer100g > 0);
        if (mapped.length > 0) return mapped.slice(0, pageSize);
      }
    }
  } catch {
    // Fallback si serveur local indisponible (ex: GitHub Pages)
  }

  // 2. Fallback client via Search-a-licious proxifié
  try {
    const targetUrl = `${OFF_SEARCH_BASE}?q=${encodeURIComponent(query)}&langs=fr&page_size=${pageSize}&fields=${OFF_FIELDS}`;
    const res = await fetchWithTimeout(`${CORS_PROXY}${encodeURIComponent(targetUrl)}`, {}, 7000);
    if (res.ok) {
      const data = await safeJson(res);
      const rawList = data?.hits || data?.products || [];
      if (Array.isArray(rawList)) {
        return rawList
          .map(extractOFFProduct)
          .filter((p): p is UnifiedProduct => p !== null && p.kcalPer100g > 0)
          .slice(0, pageSize);
      }
    }
  } catch (e) {
    console.warn("OFF search fallback error:", e);
  }

  return [];
};

// ─── Pertinence & Fusion Multi-Sources (CIQUAL + OFF) ─────────────────────────

const scoreProductRelevance = (product: UnifiedProduct, query: string): number => {
  const qNorm = normalizeText(query);
  const nameNorm = normalizeText(product.name);
  const tokens = qNorm.split(/\s+/).filter((t) => t.length >= 2);

  let score = 0;

  // Bonus pour la base officielle CIQUAL quand on cherche un aliment simple / brut
  if (product.source === "CIQUAL") {
    score += 45;
  }

  if (nameNorm === qNorm) {
    score += 150;
  } else if (nameNorm.startsWith(qNorm + " ") || nameNorm.startsWith(qNorm + " (")) {
    score += 110;
  } else if (nameNorm.startsWith(qNorm)) {
    score += 90;
  } else if (nameNorm.includes(` ${qNorm}`)) {
    score += 65;
  } else if (nameNorm.includes(qNorm)) {
    score += 45;
  }

  for (const token of tokens) {
    if (nameNorm.includes(token)) {
      score += 25;
    }
  }

  // Pénaliser légèrement les noms très longs quand la requête est courte
  if (tokens.length <= 2 && product.name.length > 48) {
    score -= 10;
  }

  return score;
};

export const searchMultiSource = async (query: string): Promise<UnifiedProduct[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // 1. Recherche instantanée dans la table officielle CIQUAL (ANSES)
  const ciqualResults = searchCiqual(trimmed, 12);

  // 2. Recherche en parallèle sur Open Food Facts (Search-a-licious)
  const offResults = await searchOFFModern(trimmed, 28);

  // 3. Fusion, dédoublonnage et tri par score de pertinence
  const combined = [...ciqualResults, ...offResults];
  const seen = new Set<string>();
  const unique: UnifiedProduct[] = [];

  for (const item of combined) {
    const key = `${normalizeText(item.name)}-${Math.round(item.kcalPer100g / 5)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  return unique.sort((a, b) => scoreProductRelevance(b, trimmed) - scoreProductRelevance(a, trimmed));
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
  const results = await searchMultiSource(query);
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
  const trimmed = input.trim();
  const isBarcode = /^\d{6,14}$/.test(trimmed);

  if (isBarcode) {
    const result = await fetchOFFByBarcode(trimmed);
    if (result) return { source: "OFF", products: [result] };
    console.warn("Code-barres non trouvé dans OFF:", trimmed);
    return { source: "OFF", products: [] };
  } else {
    const results = await searchMultiSource(trimmed);
    return { source: "MULTI", products: results };
  }
};
