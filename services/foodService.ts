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
    const response = await fetch(`/api/food/${barcode}`);
    if (!response.ok) return null;
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return null;
    }

    const data = await response.json();
    
    if (data.status === 1) {
      return data.product as OFFProduct;
    }
    return null;
  } catch (error) {
    console.error("Error fetching product from Open Food Facts", error);
    return null;
  }
};

export const searchProductsByName = async (query: string): Promise<OFFProduct[]> => {
  if (!query || query.trim().length < 2) return [];
  
  try {
    const response = await fetch(`/api/food/search/${encodeURIComponent(query)}`);
    if (!response.ok) return [];

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return [];
    }

    const data = await response.json();
    
    if (data.products && Array.isArray(data.products)) {
      return data.products as OFFProduct[];
    }
    return [];
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
  source: 'OFF' | 'USDA';
  servingQuantity?: number;
}

export const fetchNutritionData = async (input: string): Promise<{ source: string; products: UnifiedProduct[] }> => {
  const isBarcode = /^\d+$/.test(input);

  if (isBarcode) {
    try {
      const res = await fetch(`/api/food/${input}`);
      if (!res.ok) return { source: 'OFF', products: [] };
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return { source: 'OFF', products: [] };
      }

      const data = await res.json();
      if (!data.product) return { source: 'OFF', products: [] };
      
      const p = data.product;
      return {
        source: 'OFF',
        products: [{
          id: p.code || Math.random().toString(),
          name: p.product_name || "Inconnu",
          kcalPer100g: p.nutriments?.["energy-kcal_100g"] || 0,
          proteinsPer100g: p.nutriments?.proteins_100g || 0,
          carbsPer100g: p.nutriments?.carbohydrates_100g || 0,
          fatPer100g: p.nutriments?.fat_100g || 0,
          imageUrl: p.image_url,
          source: 'OFF',
          servingQuantity: p.serving_quantity || 100
        }]
      };
    } catch (e) {
      console.error("Error fetching barcode from proxy", e);
      return { source: 'OFF', products: [] };
    }
  } else {
    try {
      const [offRes, usdaRes] = await Promise.all([
        fetch(`/api/food/search/${encodeURIComponent(input)}`),
        fetch(`/api/food/usda/${encodeURIComponent(input)}`)
      ]);

      const getJson = async (res: Response) => {
        const ct = res.headers.get("content-type");
        if (res.ok && ct && ct.includes("application/json")) {
          return await res.json();
        }
        return null;
      };

      const offData = await getJson(offRes) || { products: [] };
      const usdaData = await getJson(usdaRes) || { foods: [] };

      const offProducts: UnifiedProduct[] = (offData.products || []).slice(0, 10).map((p: any) => ({
        id: p.code || Math.random().toString(),
        name: p.product_name || "Inconnu",
        kcalPer100g: p.nutriments?.["energy-kcal_100g"] || 0,
        proteinsPer100g: p.nutriments?.proteins_100g || 0,
        carbsPer100g: p.nutriments?.carbohydrates_100g || 0,
        fatPer100g: p.nutriments?.fat_100g || 0,
        imageUrl: p.image_url,
        source: 'OFF',
        servingQuantity: p.serving_quantity || 100
      }));

      const usdaProducts: UnifiedProduct[] = (usdaData.foods || []).slice(0, 10).map((f: any) => {
        const getNutrient = (id: number) => f.foodNutrients.find((n: any) => n.nutrientId === id)?.value || 0;
        return {
          id: f.fdcId?.toString() || Math.random().toString(),
          name: f.description,
          kcalPer100g: getNutrient(1008),
          proteinsPer100g: getNutrient(1003),
          carbsPer100g: getNutrient(1005),
          fatPer100g: getNutrient(1004),
          source: 'USDA',
          servingQuantity: 100
        };
      });

      return { 
        source: 'BOTH', 
        products: [...usdaProducts, ...offProducts]
      };
    } catch (e) {
      console.error("Error searching from proxies", e);
      return { source: 'BOTH', products: [] };
    }
  }
};