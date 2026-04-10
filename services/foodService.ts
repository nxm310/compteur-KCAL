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

export const fetchNutritionData = async (input: string) => {
  const isBarcode = /^\d+$/.test(input);

  if (isBarcode) {
    try {
      const res = await fetch(`/api/food/${input}`);
      if (!res.ok) return { source: 'OFF', data: null };
      const data = await res.json();
      return { source: 'OFF', data: data.product };
    } catch (e) {
      console.error("Error fetching barcode from proxy", e);
      return { source: 'OFF', data: null };
    }
  } else {
    // RECHERCHE PAR TEXTE : On lance les deux en parallèle via les proxies
    try {
      const [offRes, usdaRes] = await Promise.all([
        fetch(`/api/food/search/${encodeURIComponent(input)}`),
        fetch(`/api/food/usda/${encodeURIComponent(input)}`)
      ]);

      const offData = offRes.ok ? await offRes.json() : { products: [] };
      const usdaData = usdaRes.ok ? await usdaRes.json() : { foods: [] };

      return { 
        source: 'BOTH', 
        off: offData.products?.[0], // Le premier résultat OFF
        usda: usdaData.foods?.[0]    // Le premier résultat USDA
      };
    } catch (e) {
      console.error("Error searching from proxies", e);
      return { source: 'BOTH', off: null, usda: null };
    }
  }
};