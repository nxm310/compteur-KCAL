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
