/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  Loader2
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
  quantityGrams: number;
  imageUrl?: string;
}

interface MealState {
  title: string;
  icon: any;
  color: string;
  products: LoggedProduct[];
}

export default function App() {
  const [meals, setMeals] = useState<MealState[]>([
    { title: "Petit-déj", icon: Sun, color: "text-yellow-500", products: [] },
    { title: "Déjeuner", icon: Sun, color: "text-yellow-500", products: [] },
    { title: "Dîner", icon: Moon, color: "text-indigo-500", products: [] },
    { title: "En-cas", icon: Apple, color: "text-red-500", products: [] },
  ]);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeMealIndex, setActiveMealIndex] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<OFFProduct | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [tempQuantity, setTempQuantity] = useState(100);
  const [isLoading, setIsLoading] = useState(false);

  const goal = 1500;

  const totalCalories = useMemo(() => {
    return meals.reduce((total, meal) => {
      return total + meal.products.reduce((mealTotal, p) => {
        return mealTotal + (p.kcalPer100g * p.quantityGrams) / 100;
      }, 0);
    }, 0);
  }, [meals]);

  const remaining = goal - totalCalories;
  const progress = Math.min((totalCalories / goal) * 100, 100);

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
      <header className="px-6 pt-8 pb-4 flex flex-col items-center relative">
        <div className="w-full flex justify-between items-center mb-2">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Menu className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight">Tableau de Bord Calories</h1>
          <Button variant="ghost" size="icon" className="rounded-full">
            <User className="w-6 h-6" />
          </Button>
        </div>
        <p className="text-slate-500 text-sm font-medium">
          {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </header>

      <main className="px-6 space-y-6 max-w-md mx-auto">
        {/* Daily Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-orange-500 border-none shadow-2xl shadow-orange-200 overflow-hidden">
            <CardContent className="p-6 text-white space-y-6">
              <h2 className="text-center text-lg font-semibold opacity-90">Résumé Quotidien</h2>
              
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Flame className="w-6 h-6 fill-white" />
                  </div>
                  <div>
                    <p className="text-xs opacity-80 leading-tight">Calories Consommées:</p>
                    <p className="text-2xl font-bold">{totalCalories.toFixed(0)} <span className="text-sm font-normal opacity-80">kcal</span></p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-right">
                  <div>
                    <p className="text-xs opacity-80 leading-tight">Objectif Quotidien:</p>
                    <p className="text-2xl font-bold">{goal} <span className="text-sm font-normal opacity-80">kcal</span></p>
                  </div>
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Target className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Progress value={progress} className="h-3 bg-white/30" />
                <p className="text-center text-sm font-medium">
                  Restant: <span className="font-bold text-yellow-200">{remaining.toFixed(0)} kcal</span>
                </p>
              </div>

              <div className="flex justify-center items-center gap-4 text-sm font-medium opacity-90">
                <span>Aliments: <span className="font-bold">{totalCalories.toFixed(0)}</span></span>
                <span className="opacity-40">|</span>
                <span>Activités: <span className="font-bold">0</span></span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <Button variant="secondary" className="bg-white text-orange-600 hover:bg-slate-100 font-bold rounded-xl h-12">
                  <Leaf className="w-4 h-4 mr-2" />
                  Nutrition
                </Button>
                <Button variant="secondary" className="bg-white text-orange-600 hover:bg-slate-100 font-bold rounded-xl h-12">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Stats
                </Button>
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
                        {mealKcal.toFixed(1)} <span className="text-xs font-medium text-slate-500">kcal</span>
                      </p>
                      <p className="text-xs font-medium text-slate-400">{meal.products.length} Food(s)</p>
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

        {/* Activities Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="bg-blue-600 border-none shadow-2xl shadow-blue-200 rounded-3xl overflow-hidden">
            <CardContent className="p-6 text-white space-y-4">
              <div className="flex items-center gap-3">
                <Footprints className="w-6 h-6" />
                <h2 className="text-lg font-bold">Activités</h2>
              </div>
              
              <p className="text-sm font-medium opacity-90">
                Calories Actives: <span className="font-bold">0.0</span>
              </p>

              <Button className="w-full bg-white text-blue-600 hover:bg-slate-100 font-bold rounded-2xl h-14 text-lg">
                Ajouter un exercice
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>

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
