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
  Plus, 
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
  Wheat
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
import { fetchProductByBarcode, OFFProduct } from "@/services/foodService";

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

interface UserProfile {
  currentWeight: number;
  goalWeight: number;
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
}

const DEFAULT_PROFILE: UserProfile = {
  currentWeight: 75,
  goalWeight: 70,
  calorieGoal: 2000,
  proteinGoal: 150,
  carbsGoal: 200,
  fatGoal: 65,
};

const INITIAL_MEALS = [
  { title: "Petit-déj", icon: Sun, color: "text-yellow-500", products: [] },
  { title: "Déjeuner", icon: Sun, color: "text-yellow-500", products: [] },
  { title: "Dîner", icon: Moon, color: "text-indigo-500", products: [] },
  { title: "En-cas", icon: Apple, color: "text-red-500", products: [] },
];

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"dashboard" | "profile">("dashboard");
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("calo_profile");
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });

  const [mealsByDate, setMealsByDate] = useState<Record<string, MealState[]>>(() => {
    const saved = localStorage.getItem("calo_meals");
    return saved ? JSON.parse(saved) : {};
  });

  const dateKey = format(currentDate, "yyyy-MM-dd");
  const meals = useMemo(() => mealsByDate[dateKey] || INITIAL_MEALS, [mealsByDate, dateKey]);

  useEffect(() => {
    localStorage.setItem("calo_profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("calo_meals", JSON.stringify(mealsByDate));
  }, [mealsByDate]);

  const setMeals = (newMeals: MealState[]) => {
    setMealsByDate(prev => ({
      ...prev,
      [dateKey]: newMeals
    }));
  };

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeMealIndex, setActiveMealIndex] = useState<number | null>(null);
  const [scannedProduct, setScannedProduct] = useState<OFFProduct | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [tempQuantity, setTempQuantity] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

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

  const remaining = profile.calorieGoal - totals.kcal;
  const progress = Math.min((totals.kcal / profile.calorieGoal) * 100, 100);

  const handleScanSuccess = useCallback(async (barcode: string) => {
    if (isLoading || isProductModalOpen) return;
    setIsLoading(true);
    try {
      const product = await fetchProductByBarcode(barcode);
      if (product) {
        setScannedProduct(product);
        setIsScannerOpen(false);
        setIsProductModalOpen(true);
        setTempQuantity(product.serving_quantity || 100);
      } else {
        alert(`Produit non trouvé pour le code : ${barcode}. Vérifiez que le produit existe sur Open Food Facts.`);
      }
    } catch (error) {
      console.error("Scan error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isProductModalOpen]);

  const addProductToMeal = () => {
    if (scannedProduct && activeMealIndex !== null) {
      const newProduct: LoggedProduct = {
        id: Math.random().toString(36).substr(2, 9),
        name: scannedProduct.product_name || "Produit inconnu",
        kcalPer100g: scannedProduct.nutriments["energy-kcal_100g"] || 0,
        proteinPer100g: scannedProduct.nutriments.proteins_100g || 0,
        carbsPer100g: scannedProduct.nutriments.carbohydrates_100g || 0,
        fatPer100g: scannedProduct.nutriments.fat_100g || 0,
        quantityGrams: tempQuantity,
        imageUrl: scannedProduct.image_url,
      };

      const updatedMeals = [...meals];
      updatedMeals[activeMealIndex].products.push(newProduct);
      setMeals(updatedMeals);
      setIsProductModalOpen(false);
      setScannedProduct(null);
    }
  };

  const updateProductQuantity = (mealIndex: number, productId: string, newQuantity: number) => {
    const updatedMeals = [...meals];
    const product = updatedMeals[mealIndex].products.find(p => p.id === productId);
    if (product) {
      product.quantityGrams = newQuantity;
      setMeals(updatedMeals);
    }
  };

  const removeProduct = (mealIndex: number, productId: string) => {
    const updatedMeals = [...meals];
    updatedMeals[mealIndex].products = updatedMeals[mealIndex].products.filter(p => p.id !== productId);
    setMeals(updatedMeals);
  };

  const [selectedMealForView, setSelectedMealForView] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      {/* Header */}
      <header className="px-6 pt-8 pb-4 flex flex-col items-center relative bg-white border-b border-slate-100">
        <div className="w-full flex justify-between items-center mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => setView(view === "dashboard" ? "profile" : "dashboard")}
          >
            {view === "dashboard" ? <Menu className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
          </Button>
          <h1 className="text-xl font-bold tracking-tight">
            {view === "dashboard" ? "CaloTrack" : "Profil & Objectifs"}
          </h1>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("rounded-full", view === "profile" && "bg-slate-100")}
            onClick={() => setView("profile")}
          >
            <User className="w-6 h-6" />
          </Button>
        </div>

        {view === "dashboard" && (
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg"
              onClick={() => setCurrentDate(subDays(currentDate, 1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <button 
              className="flex items-center gap-2 font-bold text-slate-700 hover:text-indigo-600 transition-colors"
              onClick={() => setIsDatePickerOpen(true)}
            >
              <CalendarIcon className="w-4 h-4" />
              {isSameDay(currentDate, new Date()) ? "Aujourd'hui" : format(currentDate, "d MMMM", { locale: fr })}
            </button>

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg"
              onClick={() => setCurrentDate(addDays(currentDate, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}
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
              <Card className="bg-orange-500 border-none shadow-2xl shadow-orange-200 overflow-hidden">
                <CardContent className="p-6 text-white space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold opacity-90">Résumé Quotidien</h2>
                    <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                      {totals.kcal.toFixed(0)} / {profile.calorieGoal} kcal
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className="bg-white/20 p-2 rounded-xl">
                        <Flame className="w-6 h-6 fill-white" />
                      </div>
                      <div>
                        <p className="text-xs opacity-80 leading-tight">Consommé:</p>
                        <p className="text-2xl font-bold">{totals.kcal.toFixed(0)} <span className="text-sm font-normal opacity-80">kcal</span></p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-right">
                      <div>
                        <p className="text-xs opacity-80 leading-tight">Restant:</p>
                        <p className="text-2xl font-bold">{remaining.toFixed(0)} <span className="text-sm font-normal opacity-80">kcal</span></p>
                      </div>
                      <div className="bg-white/20 p-2 rounded-xl">
                        <Target className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Progress value={progress} className="h-3 bg-white/30" />
                  </div>

                  {/* Macros Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="bg-white/10 p-3 rounded-2xl text-center">
                      <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Protéines</p>
                      <p className="font-bold">{totals.protein.toFixed(0)}g</p>
                      <div className="w-full h-1 bg-white/20 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-blue-300" 
                          style={{ width: `${Math.min((totals.protein / profile.proteinGoal) * 100, 100)}%` }} 
                        />
                      </div>
                    </div>
                    <div className="bg-white/10 p-3 rounded-2xl text-center">
                      <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Glucides</p>
                      <p className="font-bold">{totals.carbs.toFixed(0)}g</p>
                      <div className="w-full h-1 bg-white/20 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-yellow-300" 
                          style={{ width: `${Math.min((totals.carbs / profile.carbsGoal) * 100, 100)}%` }} 
                        />
                      </div>
                    </div>
                    <div className="bg-white/10 p-3 rounded-2xl text-center">
                      <p className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Lipides</p>
                      <p className="font-bold">{totals.fat.toFixed(0)}g</p>
                      <div className="w-full h-1 bg-white/20 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-red-300" 
                          style={{ width: `${Math.min((totals.fat / profile.fatGoal) * 100, 100)}%` }} 
                        />
                      </div>
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
                      className="border-none shadow-md hover:shadow-xl transition-shadow duration-300 rounded-3xl cursor-pointer"
                      onClick={() => setSelectedMealForView(index)}
                    >
                      <CardContent className="p-5 relative">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-slate-800">{meal.title}</h3>
                          {(() => {
                            const MealIcon = meal.icon;
                            return <MealIcon className={cn("w-6 h-6", meal.color)} />;
                          })()}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xl font-black text-slate-900 leading-none">
                            {mealKcal.toFixed(0)} <span className="text-xs font-medium text-slate-500">kcal</span>
                          </p>
                          <p className="text-xs font-medium text-slate-400">{meal.products.length} aliment(s)</p>
                        </div>
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className="absolute bottom-4 right-4 w-8 h-8 rounded-xl bg-slate-100 text-slate-600 hover:bg-orange-500 hover:text-white transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMealIndex(index);
                            setIsScannerOpen(true);
                          }}
                        >
                          <Plus className="w-5 h-5" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Weight Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Card className="bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 p-2 rounded-xl">
                        <Scale className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h2 className="text-lg font-bold text-slate-800">Poids</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-medium">Objectif: {profile.goalWeight} kg</p>
                      <p className="text-lg font-bold text-slate-900">{profile.currentWeight} kg</p>
                    </div>
                  </div>
                  
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500" 
                      style={{ width: `${Math.max(0, Math.min(100, (profile.currentWeight / profile.goalWeight) * 100))}%` }} 
                    />
                  </div>
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
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-500" />
                  Données de Poids
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Poids Actuel (kg)</Label>
                    <Input 
                      type="number" 
                      value={profile.currentWeight} 
                      onChange={(e) => setProfile({...profile, currentWeight: Number(e.target.value)})}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Objectif (kg)</Label>
                    <Input 
                      type="number" 
                      value={profile.goalWeight} 
                      onChange={(e) => setProfile({...profile, goalWeight: Number(e.target.value)})}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Objectif Calories
                </h3>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">Calories Journalières (kcal)</Label>
                  <Input 
                    type="number" 
                    value={profile.calorieGoal} 
                    onChange={(e) => setProfile({...profile, calorieGoal: Number(e.target.value)})}
                    className="rounded-xl text-lg font-bold"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Dna className="w-5 h-5 text-blue-500" />
                  Objectifs Macros (g)
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Dna className="w-3 h-3" /> Prot
                    </Label>
                    <Input 
                      type="number" 
                      value={profile.proteinGoal} 
                      onChange={(e) => setProfile({...profile, proteinGoal: Number(e.target.value)})}
                      className="rounded-xl px-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Wheat className="w-3 h-3" /> Gluc
                    </Label>
                    <Input 
                      type="number" 
                      value={profile.carbsGoal} 
                      onChange={(e) => setProfile({...profile, carbsGoal: Number(e.target.value)})}
                      className="rounded-xl px-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Droplets className="w-3 h-3" /> Lipi
                    </Label>
                    <Input 
                      type="number" 
                      value={profile.fatGoal} 
                      onChange={(e) => setProfile({...profile, fatGoal: Number(e.target.value)})}
                      className="rounded-xl px-2"
                    />
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
          </motion.main>
        )}
      </AnimatePresence>

      {/* Date Picker Dialog */}
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

      {/* Scanner Dialog */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Scanner un produit</DialogTitle>
            <DialogDescription>
              Placez le code-barres devant la caméra pour l'analyser.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Scanner 
              isOpen={isScannerOpen} 
              onScanSuccess={handleScanSuccess} 
            />
          </div>
          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Recherche du produit...
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Details Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Ajouter le produit</DialogTitle>
          </DialogHeader>
          {scannedProduct && (
            <div className="space-y-6 py-4">
              <div className="flex gap-4 items-center">
                {scannedProduct.image_url && (
                  <img 
                    src={scannedProduct.image_url} 
                    alt={scannedProduct.product_name} 
                    className="w-20 h-20 object-contain rounded-xl bg-slate-100 p-1"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div>
                  <h3 className="font-bold text-lg">{scannedProduct.product_name}</h3>
                  <p className="text-slate-500 text-sm">
                    {scannedProduct.nutriments["energy-kcal_100g"]?.toFixed(0) || 0} kcal / 100g
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantité (grammes)</Label>
                <div className="flex gap-4">
                  <Input 
                    id="quantity" 
                    type="number" 
                    value={tempQuantity} 
                    onChange={(e) => setTempQuantity(Number(e.target.value))}
                    className="rounded-xl"
                  />
                  <div className="flex items-center font-bold text-orange-600 whitespace-nowrap">
                    = {((scannedProduct.nutriments["energy-kcal_100g"] || 0) * tempQuantity / 100).toFixed(0)} kcal
                  </div>
                </div>
              </div>

              <Button className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl h-12 font-bold" onClick={addProductToMeal}>
                Confirmer l'ajout
              </Button>
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
                    {meals[selectedMealForView].title}
                    {(() => {
                      const MealIcon = meals[selectedMealForView].icon;
                      return <MealIcon className={cn("w-5 h-5", meals[selectedMealForView].color)} />;
                    })()}
                  </DialogTitle>
                  <DialogDescription>
                    Liste des aliments consommés
                  </DialogDescription>
                </DialogHeader>
              </div>
              
              <ScrollArea className="flex-1 p-6">
                {meals[selectedMealForView].products.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    Aucun aliment ajouté pour ce repas.
                  </div>
                ) : (
                  <div className="space-y-4">
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
                          <h4 className="font-bold text-sm truncate">{product.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Input 
                              type="number" 
                              value={product.quantityGrams} 
                              onChange={(e) => updateProductQuantity(selectedMealForView, product.id, Number(e.target.value))}
                              className="h-7 w-16 text-xs px-1 rounded-md"
                            />
                            <span className="text-[10px] text-slate-400 font-medium">g</span>
                            <span className="text-xs font-bold text-orange-600 ml-auto">
                              {((product.kcalPer100g * product.quantityGrams) / 100).toFixed(0)} kcal
                            </span>
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
              </ScrollArea>

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
    </div>
  );
}
