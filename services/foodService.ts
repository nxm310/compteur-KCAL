const OFF_BASE = "https://world.openfoodfacts.org";
const USER_AGENT = "CaloTrack - WebApp - Version 1.0";

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
    const response = await fetch(`${OFF_BASE}/api/v2/product/${barcode}.json`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status === 1) return data.product as OFFProduct;
    return null;
  } catch (error) {
    console.error("Error fetching product from Open Food Facts", error);
    return null;
  }
};

export const searchProductsByName = async (query: string): Promise<OFFProduct[]> => {
  if (!query || query.trim().length < 2) return [];
  try {
    const response = await fetch(
      `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=24`,
      { headers: { "User-Agent": USER_AGENT } }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.products) ? (data.products as OFFProduct[]) : [];
  } catch (error) {
    console.error("Error searching products from Open Food Facts", error);
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

export const fetchNutritionData = async (
  input: string
): Promise<{ source: string; products: UnifiedProduct[] }> => {
  const isBarcode = /^\d+$/.test(input);

  if (isBarcode) {
    try {
      const response = await fetch(`${OFF_BASE}/api/v2/product/${input}.json`, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!response.ok) return { source: "OFF", products: [] };
      const data = await response.json();
      if (!data.product) return { source: "OFF", products: [] };
      const p = data.product;
      return {
        source: "OFF",
        products: [
          {
            id: p.code || Math.random().toString(),
            name: p.product_name || "Inconnu",
            kcalPer100g: p.nutriments?.["energy-kcal_100g"] || 0,
            proteinsPer100g: p.nutriments?.proteins_100g || 0,
            carbsPer100g: p.nutriments?.carbohydrates_100g || 0,
            fatPer100g: p.nutriments?.fat_100g || 0,
            imageUrl: p.image_url,
            source: "OFF",
            servingQuantity: p.serving_quantity || 100,
          },
        ],
      };
    } catch (e) {
      console.error("Error fetching barcode from OFF", e);
      return { source: "OFF", products: [] };
    }
  } else {
    try {
      const response = await fetch(
        `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(input)}&json=1&page_size=20`,
        { headers: { "User-Agent": USER_AGENT } }
      );
      if (!response.ok) return { source: "OFF", products: [] };
      const data = await response.json();

      const offProducts: UnifiedProduct[] = (data.products || [])
        .slice(0, 20)
        .map((p: any) => ({
          id: p.code || Math.random().toString(),
          name: p.product_name || "Inconnu",
          kcalPer100g: p.nutriments?.["energy-kcal_100g"] || 0,
          proteinsPer100g: p.nutriments?.proteins_100g || 0,
          carbsPer100g: p.nutriments?.carbohydrates_100g || 0,
          fatPer100g: p.nutriments?.fat_100g || 0,
          imageUrl: p.image_url,
          source: "OFF" as const,
          servingQuantity: p.serving_quantity || 100,
        }));

      return { source: "OFF", products: offProducts };
    } catch (e) {
      console.error("Error searching from OFF", e);
      return { source: "OFF", products: [] };
    }
  }
};