/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback } from "react";
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
  UserCheck
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
import { Scanner } from "@/components/Scanner";
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
  { title: "Petit-déj", icon: "Croissant", color: "text-orange-500", products: [] },
  { title: "Déjeuner", icon: "Sun", color: "text-yellow-500", products: [] },
  { title: "Dîner", icon: "Moon", color: "text-indigo-500", products: [] },
  { title: "En-cas", icon: "Apple", color: "text-red-500", products: [] },
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
      
      // Migration: Update breakfast icon from Sun to Croissant
      Object.keys(parsed).forEach(date => {
        parsed[date] = parsed[date].map((meal: any) => {
          if (meal.title === "Petit-déj" && meal.icon === "Sun") {
            return { ...meal, icon: "Croissant", color: "text-orange-500" };
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

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
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
  const [tempQuantity, setTempQuantity] = useState(100);
  const [tempKcal, setTempKcal] = useState(0);
  const [tempProtein, setTempProtein] = useState(0);
  const [tempCarbs, setTempCarbs] = useState(0);
  const [tempFat, setTempFat] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<UnifiedProduct[]>([]);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showUpdateAvailable, setShowUpdateAvailable] = useState(false);

  useEffect(() => {
  // Écoute l'événement déclenché par le Service Worker (main.tsx)
  const handler = () => setShowUpdateAvailable(true);
  window.addEventListener('pwa-update-available', handler);
  return () => window.removeEventListener('pwa-update-available', handler);
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

  const handleScanSuccess = useCallback(async (input: string) => {
    if (isLoading || isProductModalOpen) return;
    
    setIsLoading(true);
    try {
      const result = await fetchNutritionData(input);
      
      if (result.products && result.products.length > 0) {
        if (result.products.length === 1) {
          // Un seul résultat (souvent le cas pour un code-barres)
          setScannedProduct(result.products[0]);
          setIsScannerOpen(false);
          setIsProductModalOpen(true);
          setTempQuantity(result.products[0].servingQuantity || 100);
        } else {
          // Plusieurs résultats (recherche par texte)
          setSearchResults(result.products);
          setIsScannerOpen(false);
          setIsSearchModalOpen(true);
        }
      } else {
        // Fallback manuel si rien n'est trouvé (sans erreur bloquante)
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
      // Fallback en cas d'erreur réseau/API
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

  const addProductToMeal = () => {
    if (scannedProduct && activeMealIndex !== null) {
      const newProduct: LoggedProduct = {
        id: Math.random().toString(36).substr(2, 9),
        name: tempName || scannedProduct.name || "Produit inconnu",
        kcalPer100g: tempKcal,
        proteinPer100g: tempProtein,
        carbsPer100g: tempCarbs,
        fatPer100g: tempFat,
        quantityGrams: tempQuantity,
        imageUrl: scannedProduct.imageUrl,
      };

      const updatedMeals = [...meals];
      updatedMeals[activeMealIndex].products.push(newProduct);
      setMeals(updatedMeals);

      // Add to history
      setProductHistory(prev => {
        const filtered = prev.filter(p => p.name !== newProduct.name);
        return [newProduct, ...filtered].slice(0, 50); // Keep last 50
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
        kcalPer100g: tempKcal,
        proteinPer100g: tempProtein,
        carbsPer100g: tempCarbs,
        fatPer100g: tempFat,
        quantityGrams: tempQuantity,
        imageUrl: scannedProduct.imageUrl,
      };

      // Add to history
      setProductHistory(prev => {
        const filtered = prev.filter(p => p.name !== newProduct.name);
        return [newProduct, ...filtered].slice(0, 50); // Keep last 50
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

  // ─── Sauvegarde / Restauration ───────────────────────────────────────────

  const handleExport = useCallback(() => {
    const KEYS = ["calo_profile_v2", "calo_meals_v2", "calo_activities_v2", "calo_history_v2"];
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
        const KEYS = ["calo_profile_v2", "calo_meals_v2", "calo_activities_v2", "calo_history_v2"];
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
  if ((window as any).__newWorker) {
    (window as any).__newWorker.postMessage({ type: 'SKIP_WAITING' });
  }
  window.location.reload();
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
                {/* Decorative background element */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-orange-100/30 rounded-full blur-3xl pointer-events-none" />
                
                <CardContent className="p-7 space-y-8 relative z-10">
                  <div className="flex items-center gap-8">
                    {/* Circular Progress Chart */}
                    <div className="relative w-32 h-32 flex-shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        {/* Background Rings */}
                        <circle cx="50" cy="50" r="45" stroke="#E2E8F0" strokeWidth="6" fill="transparent" strokeOpacity="0.5" />
                        <circle cx="50" cy="50" r="37" stroke="#E2E8F0" strokeWidth="6" fill="transparent" strokeOpacity="0.5" />
                        <circle cx="50" cy="50" r="29" stroke="#E2E8F0" strokeWidth="6" fill="transparent" strokeOpacity="0.5" />
                        <circle cx="50" cy="50" r="18" stroke="#E2E8F0" strokeWidth="10" fill="transparent" strokeOpacity="0.5" />

                        {/* Protéine (Purple) - Outermost */}
                        <motion.circle
                          cx="50" cy="50" r="45"
                          stroke="#C084FC" strokeWidth="6" fill="transparent"
                          strokeDasharray={2 * Math.PI * 45}
                          initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                          animate={{ strokeDashoffset: (2 * Math.PI * 45) * (1 - Math.min(totals.protein / profile.proteinGoal, 1)) }}
                          strokeLinecap="round" transform="rotate(-90 50 50)"
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                        
                        {/* Graisses (Orange) */}
                        <motion.circle
                          cx="50" cy="50" r="37"
                          stroke="#FDBA74" strokeWidth="6" fill="transparent"
                          strokeDasharray={2 * Math.PI * 37}
                          initial={{ strokeDashoffset: 2 * Math.PI * 37 }}
                          animate={{ strokeDashoffset: (2 * Math.PI * 37) * (1 - Math.min(totals.fat / profile.fatGoal, 1)) }}
                          strokeLinecap="round" transform="rotate(-90 50 50)"
                          transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                        />

                        {/* Glucides (Blue) */}
                        <motion.circle
                          cx="50" cy="50" r="29"
                          stroke="#38BDF8" strokeWidth="6" fill="transparent"
                          strokeDasharray={2 * Math.PI * 29}
                          initial={{ strokeDashoffset: 2 * Math.PI * 29 }}
                          animate={{ strokeDashoffset: (2 * Math.PI * 29) * (1 - Math.min(totals.carbs / profile.carbsGoal, 1)) }}
                          strokeLinecap="round" transform="rotate(-90 50 50)"
                          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                        />

                        {/* Calories (Green) - Innermost & Thickest */}
                        <motion.circle
                          cx="50" cy="50" r="18"
                          stroke="#4ADE80" strokeWidth="10" fill="transparent"
                          strokeDasharray={2 * Math.PI * 18}
                          initial={{ strokeDashoffset: 2 * Math.PI * 18 }}
                          animate={{ strokeDashoffset: (2 * Math.PI * 18) * (1 - Math.min(totals.kcal / profile.calorieGoal, 1)) }}
                          strokeLinecap="round" transform="rotate(-90 50 50)"
                          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                        />
                      </svg>
                    </div>

                    {/* Calorie Text */}
                    <div className="flex flex-col">
                      <span className="text-[#4ADE80] font-bold text-lg">Calories</span>
                      <span className="text-3xl font-black text-slate-900">{totals.kcal.toFixed(0)} kcal</span>
                      <span className="text-slate-400 text-sm font-medium">{remaining > 0 ? `${remaining.toFixed(0)} kcal restantes` : "Objectif atteint !"}</span>
                    </div>
                  </div>

                  {/* Macros Grid */}
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="flex flex-col">
                      <span className="text-[#C084FC] font-bold text-sm">Protéine</span>
                      <span className="text-xl font-black text-slate-800">{totals.protein.toFixed(0)} g</span>
                      <span className="text-slate-300 text-xs font-medium">
                        {Math.max(0, profile.proteinGoal - totals.protein).toFixed(0)} g restantes
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#FDBA74] font-bold text-sm">Graisses</span>
                      <span className="text-xl font-black text-slate-800">{totals.fat.toFixed(0)} g</span>
                      <span className="text-slate-300 text-xs font-medium">
                        {Math.max(0, profile.fatGoal - totals.fat).toFixed(0)} g restantes
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#38BDF8] font-bold text-sm">Glucides</span>
                      <span className="text-xl font-black text-slate-800">{totals.carbs.toFixed(0)} g</span>
                      <span className="text-slate-300 text-xs font-medium">
                        {Math.max(0, profile.carbsGoal - totals.carbs).toFixed(0)} g restantes
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100/50">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-500 p-2 rounded-xl shadow-lg shadow-indigo-200">
                        <Flame className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Calories Brûlées</span>
                        <span className="text-xl font-black text-indigo-600">+{totalBurned.toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="h-10 w-[1px] bg-indigo-100" />
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net</span>
                      <span className="text-xl font-black text-slate-900">{(totals.kcal - totalBurned).toFixed(0)}</span>
                    </div>
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
                      className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-[2rem] cursor-pointer overflow-hidden"
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

            {/* Activities Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Card className="bg-[#007AFF] border-none shadow-xl rounded-[2rem] overflow-hidden">
                <CardContent className="p-6 text-white">
                  <div className="text-center mb-4">
                    <p className="text-xs font-bold bg-white/10 py-1 px-3 rounded-full inline-block">
                      Une Barre Mars et hop 250 Kcal 😉
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-white/20 p-2 rounded-xl">
                      <Footprints className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold">Activités</h3>
                  </div>
                  <p className="text-lg font-bold opacity-90 mb-6">
                    Calories Actives: <span className="text-2xl">{totalBurned.toFixed(0)}</span> kcal
                  </p>
                  <Button 
                    className="w-full bg-white text-[#007AFF] hover:bg-slate-100 rounded-2xl h-14 font-black text-xl shadow-md"
                    onClick={() => setIsActivityModalOpen(true)}
                  >
                    Ajouter un exercice
                  </Button>
                </CardContent>
              </Card>
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

              {/* ── Identité ── */}
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

              {/* ── Calories ── */}
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
                      <p className="text-xs font-bold text-orange-600">
                        💡 Dépense estimée (TDEE) : {rec.tdee} kcal/jour
                      </p>
                      <p className="text-[10px] text-orange-400">
                        Métabolisme de base : {rec.bmr} kcal · {ACTIVITY_LABELS[profile.activityLevel]}
                      </p>
                      <button onClick={() => setProfile({...profile, calorieGoal: rec.tdee})}
                        className="text-[10px] font-bold text-orange-500 underline">
                        Utiliser cette valeur
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* ── Macros ── */}
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
                    <Label className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Dna className="w-3 h-3" /> Prot
                    </Label>
                    <Input type="number" value={profile.proteinGoal}
                      onChange={(e) => setProfile({...profile, proteinGoal: Number(e.target.value)})}
                      className="rounded-xl px-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Wheat className="w-3 h-3" /> Gluc
                    </Label>
                    <Input type="number" value={profile.carbsGoal}
                      onChange={(e) => setProfile({...profile, carbsGoal: Number(e.target.value)})}
                      className="rounded-xl px-2" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Droplets className="w-3 h-3" /> Lipi
                    </Label>
                    <Input type="number" value={profile.fatGoal}
                      onChange={(e) => setProfile({...profile, fatGoal: Number(e.target.value)})}
                      className="rounded-xl px-2" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-300 text-center">
                  Les valeurs calculées sont modifiables manuellement
                </p>
              </div>

              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl h-14 mt-4"
                onClick={() => setView("dashboard")}
              >
                <Save className="w-5 h-5 mr-2" />
                Enregistrer & Retour
              </Button>
            </Card>

            {/* Sauvegarde & Restauration */}
            <Card className="border-none shadow-xl rounded-3xl p-6 space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-500" />
                Sauvegarde & Restauration
              </h3>
              <p className="text-xs text-slate-400">
                Exporte toutes tes données (repas, activités, historique, profil) dans un fichier JSON local.
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

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl p-0 overflow-hidden max-h-[92vh] flex flex-col">
          <div className="p-6 pb-4 border-b bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                Historique des aliments
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="overflow-y-auto p-6 pt-4 flex-1">
            {productHistory.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vos aliments récents</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[10px] text-slate-400 hover:text-red-500"
                    onClick={() => setProductHistory([])}
                  >
                    Tout effacer
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {productHistory.map((product) => (
                    <div
                      key={product.id}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white flex-shrink-0 overflow-hidden flex items-center justify-center border border-slate-100">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <Apple className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-700 truncate">{product.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {product.kcalPer100g} kcal/100g • {product.quantityGrams}g
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1">
                          <p className="text-[8px] font-bold text-slate-400 text-center">Ajouter à :</p>
                          <div className="flex gap-1">
                            {meals.map((meal, idx) => (
                              <Button
                                key={idx}
                                size="icon"
                                variant="secondary"
                                className="w-7 h-7 rounded-lg bg-white hover:bg-orange-500 hover:text-white transition-colors"
                                onClick={() => {
                                  setScannedProduct({
                                    id: product.id,
                                    name: product.name,
                                    kcalPer100g: product.kcalPer100g,
                                    proteinsPer100g: product.proteinPer100g,
                                    carbsPer100g: product.carbsPer100g,
                                    fatPer100g: product.fatPer100g,
                                    imageUrl: product.imageUrl,
                                    source: 'OFF',
                                    servingQuantity: 100
                                  });
                                  setTempQuantity(product.quantityGrams || 100);
                                  setActiveMealIndex(idx);
                                  setIsProductModalOpen(true);
                                  setIsHistoryOpen(false);
                                }}
                              >
                                {(() => {
                                  const Icon = ICON_MAP[meal.icon] || Apple;
                                  return <Icon className="w-3 h-3" />;
                                })()}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-8 h-8 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                          onClick={() => removeFromHistory(product.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                  <History className="w-8 h-8 text-slate-200" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-400">Aucun historique</p>
                  <p className="text-xs text-slate-300">Vos aliments scannés apparaîtront ici.</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
              <Button 
                variant="outline" 
                className="rounded-xl"
                onClick={() => {
                  setCurrentDate(new Date());
                  setIsDatePickerOpen(false);
                }}
              >
                Aujourd'hui
              </Button>
              <Button 
                variant="outline" 
                className="rounded-xl"
                onClick={() => setIsDatePickerOpen(false)}
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Results Dialog */}
      <Dialog open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl p-0 overflow-hidden max-h-[92vh] flex flex-col">
          <div className="p-6 pb-4 border-b bg-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Résultats de recherche
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="overflow-y-auto p-6 pt-4 flex-1">
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
                        "text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase",
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
                <p className="text-xs text-slate-400 text-center mb-3">
                  Vous ne trouvez pas votre produit ?
                </p>
                <Button 
                  variant="outline" 
                  className="w-full rounded-2xl border-dashed border-2"
                  onClick={() => {
                    // Treat as manual entry
                    setScannedProduct({
                      id: Math.random().toString(),
                      name: tempName,
                      kcalPer100g: 0,
                      proteinsPer100g: 0,
                      carbsPer100g: 0,
                      fatPer100g: 0,
                      imageUrl: "",
                      source: 'OFF',
                      servingQuantity: 100
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

      {/* Scanner Dialog */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl p-0 overflow-hidden max-h-[92vh] flex flex-col">
          <div className="p-6 pb-4 border-b bg-white">
            <DialogHeader>
              <DialogTitle>Ajouter un aliment</DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="overflow-y-auto p-6 pt-4 flex-1 space-y-6">
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scanner ou Saisir</h4>
              <Scanner 
                isOpen={isScannerOpen} 
                onScanSuccess={handleScanSuccess} 
              />
            </div>

            {productHistory.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historique récent</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[10px] text-slate-400 hover:text-red-500"
                    onClick={() => setProductHistory([])}
                  >
                    Effacer
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {productHistory.slice(0, 10).map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addHistoryProductToMeal(product)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white flex-shrink-0 overflow-hidden flex items-center justify-center border border-slate-100">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <Apple className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate group-hover:text-orange-600 transition-colors">{product.name}</p>
                        <p className="text-[9px] text-slate-400 font-medium">
                          {product.kcalPer100g} kcal • {product.quantityGrams}g
                        </p>
                      </div>
                      <Plus className="w-3 h-3 text-slate-300 group-hover:text-orange-500" />
                    </button>
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

      {/* Product Details Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Détails du produit</DialogTitle>
          </DialogHeader>
          {scannedProduct && (
            <div className="space-y-5 py-2">
              <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                {scannedProduct.image_url && (
                  <img 
                    src={scannedProduct.image_url} 
                    alt={scannedProduct.product_name} 
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
                      type="number" 
                      value={tempKcal} 
                      onChange={(e) => setTempKcal(Number(e.target.value))}
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
                    <Label className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                      <Dna className="w-3 h-3" /> Protéines
                    </Label>
                    <Input 
                      type="number" 
                      value={tempProtein} 
                      onChange={(e) => setTempProtein(Number(e.target.value))}
                      className="h-10 rounded-xl border-blue-100 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-yellow-700 flex items-center gap-1">
                      <Wheat className="w-3 h-3" /> Glucides
                    </Label>
                    <Input 
                      type="number" 
                      value={tempCarbs} 
                      onChange={(e) => setTempCarbs(Number(e.target.value))}
                      className="h-10 rounded-xl border-yellow-100 focus:border-yellow-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                      <Droplets className="w-3 h-3" /> Lipides
                    </Label>
                    <Input 
                      type="number" 
                      value={tempFat} 
                      onChange={(e) => setTempFat(Number(e.target.value))}
                      className="h-10 rounded-xl border-red-100 focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <Label htmlFor="quantity" className="text-sm font-bold text-slate-700">Quantité consommée (en grammes)</Label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Input 
                      id="quantity" 
                      type="number" 
                      value={tempQuantity} 
                      onChange={(e) => setTempQuantity(Number(e.target.value))}
                      className="rounded-2xl h-12 text-lg font-bold pr-8 border-slate-200 focus:border-orange-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">g</span>
                  </div>
                  <div className="bg-orange-50 px-4 py-2 rounded-2xl border border-orange-100">
                    <p className="text-[10px] text-orange-600 font-bold uppercase">Total</p>
                    <p className="text-xl font-black text-orange-600 leading-none">
                      {(tempKcal * tempQuantity / 100).toFixed(0)} <span className="text-xs">kcal</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl h-14 font-bold text-lg shadow-lg shadow-orange-100 transition-all active:scale-[0.98]" onClick={addProductToMeal}>
                  Ajouter au repas
                </Button>
                <Button variant="outline" className="w-full border-slate-200 text-slate-600 rounded-2xl h-12 font-bold transition-all active:scale-[0.98]" onClick={addToHistoryOnly}>
                  Ajouter à l'historique uniquement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Meal Details View */}
      <Dialog open={selectedMealForView !== null} onOpenChange={(open) => !open && setSelectedMealForView(null)}>
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
                  <DialogDescription>
                    Liste des aliments consommés
                  </DialogDescription>
                </DialogHeader>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Current Meal Products */}
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
                            <img 
                              src={product.imageUrl} 
                              alt={product.name} 
                              className="w-12 h-12 object-contain rounded-lg bg-slate-50"
                              referrerPolicy="no-referrer"
                            />
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
                                <Input 
                                  type="number" 
                                  value={product.proteinPer100g} 
                                  onChange={(e) => updateProductDetail(selectedMealForView, product.id, "proteinPer100g", Number(e.target.value))}
                                  className="h-6 text-[10px] px-1 rounded-md"
                                />
                              </div>
                              <div className="space-y-1">
                                <div className="text-[8px] text-yellow-700 font-bold">Gluc (100g)</div>
                                <Input 
                                  type="number" 
                                  value={product.carbsPer100g} 
                                  onChange={(e) => updateProductDetail(selectedMealForView, product.id, "carbsPer100g", Number(e.target.value))}
                                  className="h-6 text-[10px] px-1 rounded-md"
                                />
                              </div>
                              <div className="space-y-1">
                                <div className="text-[8px] text-red-600 font-bold">Lip (100g)</div>
                                <Input 
                                  type="number" 
                                  value={product.fatPer100g} 
                                  onChange={(e) => updateProductDetail(selectedMealForView, product.id, "fatPer100g", Number(e.target.value))}
                                  className="h-6 text-[10px] px-1 rounded-md"
                                />
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

                {/* History Section Integrated */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historique / Favoris</h4>
                    {productHistory.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-[10px] text-slate-400 hover:text-red-500"
                        onClick={() => setProductHistory([])}
                      >
                        Vider
                      </Button>
                    )}
                  </div>
                  
                  {productHistory.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-4">Votre historique est vide.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {productHistory.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100 group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-white flex-shrink-0 overflow-hidden flex items-center justify-center border border-slate-100">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                            ) : (
                              <Apple className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{product.name}</p>
                            <p className="text-[9px] text-slate-400">
                              {product.kcalPer100g} kcal/100g
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 px-2 rounded-lg bg-white hover:bg-orange-500 hover:text-white text-[10px] font-bold transition-colors"
                              onClick={() => {
                                setScannedProduct({
                                  id: product.id,
                                  name: product.name,
                                  kcalPer100g: product.kcalPer100g,
                                  proteinsPer100g: product.proteinPer100g,
                                  carbsPer100g: product.carbsPer100g,
                                  fatPer100g: product.fatPer100g,
                                  imageUrl: product.imageUrl,
                                  source: 'OFF',
                                  servingQuantity: 100
                                });
                                setTempQuantity(product.quantityGrams || 100);
                                setActiveMealIndex(selectedMealForView);
                                setIsProductModalOpen(true);
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Ajouter
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-7 h-7 rounded-full text-slate-300 hover:text-red-500"
                              onClick={() => removeFromHistory(product.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

      {/* Activity Modal */}
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
