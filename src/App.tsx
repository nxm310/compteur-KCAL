/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format, addDays, subDays, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Menu, 
  User, 
  Flame, 
  Target, 
  Leaf, 
  BarChart3, 
  Sun, 
  Moon, 
  Apple, 
  Croissant,
  Plus, 
  RefreshCw,
  Footprints,
  Scan,
  X,
  Trash2,
  ChevronRight,
  Loader2,
  ChevronLeft,
  Calendar as CalendarIcon,
  Save,
  ArrowLeft,
  Scale,
  Dna,
  Droplets,
  Wheat,
  History,
  Bike,
  Dumbbell,
  Timer,
  Activity as ActivityIcon,
  Wind,
  Download,
  Upload,
  Zap,
  ChevronDown,
  UserCheck,
  Search,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Scanner, ScannerHandle } from "@/components/Scanner";
import { fetchProductByBarcode, searchProductsByName, fetchNutritionData, OFFProduct, UnifiedProduct } from "@/services/foodService";

interface LoggedProduct {
  id: string;
  name: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  quantityGrams: number;
  imageUrl?: string;
}

interface MealState {
  title: string;
  icon: any;
  color: string;
  products: LoggedProduct[];
}

interface Activity {
  id: string;
  name: string;
  calories: number;
}

interface UserProfile {
  currentWeight: number;
  goalWeight: number;
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  sex: Sex;
  age: number;
  height: number;
  activityLevel: ActivityLevel;
}

type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
type Sex = "male" | "female";

const DEFAULT_PROFILE: UserProfile = {
  currentWeight: 75,
  goalWeight: 70,
  calorieGoal: 2000,
  proteinGoal: 150,
  carbsGoal: 200,
  fatGoal: 65,
  sex: "male",
  age: 30,
  height: 175,
  activityLevel: "moderate",
};

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sédentaire",
  light: "Légèrement actif",
  moderate: "Modérément actif",
  active: "Très actif",
  very_active: "Extrêmement actif",
};

const PROTEIN_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.0,
  light: 1.2,
  moderate: 1.5,
  active: 1.8,
  very_active: 2.0,
};

interface MacroRecommendation {
  tdee: number;
  bmr: number;
  protein: number;
  carbs: number;
  fat: number;
  source: string;
}

const computeRecommendations = (profile: UserProfile): MacroRecommendation => {
  const { sex, age, currentWeight, height, activityLevel, calorieGoal } = profile;

  const bmr = sex === "male"
    ? 10 * currentWeight + 6.25 * height - 5 * age + 5
    : 10 * currentWeight + 6.25 * height - 5 * age - 161;

  const tdee = Math.round(bmr * ACTIVITY_FACTORS[activityLevel]);
  const kcal = calorieGoal > 0 ? calorieGoal : tdee;

  const protein = Math.round(currentWeight * PROTEIN_FACTORS[activityLevel]);
  const fat = Math.round((kcal * 0.35) / 9);
  const carbs = Math.round(Math.max(0, kcal - protein * 4 - fat * 9) / 4);

  return {
    tdee,
    bmr: Math.round(bmr),
    protein,
    carbs,
    fat,
    source: "Mifflin-St Jeor + ANSES 2021",
  };
};

const CURRENT_VERSION = "2026-04-12T14:48:00Z";

const ICON_MAP: Record<string, any> = {
  Sun,
  Moon,
  Apple,
  Croissant
};

const INITIAL_MEALS = [
  { title: "Petit-déj", icon: "Croissant", color: "text-orange-500", bg: "bg-orange-50", products: [] },
  { title: "Déjeuner", icon: "Sun", color: "text-yellow-500", bg: "bg-yellow-50", products: [] },
  { title: "Dîner", icon: "Moon", color: "text-indigo-500", bg: "bg-indigo-50", products: [] },
  { title: "En-cas", icon: "Apple", color: "text-red-500", bg: "bg-red-50", products: [] },
];

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"dashboard" | "profile">("dashboard");
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem("calo_profile_v2");
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch (e) {
      console.error("Error parsing profile:", e);
      return DEFAULT_PROFILE;
    }
  });

  const [mealsByDate, setMealsByDate] = useState<Record<string, MealState[]>>(() => {
    try {
      const saved = localStorage.getItem("calo_meals_v2");
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      const BG_MAP: Record<string, string> = {
        "Petit-déj": "bg-orange-50",
        "Déjeuner": "bg-yellow-50",
        "Dîner": "bg-indigo-50",
        "En-cas": "bg-red-50",
      };
      Object.keys(parsed).forEach(date => {
        parsed[date] = parsed[date].map((meal: any) => {
          if (meal.title === "Petit-déj" && meal.icon === "Sun") {
            return { ...meal, icon: "Croissant", color: "text-orange-500", bg: "bg-orange-50" };
          }
          if (!meal.bg) {
            return { ...meal, bg: BG_MAP[meal.title] || "bg-slate-50" };
          }
          return meal;
        });
      });
      return parsed;
    } catch (e) {
      console.error("Error parsing meals:", e);
      return {};
    }
  });

  const dateKey = format(currentDate, "yyyy-MM-dd");
  const meals = useMemo(() => mealsByDate[dateKey] || INITIAL_MEALS, [mealsByDate, dateKey]);

  useEffect(() => {
    localStorage.setItem("calo_profile_v2", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("calo_meals_v2", JSON.stringify(mealsByDate));
  }, [mealsByDate]);

  const setMeals = (newMeals: MealState[]) => {
    setMealsByDate(prev => ({
      ...prev,
      [dateKey]: newMeals
    }));
  };

  const [activitiesByDate, setActivitiesByDate] = useState<Record<string, Activity[]>>(() => {
    try {
      const saved = localStorage.getItem("calo_activities_v2");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Error parsing activities:", e);
      return {};
    }
  });

  const activities = useMemo(() => activitiesByDate[dateKey] || [], [activitiesByDate, dateKey]);

  useEffect(() => {
    localStorage.setItem("calo_activities_v2", JSON.stringify(activitiesByDate));
  }, [activitiesByDate]);

  const setActivities = (newActivities: Activity[]) => {
    setActivitiesByDate(prev => ({
      ...prev,
      [dateKey]: newActivities
    }));
  };

  // ─── Favorites & History search ──────────────────────────────────────────
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("calo_favorites_v2");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [historySearch, setHistorySearch] = useState("");
  const [historyTab, setHistoryTab] = useState<"recent" | "favorites">("recent");

  useEffect(() => {
    localStorage.setItem("calo_favorites_v2", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = useCallback((productName: string) => {
    setFavorites(prev =>
      prev.includes(productName)
        ? prev.filter(n => n !== productName)
        : [...prev, productName]
    );
  }, []);

  // ─── Scanner & UI state ───────────────────────────────────────────────────
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef<ScannerHandle>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const historyScrollRef = useRef<HTMLDivElement>(null);

  // iOS fix : force scroll activation au premier rendu du dialog
  useEffect(() => {
    if (!isHistoryOpen) return;
    const timer = setTimeout(() => {
      if (historyScrollRef.current) {
        historyScrollRef.current.scrollTop = 1;
        historyScrollRef.current.scrollTop = 0;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isHistoryOpen]);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [tempWeightInput, setTempWeightInput] = useState<number | string>("");

  // Historique du poids : { date: string, weight: number }[]
  const [weightHistory, setWeightHistory] = useState<{ date: string; weight: number }[]>(() => {
    try {
      const saved = localStorage.getItem("calo_weight_history_v1");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("calo_weight_history_v1", JSON.stringify(weightHistory));
  }, [weightHistory]);

  const logWeight = (w: number) => {
    const today = format(new Date(), "yyyy-MM-dd");
    setWeightHistory(prev => {
      const filtered = prev.filter(e => e.date !== today);
      return [...filtered, { date: today, weight: w }].sort((a, b) => a.date.localeCompare(b.date));
    });
    setProfile(prev => ({ ...prev, currentWeight: w }));
  };
  const [tempActivityName, setTempActivityName] = useState("");
  const [tempActivityKcal, setTempActivityKcal] = useState(0);
  const [activeMealIndex, setActiveMealIndex] = useState<number | null>(null);
  const [productHistory, setProductHistory] = useState<LoggedProduct[]>(() => {
    try {
      const saved = localStorage.getItem("calo_history_v2");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error parsing history:", e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("calo_history_v2", JSON.stringify(productHistory));
  }, [productHistory]);

  const [scannedProduct, setScannedProduct] = useState<UnifiedProduct | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempQuantity, setTempQuantity] = useState<number | string>(100);
  const [tempKcal, setTempKcal] = useState<number | string>(0);
  const [tempProtein, setTempProtein] = useState<number | string>(0);
  const [tempCarbs, setTempCarbs] = useState<number | string>(0);
  const [tempFat, setTempFat] = useState<number | string>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<UnifiedProduct[]>([]);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showUpdateAvailable, setShowUpdateAvailable] = useState(false);

  useEffect(() => {
    const handler = () => setShowUpdateAvailable(true);
    window.addEventListener('pwa-update-available', handler);
    return () => window.removeEventListener('pwa-update-available', handler);
  }, []);

  // Chauffe la connexion vers OFF dès le montage — évite le cold-start au premier scan
  useEffect(() => {
    fetch('https://fr.openfoodfacts.org/api/v2/search?search_terms=a&json=1&page_size=1')
      .catch(() => {});
    fetch('https://world.openfoodfacts.org/api/v2/search?search_terms=a&json=1&page_size=1')
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (scannedProduct) {
      setTempName(scannedProduct.name || "");
      setTempKcal(scannedProduct.kcalPer100g || 0);
      setTempProtein(scannedProduct.proteinsPer100g || 0);
      setTempCarbs(scannedProduct.carbsPer100g || 0);
      setTempFat(scannedProduct.fatPer100g || 0);
    }
  }, [scannedProduct]);

  // ─── Filtered history ─────────────────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    let items = historyTab === "favorites"
      ? productHistory.filter(p => favorites.includes(p.name))
      : productHistory;
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      items = items.filter(p => p.name.toLowerCase().includes(q));
    }
    return items;
  }, [productHistory, favorites, historyTab, historySearch]);

  // ─── Totals ───────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    return meals.reduce((acc, meal) => {
      const mealTotals = meal.products.reduce((mAcc, p) => {
        const factor = (p.quantityGrams || 0) / 100;
        return {
          kcal: mAcc.kcal + (p.kcalPer100g || 0) * factor,
          protein: mAcc.protein + (p.proteinPer100g || 0) * factor,
          carbs: mAcc.carbs + (p.carbsPer100g || 0) * factor,
          fat: mAcc.fat + (p.fatPer100g || 0) * factor,
        };
      }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
      return {
        kcal: acc.kcal + mealTotals.kcal,
        protein: acc.protein + mealTotals.protein,
        carbs: acc.carbs + mealTotals.carbs,
        fat: acc.fat + mealTotals.fat,
      };
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  }, [meals]);

  const totalBurned = useMemo(() => {
    return activities.reduce((acc, act) => acc + act.calories, 0);
  }, [activities]);

  const remaining = profile.calorieGoal - totals.kcal + totalBurned;
  const progress = Math.min((totals.kcal / (profile.calorieGoal + totalBurned)) * 100, 100);

  // ─── Scan success handler ─────────────────────────────────────────────────
  const handleScanSuccess = useCallback(async (input: string) => {
    if (isLoading || isProductModalOpen) return;
    setIsLoading(true);
    try {
      const result = await fetchNutritionData(input);
      if (result.products && result.products.length > 0) {
        if (result.products.length === 1) {
          setScannedProduct(result.products[0]);
          setIsScannerOpen(false);
          setIsProductModalOpen(true);
          setTempQuantity(result.products[0].servingQuantity || 100);
        } else {
          setSearchResults(result.products);
          setIsScannerOpen(false);
          setIsSearchModalOpen(true);
        }
      } else {
        setTempName(input);
        setScannedProduct({
          id: Math.random().toString(),
          name: input,
          kcalPer100g: 0,
          proteinsPer100g: 0,
          carbsPer100g: 0,
          fatPer100g: 0,
          imageUrl: "",
          source: 'OFF',
          servingQuantity: 100
        });
        setIsScannerOpen(false);
        setIsProductModalOpen(true);
      }
    } catch (error) {
      console.error("Erreur technique de recherche:", error);
      setTempName(input);
      setScannedProduct({
        id: Math.random().toString(),
        name: input,
        kcalPer100g: 0,
        proteinsPer100g: 0,
        carbsPer100g: 0,
        fatPer100g: 0,
        imageUrl: "",
        source: 'OFF',
        servingQuantity: 100
      });
      setIsScannerOpen(false);
      setIsProductModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isProductModalOpen]);

  // ─── Open product modal from history item ─────────────────────────────────
  const openProductFromHistory = useCallback((product: LoggedProduct, mealIdx?: number) => {
    setScannedProduct({
      id: product.id,
      name: product.name,
      kcalPer100g: product.kcalPer100g,
      proteinsPer100g: product.proteinPer100g,
      carbsPer100g: product.carbsPer100g,
      fatPer100g: product.fatPer100g,
      imageUrl: product.imageUrl,
      source: 'OFF',
      servingQuantity: product.quantityGrams || 100
    });
    setTempQuantity(product.quantityGrams || 100);
    setActiveMealIndex(mealIdx !== undefined ? mealIdx : null);
    setIsProductModalOpen(true);
  }, []);

  // ─── Add product to meal ──────────────────────────────────────────────────
  const addProductToMeal = () => {
    if (scannedProduct && activeMealIndex !== null) {
      const newProduct: LoggedProduct = {
        id: Math.random().toString(36).substr(2, 9),
        name: tempName || scannedProduct.name || "Produit inconnu",
        kcalPer100g: Number(tempKcal) || 0,
        proteinPer100g: Number(tempProtein) || 0,
        carbsPer100g: Number(tempCarbs) || 0,
        fatPer100g: Number(tempFat) || 0,
        quantityGrams: Number(tempQuantity) || 0,
        imageUrl: scannedProduct.imageUrl,
      };
      const updatedMeals = [...meals];
      updatedMeals[activeMealIndex].products.push(newProduct);
      setMeals(updatedMeals);
      setProductHistory(prev => {
        const filtered = prev.filter(p => p.name !== newProduct.name);
        return [newProduct, ...filtered].slice(0, 50);
      });
      setIsProductModalOpen(false);
      setScannedProduct(null);
    }
  };

  const addToHistoryOnly = () => {
    if (scannedProduct) {
      const newProduct: LoggedProduct = {
        id: Math.random().toString(36).substr(2, 9),
        name: tempName || scannedProduct.name || "Produit inconnu",
        kcalPer100g: Number(tempKcal) || 0,
        proteinPer100g: Number(tempProtein) || 0,
        carbsPer100g: Number(tempCarbs) || 0,
        fatPer100g: Number(tempFat) || 0,
        quantityGrams: Number(tempQuantity) || 0,
        imageUrl: scannedProduct.imageUrl,
      };
      setProductHistory(prev => {
        const filtered = prev.filter(p => p.name !== newProduct.name);
        return [newProduct, ...filtered].slice(0, 50);
      });
      setIsProductModalOpen(false);
      setScannedProduct(null);
    }
  };

  const addHistoryProductToMeal = (product: LoggedProduct) => {
    if (activeMealIndex !== null) {
      const newProduct = { ...product, id: Math.random().toString(36).substr(2, 9) };
      const updatedMeals = [...meals];
      updatedMeals[activeMealIndex].products.push(newProduct);
      setMeals(updatedMeals);
      setIsScannerOpen(false);
    } else {
      // Pas de repas sélectionné → ouvrir le modal produit pour choisir
      openProductFromHistory(product);
      setIsScannerOpen(false);
    }
  };

  const removeFromHistory = (productId: string) => {
    setProductHistory(prev => prev.filter(p => p.id !== productId));
  };

  const addActivity = () => {
    if (tempActivityName && tempActivityKcal > 0) {
      const newActivity: Activity = {
        id: Math.random().toString(36).substr(2, 9),
        name: tempActivityName,
        calories: tempActivityKcal
      };
      setActivities([...activities, newActivity]);
      setIsActivityModalOpen(false);
      setTempActivityName("");
      setTempActivityKcal(0);
    }
  };

  const updateProductDetail = (mealIndex: number, productId: string, field: keyof LoggedProduct, value: any) => {
    const updatedMeals = [...meals];
    const product = updatedMeals[mealIndex].products.find(p => p.id === productId);
    if (product) {
      (product as any)[field] = value;
      setMeals(updatedMeals);
    }
  };

  const removeProduct = (mealIndex: number, productId: string) => {
    const updatedMeals = [...meals];
    updatedMeals[mealIndex].products = updatedMeals[mealIndex].products.filter(p => p.id !== productId);
    setMeals(updatedMeals);
  };

  const [selectedMealForView, setSelectedMealForView] = useState<number | null>(null);
  const [mealHistorySearch, setMealHistorySearch] = useState("");
  const [mealHistoryTab, setMealHistoryTab] = useState<"recent" | "favorites">("recent");
  const searchScrollRef = useRef<HTMLDivElement>(null);
  const scannerScrollRef = useRef<HTMLDivElement>(null);
  const mealScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSearchModalOpen) return;
    const timer = setTimeout(() => {
      if (searchScrollRef.current) {
        searchScrollRef.current.scrollTop = 1;
        searchScrollRef.current.scrollTop = 0;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isSearchModalOpen]);

  useEffect(() => {
    if (!isScannerOpen) return;
    const timer = setTimeout(() => {
      if (scannerScrollRef.current) {
        scannerScrollRef.current.scrollTop = 1;
        scannerScrollRef.current.scrollTop = 0;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isScannerOpen]);

  useEffect(() => {
    if (selectedMealForView === null) return;
    const timer = setTimeout(() => {
      if (mealScrollRef.current) {
        mealScrollRef.current.scrollTop = 1;
        mealScrollRef.current.scrollTop = 0;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedMealForView]);

  // ─── Export / Import ──────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const KEYS = ["calo_profile_v2", "calo_meals_v2", "calo_activities_v2", "calo_history_v2", "calo_favorites_v2"];
    const backup: Record<string, any> = { exportedAt: new Date().toISOString(), version: 2 };
    KEYS.forEach((k) => {
      try { backup[k] = JSON.parse(localStorage.getItem(k) || "null"); } catch { backup[k] = null; }
    });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `calotrack-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target?.result as string);
        if (!backup.version) throw new Error("Fichier invalide");
        const KEYS = ["calo_profile_v2", "calo_meals_v2", "calo_activities_v2", "calo_history_v2", "calo_favorites_v2"];
        KEYS.forEach((k) => {
          if (backup[k] !== null && backup[k] !== undefined) {
            localStorage.setItem(k, JSON.stringify(backup[k]));
          }
        });
        window.location.reload();
      } catch {
        alert("Fichier de sauvegarde invalide ou corrompu.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  // ─── History item card (réutilisé dans 2 dialogs) ────────────────────────
  const HistoryItem = ({ product, onOpen, showMealButtons = false, mealIdx }: {
    product: LoggedProduct;
    onOpen: () => void;
    showMealButtons?: boolean;
    mealIdx?: number;
  }) => {
    const isFav = favorites.includes(product.name);
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 group">
        {/* Clickable main area */}
        <button className="flex items-center gap-2.5 flex-1 min-w-0 text-left" onClick={onOpen}>
          <div className="w-11 h-11 rounded-xl bg-white flex-shrink-0 overflow-hidden flex items-center justify-center border border-slate-100 shadow-sm">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <Apple className="w-5 h-5 text-slate-300" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-700 truncate group-hover:text-orange-600 transition-colors">{product.name}</p>
            <p className="text-[10px] text-slate-400 font-medium">
              {product.kcalPer100g} kcal/100g · {product.quantityGrams}g
            </p>
          </div>
        </button>
        {/* Meal quick-add buttons (visible in scanner dialog) */}
        {showMealButtons && (
          <div className="flex gap-1">
            {meals.map((meal, idx) => {
              const Icon = ICON_MAP[meal.icon] || Apple;
              return (
                <Button
                  key={idx}
                  size="icon"
                  variant="secondary"
                  className="w-7 h-7 rounded-lg bg-white hover:bg-orange-500 hover:text-white transition-colors"
                  onClick={() => {
                    const newP = { ...product, id: Math.random().toString(36).substr(2, 9) };
                    const updatedMeals = [...meals];
                    updatedMeals[idx].products.push(newP);
                    setMeals(updatedMeals);
                  }}
                >
                  <Icon className="w-3 h-3" />
                </Button>
              );
            })}
          </div>
        )}
        {/* Star */}
        <button
          onClick={() => toggleFavorite(product.name)}
          className="p-1.5 rounded-xl hover:bg-yellow-50 transition-colors flex-shrink-0"
        >
          <Star
            className={cn(
              "w-4 h-4 transition-colors",
              isFav ? "fill-yellow-400 text-yellow-400" : "text-yellow-300 hover:text-yellow-400 hover:fill-yellow-400"
            )}
          />
        </button>
        {/* Delete */}
        <button
          onClick={() => removeFromHistory(product.id)}
          className="p-1.5 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <AnimatePresence>
        {showUpdateAvailable && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] p-4 flex justify-center pointer-events-none"
          >
            <div className="bg-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 pointer-events-auto border border-indigo-400/30 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-bold">Mise à jour disponible</span>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  navigator.serviceWorker.getRegistration().then(reg => {
                    if (reg?.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    else window.location.reload();
                  });
                }}
                className="bg-white text-indigo-600 hover:bg-indigo-50 rounded-full h-8 px-4 font-bold text-xs flex items-center gap-2 border-none shadow-sm"
              >
                <RefreshCw className="w-3 h-3" />
                Recharger
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="px-6 pt-8 pb-6 flex flex-col items-center relative bg-white border-b border-slate-100">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center">
            {view === "dashboard" ? (
              <Button
                variant="secondary"
                size="icon"
                className="rounded-2xl w-10 h-10 bg-slate-50 border border-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                onClick={() => setIsHistoryOpen(true)}
              >
                <History className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setView("dashboard")}
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
            )}
          </div>

          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              {view === "dashboard" ? "Tableau de Bord" : "Profil & Objectifs"}
            </h1>
            {view === "dashboard" && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full text-slate-300 hover:text-orange-500 hover:bg-orange-50 transition-all"
                  onClick={() => setCurrentDate(subDays(currentDate, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <button
                  className="text-xs font-bold text-slate-400 hover:text-orange-600 transition-colors flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-100"
                  onClick={() => setIsDatePickerOpen(true)}
                >
                  <CalendarIcon className="w-3 h-3" />
                  {format(currentDate, "d MMMM yyyy", { locale: fr })}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full text-slate-300 hover:text-orange-500 hover:bg-orange-50 transition-all"
                  onClick={() => setCurrentDate(addDays(currentDate, 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center">
            <Button
              variant="secondary"
              size="icon"
              className={cn(
                "rounded-2xl w-10 h-10 transition-all border",
                view === "profile"
                  ? "bg-indigo-500 text-white border-indigo-600 shadow-lg shadow-indigo-200"
                  : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100"
              )}
              onClick={() => setView(view === "profile" ? "dashboard" : "profile")}
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {view === "dashboard" ? (
          <motion.main
            key="dashboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="px-6 space-y-6 max-w-md mx-auto mt-6"
          >
            {/* Daily Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-gradient-to-br from-white via-white to-indigo-50/50 border-none shadow-xl rounded-[2.5rem] overflow-hidden relative">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-orange-100/30 rounded-full blur-3xl pointer-events-none" />
                <CardContent className="p-7 space-y-6 relative z-10">

                  {/* ── Calories row ── */}
                  <div className="space-y-2">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Calories consommées</p>
                        <p className="text-4xl font-black text-slate-900 leading-tight">
                          {totals.kcal.toFixed(0)}
                          <span className="text-base font-bold text-slate-400 ml-1">kcal</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400">Objectif</p>
                        <p className="text-sm font-black text-slate-600">{profile.calorieGoal} kcal</p>
                        {remaining < 0
                          ? <p className="text-xs font-bold text-red-400">+{Math.abs(remaining).toFixed(0)} dépassé</p>
                          : <p className="text-xs font-bold text-emerald-500">{remaining.toFixed(0)} restantes</p>
                        }
                      </div>
                    </div>

                    {/* Barre de progression calories */}
                    <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className={cn(
                          "h-full rounded-full",
                          totals.kcal > profile.calorieGoal ? "bg-red-400" : "bg-emerald-400"
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((totals.kcal / profile.calorieGoal) * 100, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                      <Flame className="w-3 h-3 text-indigo-400" />
                      <span>Activités : +{totalBurned.toFixed(0)} kcal</span>
                      <span className="ml-auto font-bold text-slate-500">Net : {(totals.kcal - totalBurned).toFixed(0)} kcal</span>
                    </div>
                  </div>

                  {/* ── Macro circles ── */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Glucides", value: totals.carbs, goal: profile.carbsGoal, color: "#EC4899", track: "#FCE7F3" },
                      { label: "Protéines", value: totals.protein, goal: profile.proteinGoal, color: "#3B82F6", track: "#DBEAFE" },
                      { label: "Lipides", value: totals.fat, goal: profile.fatGoal, color: "#F97316", track: "#FFEDD5" },
                    ].map(({ label, value, goal, color, track }) => {
                      const pct = Math.min((value / goal) * 100, 100);
                      const over = value > goal;
                      const r = 28;
                      const circ = 2 * Math.PI * r;
                      return (
                        <div key={label} className="flex flex-col items-center gap-2">
                          <div className="relative w-20 h-20">
                            <svg viewBox="0 0 68 68" className="w-full h-full -rotate-90">
                              <circle cx="34" cy="34" r={r} fill="none" stroke={track} strokeWidth="7" />
                              <motion.circle
                                cx="34" cy="34" r={r}
                                fill="none"
                                stroke={over ? "#F87171" : color}
                                strokeWidth="7"
                                strokeLinecap="round"
                                strokeDasharray={circ}
                                initial={{ strokeDashoffset: circ }}
                                animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
                                transition={{ duration: 1, ease: "easeOut" }}
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-base font-black leading-none" style={{ color: over ? "#F87171" : color }}>
                                {Math.round(pct)}%
                              </span>
                              <span className="text-[8px] font-bold text-slate-400 leading-none mt-0.5">{label}</span>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-black text-slate-800">{value.toFixed(0)}g</p>
                            {over
                              ? <p className="text-[10px] font-bold text-red-400">+{(value - goal).toFixed(0)}g dépassé</p>
                              : <p className="text-[10px] font-bold text-slate-400">{(goal - value).toFixed(0)}g restants</p>
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </CardContent>
              </Card>
            </motion.div>

            {/* Meal Grid */}
            <div className="grid grid-cols-2 gap-4">
              {meals.map((meal, index) => {
                const mealKcal = meal.products.reduce((total, p) => total + (p.kcalPer100g * p.quantityGrams) / 100, 0);
                return (
                  <motion.div
                    key={meal.title}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 * (index + 1) }}
                  >
                    <Card
                      className={cn("border-none shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-[2rem] cursor-pointer overflow-hidden", meal.bg || "bg-white")}
                      onClick={() => setSelectedMealForView(index)}
                    >
                      <CardContent className="p-5 relative">
                        <div className="flex justify-between items-start">
                          <h3 className="text-xl font-bold text-slate-900">{meal.title}</h3>
                          {(() => {
                            const MealIcon = ICON_MAP[meal.icon] || Apple;
                            return <MealIcon className={cn("w-7 h-7", meal.color)} />;
                          })()}
                        </div>
                        <div className="mt-2">
                          <p className="text-2xl font-black text-slate-900 leading-tight">
                            {mealKcal.toFixed(1)} <span className="text-sm font-bold text-slate-500">kcal</span>
                          </p>
                          <p className="text-sm font-bold text-slate-400">{meal.products.length} Food(s)</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Scan Button — inline, au-dessus des activités */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.45 }}
            >
              <button
                onClick={() => {
                  setActiveMealIndex(null);
                  setIsScannerOpen(true);
                }}
                className="w-full h-16 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-orange-200 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
              >
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Scan className="w-5 h-5" />
                </div>
                Scanner un produit
              </button>
            </motion.div>

            {/* Activities Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <button
                onClick={() => setIsActivityModalOpen(true)}
                className="w-full h-16 bg-[#007AFF] hover:bg-blue-600 active:bg-blue-700 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-blue-200/60 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
              >
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Footprints className="w-5 h-5" />
                </div>
                Ajouter un exercice
              </button>
            </motion.div>

            {/* Weight Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <button
                onClick={() => { setTempWeightInput(profile.currentWeight); setIsWeightModalOpen(true); }}
                className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-emerald-200/60 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
              >
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Scale className="w-5 h-5" />
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span>Poids actuel</span>
                  <span className="text-sm font-bold opacity-80">{profile.currentWeight} kg — objectif {profile.goalWeight} kg</span>
                </div>
              </button>
            </motion.div>
          </motion.main>
        ) : (
          <motion.main
            key="profile"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-6 space-y-6 max-w-md mx-auto mt-6"
          >
            <Card className="border-none shadow-xl rounded-3xl p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-violet-500" />
                  Mon profil
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs text-slate-500">Sexe</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["male", "female"] as Sex[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setProfile({...profile, sex: s})}
                          className={`h-11 rounded-xl font-bold text-sm border-2 transition-all ${
                            profile.sex === s
                              ? "bg-violet-500 text-white border-violet-500"
                              : "bg-white text-slate-500 border-slate-200"
                          }`}
                        >
                          {s === "male" ? "👨 Homme" : "👩 Femme"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Âge</Label>
                    <Input type="number" value={profile.age}
                      onChange={(e) => setProfile({...profile, age: Number(e.target.value)})}
                      className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Taille (cm)</Label>
                    <Input type="number" value={profile.height}
                      onChange={(e) => setProfile({...profile, height: Number(e.target.value)})}
                      className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Poids actuel (kg)</Label>
                    <Input type="number" value={profile.currentWeight}
                      onChange={(e) => setProfile({...profile, currentWeight: Number(e.target.value)})}
                      className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Poids objectif (kg)</Label>
                    <Input type="number" value={profile.goalWeight}
                      onChange={(e) => setProfile({...profile, goalWeight: Number(e.target.value)})}
                      className="rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Niveau d'activité</Label>
                  <div className="space-y-2">
                    {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
                      <button key={level}
                        onClick={() => setProfile({...profile, activityLevel: level})}
                        className={`w-full h-10 rounded-xl font-semibold text-sm border-2 transition-all text-left px-4 ${
                          profile.activityLevel === level
                            ? "bg-indigo-500 text-white border-indigo-500"
                            : "bg-white text-slate-500 border-slate-200"
                        }`}
                      >
                        {ACTIVITY_LABELS[level]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Graphique évolution du poids ── */}
              {weightHistory.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-emerald-500" />
                    Évolution du poids
                  </h3>
                  <div className="bg-slate-50 rounded-2xl p-4">
                    {(() => {
                      const all = weightHistory;
                      const first = all[0]?.weight ?? profile.currentWeight;
                      const goal = profile.goalWeight;
                      const min = Math.min(...all.map(e => e.weight), goal) - 1;
                      const max = Math.max(...all.map(e => e.weight), first) + 1;
                      const range = max - min || 1;
                      const W = 320, H = 140, padX = 32, padY = 16;
                      const innerW = W - padX * 2;
                      const innerH = H - padY * 2;
                      const toX = (i: number) => padX + (i / Math.max(all.length - 1, 1)) * innerW;
                      const toY = (w: number) => padY + (1 - (w - min) / range) * innerH;
                      const points = all.map((e, i) => `${toX(i)},${toY(e.weight)}`).join(" ");
                      const goalY = toY(goal);
                      const losing = goal < first;
                      return (
                        <div className="space-y-2">
                          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
                            {/* Goal line */}
                            <line x1={padX} y1={goalY} x2={W - padX} y2={goalY}
                              stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
                            <text x={W - padX + 2} y={goalY + 4} fontSize="9" fill="#10B981" fontWeight="bold">
                              {goal}kg
                            </text>
                            {/* Area fill */}
                            {all.length > 1 && (
                              <polyline
                                points={`${toX(0)},${H - padY} ${points} ${toX(all.length - 1)},${H - padY}`}
                                fill="#10B981" fillOpacity="0.08" stroke="none"
                              />
                            )}
                            {/* Line */}
                            {all.length > 1 && (
                              <polyline points={points} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            )}
                            {/* Dots */}
                            {all.map((e, i) => (
                              <g key={i}>
                                <circle cx={toX(i)} cy={toY(e.weight)} r="4" fill="white" stroke="#10B981" strokeWidth="2" />
                                <text x={toX(i)} y={toY(e.weight) - 8} textAnchor="middle" fontSize="9" fill="#374151" fontWeight="bold">
                                  {e.weight}
                                </text>
                              </g>
                            ))}
                          </svg>
                          {/* Labels dates */}
                          <div className="flex justify-between px-8">
                            <span className="text-[9px] text-slate-400">{format(parseISO(all[0].date), "d MMM", { locale: fr })}</span>
                            {all.length > 2 && (
                              <span className="text-[9px] text-slate-400">{format(parseISO(all[Math.floor(all.length / 2)].date), "d MMM", { locale: fr })}</span>
                            )}
                            <span className="text-[9px] text-slate-400">{format(parseISO(all[all.length - 1].date), "d MMM", { locale: fr })}</span>
                          </div>
                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-2 pt-1">
                            <div className="text-center bg-white rounded-xl p-2">
                              <p className="text-[10px] text-slate-400">Départ</p>
                              <p className="text-sm font-black text-slate-700">{first} kg</p>
                            </div>
                            <div className="text-center bg-white rounded-xl p-2">
                              <p className="text-[10px] text-slate-400">Actuel</p>
                              <p className="text-sm font-black text-emerald-600">{profile.currentWeight} kg</p>
                            </div>
                            <div className="text-center bg-white rounded-xl p-2">
                              <p className="text-[10px] text-slate-400">Restant</p>
                              <p className={`text-sm font-black ${Math.abs(profile.currentWeight - goal) < 0.5 ? 'text-emerald-500' : 'text-slate-700'}`}>
                                {Math.abs(profile.currentWeight - goal).toFixed(1)} kg
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setWeightHistory([])}
                            className="text-[10px] text-slate-300 hover:text-red-400 w-full text-center transition-colors"
                          >
                            Effacer l'historique du poids
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {weightHistory.length === 0 && (
                <div className="pt-4 border-t">
                  <div className="bg-slate-50 rounded-2xl p-4 text-center space-y-1">
                    <Scale className="w-6 h-6 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-400">Aucune donnée de poids</p>
                    <p className="text-[10px] text-slate-300">Enregistrez votre poids depuis le tableau de bord pour voir l'évolution.</p>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Objectif Calories
                </h3>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Calories Journalières (kcal)</Label>
                  <Input type="number" value={profile.calorieGoal}
                    onChange={(e) => setProfile({...profile, calorieGoal: Number(e.target.value)})}
                    className="rounded-xl text-lg font-bold" />
                </div>
                {(() => {
                  const rec = computeRecommendations(profile);
                  return (
                    <div className="bg-orange-50 rounded-2xl p-3 space-y-1">
                      <p className="text-xs font-bold text-orange-600">💡 Dépense estimée (TDEE) : {rec.tdee} kcal/jour</p>
                      <p className="text-[10px] text-orange-400">Métabolisme de base : {rec.bmr} kcal · {ACTIVITY_LABELS[profile.activityLevel]}</p>
                      <button onClick={() => setProfile({...profile, calorieGoal: rec.tdee})}
                        className="text-[10px] font-bold text-orange-500 underline">
                        Utiliser cette valeur
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Dna className="w-5 h-5 text-blue-500" />
                    Objectifs Macros (g)
                  </h3>
                  <button
                    onClick={() => {
                      const rec = computeRecommendations(profile);
                      setProfile({...profile, proteinGoal: rec.protein, carbsGoal: rec.carbs, fatGoal: rec.fat});
                    }}
                    className="text-xs font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3" /> Calculer
                  </button>
                </div>
                {(() => {
                  const rec = computeRecommendations(profile);
                  return (
                    <div className="bg-blue-50 rounded-2xl p-3 space-y-1 text-[10px] text-blue-500">
                      <p className="font-bold text-blue-600">Préconisation ({rec.source}) :</p>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <div className="text-center">
                          <p className="font-black text-blue-700 text-sm">{rec.protein}g</p>
                          <p>Protéines</p>
                          <p className="text-[9px] text-blue-400">{PROTEIN_FACTORS[profile.activityLevel]}g/kg</p>
                        </div>
                        <div className="text-center">
                          <p className="font-black text-blue-700 text-sm">{rec.carbs}g</p>
                          <p>Glucides</p>
                          <p className="text-[9px] text-blue-400">~45-50% kcal</p>
                        </div>
                        <div className="text-center">
                          <p className="font-black text-blue-700 text-sm">{rec.fat}g</p>
                          <p>Lipides</p>
                          <p className="text-[9px] text-blue-400">~35% kcal</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-500 flex items-center gap-1"><Dna className="w-3 h-3" /> Prot</Label>
                    <Input type="number" value={profile.proteinGoal}
                      onChange={(e) => setProfile({...profile, proteinGoal: Number(e.target.value)})}
                      className="rounded-xl px-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-500 flex items-center gap-1"><Wheat className="w-3 h-3" /> Gluc</Label>
                    <Input type="number" value={profile.carbsGoal}
                      onChange={(e) => setProfile({...profile, carbsGoal: Number(e.target.value)})}
                      className="rounded-xl px-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-500 flex items-center gap-1"><Droplets className="w-3 h-3" /> Lipi</Label>
                    <Input type="number" value={profile.fatGoal}
                      onChange={(e) => setProfile({...profile, fatGoal: Number(e.target.value)})}
                      className="rounded-xl px-2" />
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl h-14 mt-4"
                onClick={() => setView("dashboard")}
              >
                <Save className="w-5 h-5 mr-2" />
                Enregistrer & Retour
              </Button>
            </Card>

            <Card className="border-none shadow-xl rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-500" />
                Sauvegarde & Restauration
              </h3>
              <p className="text-xs text-slate-400">
                Exporte toutes tes données (repas, activités, historique, favoris, profil) dans un fichier JSON local.
              </p>
              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl h-12"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter mes données
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  className="w-full border-2 border-slate-200 text-slate-600 font-bold rounded-2xl h-12 hover:border-indigo-400 hover:text-indigo-600"
                  onClick={() => document.getElementById("import-file")?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Restaurer depuis un fichier
                </Button>
                <input
                  id="import-file"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                />
              </div>
              <p className="text-[10px] text-slate-300 text-center">
                ⚠️ La restauration remplace toutes les données existantes
              </p>
            </Card>
          </motion.main>
        )}
      </AnimatePresence>



      {/* ─── History Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={isHistoryOpen} onOpenChange={(open) => { setIsHistoryOpen(open); if (!open) { setHistorySearch(""); } }}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl p-0 overflow-hidden max-h-[92vh] flex flex-col h-[92vh]">
          <div className="p-5 pb-0 border-b bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-indigo-500" />
                Historique & Favoris
              </DialogTitle>
            </DialogHeader>
            {/* Search bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Rechercher un aliment..."
                className="pl-9 rounded-xl h-10 bg-slate-50 border-slate-200"
              />
            </div>
            {/* Tabs */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setHistoryTab("recent")}
                className={cn(
                  "h-9 rounded-xl text-sm font-bold transition-all",
                  historyTab === "recent"
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                Récents ({productHistory.length})
              </button>
              <button
                onClick={() => setHistoryTab("favorites")}
                className={cn(
                  "h-9 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5",
                  historyTab === "favorites"
                    ? "bg-yellow-400 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                <Star className={cn("w-3.5 h-3.5", historyTab === "favorites" ? "fill-white" : "")} />
                Favoris ({productHistory.filter(p => favorites.includes(p.name)).length})
              </button>
            </div>
          </div>

          <div
            ref={historyScrollRef}
            className="overflow-y-scroll p-5 flex-1 min-h-0"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {filteredHistory.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {historyTab === "favorites" ? "Vos favoris" : "Aliments récents"}
                    {historySearch && ` · "${historySearch}"`}
                  </p>
                  {historyTab === "recent" && (
                    <button
                      className="text-[10px] text-slate-400 hover:text-red-500 font-bold transition-colors"
                      onClick={() => setProductHistory([])}
                    >
                      Tout effacer
                    </button>
                  )}
                </div>
                {filteredHistory.map((product) => (
                  <HistoryItem
                    key={product.id}
                    product={product}
                    onOpen={() => {
                      openProductFromHistory(product);
                      setIsHistoryOpen(false);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                  {historyTab === "favorites"
                    ? <Star className="w-8 h-8 text-slate-200" />
                    : <History className="w-8 h-8 text-slate-200" />
                  }
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-400">
                    {historyTab === "favorites" ? "Aucun favori" : historySearch ? "Aucun résultat" : "Aucun historique"}
                  </p>
                  <p className="text-xs text-slate-300">
                    {historyTab === "favorites"
                      ? "Appuyez sur ⭐ pour mettre un produit en favori."
                      : historySearch
                        ? "Essayez un autre mot-clé."
                        : "Vos aliments scannés apparaîtront ici."
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Date Picker ────────────────────────────────────────────────────── */}
      <Dialog open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Choisir une date</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              type="date"
              value={format(currentDate, "yyyy-MM-dd")}
              onChange={(e) => {
                const newDate = parseISO(e.target.value);
                if (!isNaN(newDate.getTime())) {
                  setCurrentDate(newDate);
                  setIsDatePickerOpen(false);
                }
              }}
              className="rounded-xl text-lg h-12"
            />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="rounded-xl"
                onClick={() => { setCurrentDate(new Date()); setIsDatePickerOpen(false); }}>
                Aujourd'hui
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setIsDatePickerOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Search Results Dialog ──────────────────────────────────────────── */}
      <Dialog open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl p-0 overflow-hidden max-h-[92vh] flex flex-col h-[92vh]">
          <div className="p-6 pb-4 border-b bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Résultats de recherche
              </DialogTitle>
            </DialogHeader>
          </div>
          <div
            ref={searchScrollRef}
            className="overflow-y-scroll p-6 pt-4 flex-1 min-h-0"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="grid grid-cols-1 gap-3">
              {searchResults.map((product) => (
                <button
                  key={product.id || Math.random()}
                  onClick={() => {
                    setScannedProduct(product);
                    setIsSearchModalOpen(false);
                    setIsProductModalOpen(true);
                    setTempQuantity(product.servingQuantity || 100);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors text-left group"
                >
                  <div className="w-14 h-14 rounded-xl bg-white flex-shrink-0 overflow-hidden flex items-center justify-center border border-slate-100">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <Apple className="w-7 h-7 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-700 truncate group-hover:text-orange-600 transition-colors">
                        {product.name}
                      </p>
                      <span className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase flex-shrink-0",
                        product.source === 'USDA' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {product.source}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {product.kcalPer100g?.toFixed(0) || 0} kcal/100g
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500" />
                </button>
              ))}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center mb-3">Vous ne trouvez pas votre produit ?</p>
                <Button
                  variant="outline"
                  className="w-full rounded-2xl border-dashed border-2"
                  onClick={() => {
                    setScannedProduct({
                      id: Math.random().toString(), name: tempName,
                      kcalPer100g: 0, proteinsPer100g: 0, carbsPer100g: 0, fatPer100g: 0,
                      imageUrl: "", source: 'OFF', servingQuantity: 100
                    });
                    setIsSearchModalOpen(false);
                    setIsProductModalOpen(true);
                  }}
                >
                  Créer manuellement "{tempName}"
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Scanner Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={isScannerOpen} onOpenChange={(open) => { if (!open) scannerRef.current?.stopCamera(); setIsScannerOpen(open); if (open) setTempName(""); }}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl p-0 overflow-hidden max-h-[92vh] flex flex-col h-[92vh]">
          <div className="p-6 pb-4 border-b bg-white">
            <DialogHeader>
              <DialogTitle>
                {activeMealIndex !== null
                  ? `Ajouter au ${meals[activeMealIndex]?.title}`
                  : "Scanner un produit"
                }
              </DialogTitle>
            </DialogHeader>
          </div>
          <div
            ref={scannerScrollRef}
            className="overflow-y-scroll p-6 pt-4 flex-1 min-h-0 space-y-6"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scanner ou Saisir</h4>
              <Scanner
                ref={scannerRef}
                isOpen={isScannerOpen}
                onScanSuccess={handleScanSuccess}
              />
            </div>

            {productHistory.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historique récent</h4>
                <div className="grid grid-cols-1 gap-2">
                  {productHistory.slice(0, 10).map((product) => (
                    <HistoryItem
                      key={product.id}
                      product={product}
                      showMealButtons={activeMealIndex !== null}
                      onOpen={() => {
                        openProductFromHistory(product, activeMealIndex ?? undefined);
                        setIsScannerOpen(false);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center gap-2 text-slate-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Recherche du produit...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Product Details Modal ───────────────────────────────────────────── */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>Détails du produit</span>
              {scannedProduct && (
                <button
                  onClick={() => toggleFavorite(tempName || scannedProduct.name)}
                  className="p-1.5 rounded-xl hover:bg-yellow-50 transition-colors"
                >
                  <Star
                    className={cn(
                      "w-5 h-5 transition-colors",
                      favorites.includes(tempName || scannedProduct.name)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-yellow-300 hover:text-yellow-400 hover:fill-yellow-400"
                    )}
                  />
                </button>
              )}
            </DialogTitle>
          </DialogHeader>
          {scannedProduct && (
            <div className="space-y-5 py-2">
              <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                {scannedProduct.imageUrl && (
                  <img
                    src={scannedProduct.imageUrl}
                    alt={scannedProduct.name}
                    className="w-16 h-16 object-contain rounded-xl bg-white p-1 shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <Input
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="font-bold text-base text-slate-800 border-none p-0 h-auto focus-visible:ring-0 mb-1"
                    placeholder="Nom de l'aliment"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={tempKcal === 0 ? '' : tempKcal}
                      onChange={(e) => { const v = e.target.value.replace(',', '.'); setTempKcal(v === '' ? '' : v); }}
                      onBlur={(e) => { if (e.target.value === '') setTempKcal(0); }}
                      className="h-8 w-20 text-sm font-bold border-orange-200 focus:border-orange-500"
                    />
                    <span className="text-xs text-slate-500 font-medium">kcal / 100g</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valeurs pour 100g</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-blue-600 flex items-center gap-1"><Dna className="w-3 h-3" /> Protéines</Label>
                    <Input type="text" inputMode="decimal" value={tempProtein === 0 ? '' : tempProtein} onChange={(e) => { const v = e.target.value.replace(',', '.'); setTempProtein(v === '' ? '' : v); }} onBlur={(e) => { if (e.target.value === '') setTempProtein(0); }} className="h-10 rounded-xl border-blue-100 focus:border-blue-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-yellow-700 flex items-center gap-1"><Wheat className="w-3 h-3" /> Glucides</Label>
                    <Input type="text" inputMode="decimal" value={tempCarbs === 0 ? '' : tempCarbs} onChange={(e) => { const v = e.target.value.replace(',', '.'); setTempCarbs(v === '' ? '' : v); }} onBlur={(e) => { if (e.target.value === '') setTempCarbs(0); }} className="h-10 rounded-xl border-yellow-100 focus:border-yellow-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-red-600 flex items-center gap-1"><Droplets className="w-3 h-3" /> Lipides</Label>
                    <Input type="text" inputMode="decimal" value={tempFat === 0 ? '' : tempFat} onChange={(e) => { const v = e.target.value.replace(',', '.'); setTempFat(v === '' ? '' : v); }} onBlur={(e) => { if (e.target.value === '') setTempFat(0); }} className="h-10 rounded-xl border-red-100 focus:border-red-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <Label htmlFor="quantity" className="text-sm font-bold text-slate-700">Quantité consommée (en grammes)</Label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Input
                      id="quantity"
                      type="text"
                      inputMode="decimal"
                      value={tempQuantity === '' ? '' : tempQuantity}
                      onChange={(e) => { const v = e.target.value.replace(',', '.'); setTempQuantity(v === '' ? '' : v); }}
                      onBlur={(e) => { if (e.target.value === '') setTempQuantity(100); }}
                      className="rounded-2xl h-12 text-lg font-bold pr-8 border-slate-200 focus:border-orange-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">g</span>
                  </div>
                  <div className="bg-orange-50 px-4 py-2 rounded-2xl border border-orange-100">
                    <p className="text-[10px] text-orange-600 font-bold uppercase">Total</p>
                    <p className="text-xl font-black text-orange-600 leading-none">
                      {((Number(tempKcal)||0) * (Number(tempQuantity)||0) / 100).toFixed(0)} <span className="text-xs">kcal</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Meal selector */}
              <div className="space-y-2 pt-2">
                <Label className="text-sm font-bold text-slate-700">Ajouter à un repas</Label>
                <div className="grid grid-cols-4 gap-2">
                  {meals.map((meal, idx) => {
                    const MealIcon = ICON_MAP[meal.icon] || Apple;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveMealIndex(idx)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border-2 transition-all",
                          activeMealIndex === idx
                            ? "border-orange-400 bg-orange-50 shadow-sm"
                            : "border-slate-100 bg-slate-50 hover:border-slate-200"
                        )}
                      >
                        <MealIcon className={cn("w-5 h-5", meal.color)} />
                        <span className="text-[9px] font-bold text-slate-600 text-center leading-tight">{meal.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-1">
                <Button
                  className={cn(
                    "w-full text-white rounded-2xl h-14 font-bold text-lg shadow-lg transition-all active:scale-[0.98]",
                    activeMealIndex !== null
                      ? "bg-orange-500 hover:bg-orange-600 shadow-orange-100"
                      : "bg-slate-300 cursor-not-allowed"
                  )}
                  onClick={addProductToMeal}
                  disabled={activeMealIndex === null}
                >
                  {activeMealIndex !== null
                    ? `Ajouter au ${meals[activeMealIndex]?.title}`
                    : "Choisissez un repas ci-dessus"
                  }
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-slate-200 text-slate-600 rounded-2xl h-12 font-bold transition-all active:scale-[0.98]"
                  onClick={addToHistoryOnly}
                >
                  Ajouter à l'historique uniquement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Meal Details View ───────────────────────────────────────────────── */}
      <Dialog open={selectedMealForView !== null} onOpenChange={(open) => {
        if (!open) {
          setSelectedMealForView(null);
          setMealHistorySearch("");
          setMealHistoryTab("recent");
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-3xl h-[80vh] flex flex-col p-0 overflow-hidden">
          {selectedMealForView !== null && (
            <>
              <div className="p-6 bg-slate-50 border-b">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {meals[selectedMealForView]?.title || "Repas"}
                    {(() => {
                      const iconName = meals[selectedMealForView]?.icon;
                      const MealIcon = ICON_MAP[iconName] || Apple;
                      return <MealIcon className={cn("w-5 h-5", meals[selectedMealForView]?.color)} />;
                    })()}
                  </DialogTitle>
                  <DialogDescription>Liste des aliments consommés</DialogDescription>
                </DialogHeader>
              </div>

              <div
                ref={mealScrollRef}
                className="flex-1 overflow-y-scroll min-h-0 p-6 space-y-8"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aliments consommés</h4>
                  {meals[selectedMealForView].products.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-2xl border border-dashed">
                      Aucun aliment ajouté.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {meals[selectedMealForView].products.map((product) => (
                        <div key={product.id} className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border">
                          {product.imageUrl && (
                            <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-contain rounded-lg bg-slate-50" referrerPolicy="no-referrer" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-sm truncate">{product.name}</h4>
                              <span className="text-xs font-bold text-orange-600 ml-2">
                                {((product.kcalPer100g * product.quantityGrams) / 100).toFixed(0)} kcal
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                type="number"
                                value={product.quantityGrams}
                                onChange={(e) => updateProductDetail(selectedMealForView, product.id, "quantityGrams", Number(e.target.value))}
                                className="h-7 w-16 text-xs px-1 rounded-md"
                              />
                              <span className="text-[10px] text-slate-400 font-medium">g</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 mt-2">
                              <div className="space-y-1">
                                <div className="text-[8px] text-blue-600 font-bold">Prot (100g)</div>
                                <Input type="number" value={product.proteinPer100g}
                                  onChange={(e) => updateProductDetail(selectedMealForView, product.id, "proteinPer100g", Number(e.target.value))}
                                  className="h-6 text-[10px] px-1 rounded-md" />
                              </div>
                              <div className="space-y-1">
                                <div className="text-[8px] text-yellow-700 font-bold">Gluc (100g)</div>
                                <Input type="number" value={product.carbsPer100g}
                                  onChange={(e) => updateProductDetail(selectedMealForView, product.id, "carbsPer100g", Number(e.target.value))}
                                  className="h-6 text-[10px] px-1 rounded-md" />
                              </div>
                              <div className="space-y-1">
                                <div className="text-[8px] text-red-600 font-bold">Lip (100g)</div>
                                <Input type="number" value={product.fatPer100g}
                                  onChange={(e) => updateProductDetail(selectedMealForView, product.id, "fatPer100g", Number(e.target.value))}
                                  className="h-6 text-[10px] px-1 rounded-md" />
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-300 hover:text-red-500 h-8 w-8"
                            onClick={() => removeProduct(selectedMealForView, product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* History section avec recherche + onglets */}
                <div className="space-y-3 pt-4 border-t">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={mealHistorySearch}
                      onChange={(e) => setMealHistorySearch(e.target.value)}
                      placeholder="Rechercher un aliment..."
                      className="pl-9 rounded-xl h-10 bg-slate-50 border-slate-200"
                    />
                  </div>

                  {/* Tabs */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMealHistoryTab("recent")}
                      className={cn(
                        "h-9 rounded-xl text-sm font-bold transition-all",
                        mealHistoryTab === "recent"
                          ? "bg-indigo-500 text-white shadow-sm"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      )}
                    >
                      Récents ({productHistory.length})
                    </button>
                    <button
                      onClick={() => setMealHistoryTab("favorites")}
                      className={cn(
                        "h-9 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5",
                        mealHistoryTab === "favorites"
                          ? "bg-yellow-400 text-white shadow-sm"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      )}
                    >
                      <Star className={cn("w-3.5 h-3.5", mealHistoryTab === "favorites" ? "fill-white" : "")} />
                      Favoris ({productHistory.filter(p => favorites.includes(p.name)).length})
                    </button>
                  </div>

                  {/* Liste filtrée */}
                  {(() => {
                    let items = mealHistoryTab === "favorites"
                      ? productHistory.filter(p => favorites.includes(p.name))
                      : productHistory;
                    if (mealHistorySearch.trim()) {
                      const q = mealHistorySearch.toLowerCase();
                      items = items.filter(p => p.name.toLowerCase().includes(q));
                    }
                    if (items.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                            {mealHistoryTab === "favorites"
                              ? <Star className="w-6 h-6 text-slate-200" />
                              : <History className="w-6 h-6 text-slate-200" />
                            }
                          </div>
                          <p className="text-sm font-bold text-slate-400">
                            {mealHistoryTab === "favorites" ? "Aucun favori" : mealHistorySearch ? "Aucun résultat" : "Historique vide"}
                          </p>
                          <p className="text-xs text-slate-300">
                            {mealHistoryTab === "favorites"
                              ? "Appuyez sur ⭐ pour mettre un produit en favori."
                              : mealHistorySearch ? "Essayez un autre mot-clé." : "Scannez des produits pour les retrouver ici."
                            }
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {items.map((product) => (
                          <HistoryItem
                            key={product.id}
                            product={product}
                            onOpen={() => {
                              openProductFromHistory(product, selectedMealForView!);
                              setSelectedMealForView(null);
                            }}
                          />
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="p-6 border-t bg-slate-50">
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl h-12 font-bold"
                  onClick={() => {
                    setActiveMealIndex(selectedMealForView);
                    setIsScannerOpen(true);
                    setSelectedMealForView(null);
                  }}
                >
                  <Scan className="w-4 h-4 mr-2" />
                  Scanner un autre produit
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Weight Modal ──────────────────────────────────────────────────── */}
      <Dialog open={isWeightModalOpen} onOpenChange={setIsWeightModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-500" />
              Enregistrer mon poids
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-500">Poids actuel (kg)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder={String(profile.currentWeight)}
                value={tempWeightInput === 0 ? '' : tempWeightInput}
                onChange={(e) => { const v = e.target.value.replace(',', '.'); setTempWeightInput(v === '' ? '' : v); }}
                className="rounded-xl text-2xl font-black h-14 text-center"
                autoFocus
              />
              <p className="text-xs text-slate-400 text-center">Objectif : {profile.goalWeight} kg · Écart : {Math.abs(Number(tempWeightInput || profile.currentWeight) - profile.goalWeight).toFixed(1)} kg</p>
            </div>
            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl h-14 font-bold text-lg shadow-lg shadow-emerald-200"
              onClick={() => {
                const w = parseFloat(String(tempWeightInput));
                if (!isNaN(w) && w > 0) {
                  logWeight(w);
                  setIsWeightModalOpen(false);
                }
              }}
              disabled={!tempWeightInput || isNaN(parseFloat(String(tempWeightInput)))}
            >
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Activity Modal ──────────────────────────────────────────────────── */}
      <Dialog open={isActivityModalOpen} onOpenChange={setIsActivityModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-blue-500" />
              Ajouter un exercice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-500">Calories brûlées (kcal)</Label>
              <Input
                type="number"
                placeholder="0"
                value={tempActivityKcal || ""}
                onChange={(e) => {
                  setTempActivityKcal(Number(e.target.value));
                  if (!tempActivityName) setTempActivityName("Exercice");
                }}
                className="rounded-xl text-lg font-bold"
                autoFocus
              />
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-14 font-bold text-lg shadow-lg shadow-blue-200"
              onClick={addActivity}
              disabled={tempActivityKcal <= 0}
            >
              Enregistrer l'activité
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
