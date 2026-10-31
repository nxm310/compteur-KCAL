import { UnifiedProduct } from "./foodService";

export interface CiqualItem {
  id: string;
  name: string;
  category: string;
  keywords: string[];
  kcalPer100g: number;
  proteinsPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingQuantity: number;
  emoji?: string;
}

/**
 * Base officielle ANSES - Table de composition nutritionnelle des aliments CIQUAL (France)
 * Valeurs moyennes pour 100g de portion comestible.
 */
export const CIQUAL_DATABASE: CiqualItem[] = [
  // ─── FRUITS ───────────────────────────────────────────────────────────────
  { id: "ciqual-pomme", name: "Pomme crue (avec peau)", category: "Fruits", keywords: ["pomme", "golden", "gala", "granny", "pink lady", "fruit"], kcalPer100g: 54, proteinsPer100g: 0.3, carbsPer100g: 11.6, fatPer100g: 0.2, servingQuantity: 150 },
  { id: "ciqual-banane", name: "Banane fraîche", category: "Fruits", keywords: ["banane", "fruit"], kcalPer100g: 90, proteinsPer100g: 1.1, carbsPer100g: 19.7, fatPer100g: 0.2, servingQuantity: 120 },
  { id: "ciqual-orange", name: "Orange fraîche", category: "Fruits", keywords: ["orange", "agrume", "fruit"], kcalPer100g: 47, proteinsPer100g: 0.8, carbsPer100g: 8.3, fatPer100g: 0.2, servingQuantity: 150 },
  { id: "ciqual-clementine", name: "Clémentine / Mandarine", category: "Fruits", keywords: ["clementine", "clémentine", "mandarine", "agrume"], kcalPer100g: 47, proteinsPer100g: 0.8, carbsPer100g: 9.2, fatPer100g: 0.2, servingQuantity: 80 },
  { id: "ciqual-fraise", name: "Fraises fraîches", category: "Fruits", keywords: ["fraise", "fraises", "fruits rouges"], kcalPer100g: 38, proteinsPer100g: 0.6, carbsPer100g: 6.0, fatPer100g: 0.2, servingQuantity: 150 },
  { id: "ciqual-framboise", name: "Framboises fraîches", category: "Fruits", keywords: ["framboise", "framboises", "fruits rouges"], kcalPer100g: 49, proteinsPer100g: 1.4, carbsPer100g: 4.3, fatPer100g: 0.3, servingQuantity: 125 },
  { id: "ciqual-myrtille", name: "Myrtilles fraîches", category: "Fruits", keywords: ["myrtille", "myrtilles", "bluets"], kcalPer100g: 58, proteinsPer100g: 0.9, carbsPer100g: 10.6, fatPer100g: 0.3, servingQuantity: 100 },
  { id: "ciqual-kiwi", name: "Kiwi frais", category: "Fruits", keywords: ["kiwi", "fruit"], kcalPer100g: 61, proteinsPer100g: 0.9, carbsPer100g: 11.0, fatPer100g: 0.6, servingQuantity: 85 },
  { id: "ciqual-poire", name: "Poire fraîche", category: "Fruits", keywords: ["poire", "fruit"], kcalPer100g: 54, proteinsPer100g: 0.4, carbsPer100g: 10.7, fatPer100g: 0.1, servingQuantity: 160 },
  { id: "ciqual-peche", name: "Pêche / Nectarine fraîche", category: "Fruits", keywords: ["peche", "pêche", "nectarine", "brugnon"], kcalPer100g: 43, proteinsPer100g: 0.9, carbsPer100g: 8.6, fatPer100g: 0.1, servingQuantity: 150 },
  { id: "ciqual-abricot", name: "Abricot frais", category: "Fruits", keywords: ["abricot", "fruit"], kcalPer100g: 46, proteinsPer100g: 0.9, carbsPer100g: 9.0, fatPer100g: 0.1, servingQuantity: 100 },
  { id: "ciqual-raisin", name: "Raisin blanc ou noir", category: "Fruits", keywords: ["raisin", "chasselas", "muscat"], kcalPer100g: 72, proteinsPer100g: 0.6, carbsPer100g: 16.1, fatPer100g: 0.2, servingQuantity: 120 },
  { id: "ciqual-mangue", name: "Mangue fraîche", category: "Fruits", keywords: ["mangue", "exotique"], kcalPer100g: 74, proteinsPer100g: 0.6, carbsPer100g: 14.3, fatPer100g: 0.2, servingQuantity: 150 },
  { id: "ciqual-ananas", name: "Ananas frais", category: "Fruits", keywords: ["ananas", "exotique"], kcalPer100g: 54, proteinsPer100g: 0.4, carbsPer100g: 11.6, fatPer100g: 0.2, servingQuantity: 150 },
  { id: "ciqual-melon", name: "Melon charentais", category: "Fruits", keywords: ["melon", "ete"], kcalPer100g: 62, proteinsPer100g: 1.1, carbsPer100g: 14.8, fatPer100g: 0.1, servingQuantity: 200 },
  { id: "ciqual-pasteque", name: "Pastèque fraîche", category: "Fruits", keywords: ["pasteque", "pastèque", "melon d'eau"], kcalPer100g: 39, proteinsPer100g: 0.7, carbsPer100g: 8.3, fatPer100g: 0.1, servingQuantity: 250 },
  { id: "ciqual-avocat", name: "Avocat frais", category: "Fruits & Légumes", keywords: ["avocat", "guacamole"], kcalPer100g: 205, proteinsPer100g: 1.6, carbsPer100g: 0.8, fatPer100g: 20.6, servingQuantity: 100 },
  { id: "ciqual-datte", name: "Dattes séchées (Medjool / Deglet Nour)", category: "Fruits secs", keywords: ["datte", "dattes", "medjool"], kcalPer100g: 282, proteinsPer100g: 2.1, carbsPer100g: 64.7, fatPer100g: 0.3, servingQuantity: 40 },
  { id: "ciqual-compote-pomme", name: "Compote de pommes sans sucres ajoutés", category: "Fruits", keywords: ["compote", "pomme"], kcalPer100g: 55, proteinsPer100g: 0.3, carbsPer100g: 11.8, fatPer100g: 0.2, servingQuantity: 100 },

  // ─── LÉGUMES ──────────────────────────────────────────────────────────────
  { id: "ciqual-tomate", name: "Tomate crue", category: "Légumes", keywords: ["tomate", "tomates", "cerise", "salade"], kcalPer100g: 19, proteinsPer100g: 0.9, carbsPer100g: 2.5, fatPer100g: 0.3, servingQuantity: 150 },
  { id: "ciqual-concombre", name: "Concombre cru", category: "Légumes", keywords: ["concombre", "crudite"], kcalPer100g: 14, proteinsPer100g: 0.6, carbsPer100g: 2.0, fatPer100g: 0.1, servingQuantity: 150 },
  { id: "ciqual-carotte-crue", name: "Carotte crue / râpée (nature)", category: "Légumes", keywords: ["carotte", "carottes"], kcalPer100g: 40, proteinsPer100g: 0.6, carbsPer100g: 7.6, fatPer100g: 0.2, servingQuantity: 120 },
  { id: "ciqual-carotte-cuite", name: "Carotte cuite (vapeur / eau)", category: "Légumes", keywords: ["carotte", "carottes cuites"], kcalPer100g: 33, proteinsPer100g: 0.6, carbsPer100g: 6.1, fatPer100g: 0.2, servingQuantity: 150 },
  { id: "ciqual-courgette", name: "Courgette cuite", category: "Légumes", keywords: ["courgette", "courgettes", "legume"], kcalPer100g: 19, proteinsPer100g: 0.9, carbsPer100g: 2.0, fatPer100g: 0.4, servingQuantity: 200 },
  { id: "ciqual-brocoli", name: "Brocoli cuit (vapeur)", category: "Légumes", keywords: ["brocoli", "brocolis", "chou"], kcalPer100g: 29, proteinsPer100g: 2.1, carbsPer100g: 2.8, fatPer100g: 0.4, servingQuantity: 150 },
  { id: "ciqual-haricots-verts", name: "Haricots verts cuits", category: "Légumes", keywords: ["haricot vert", "haricots verts"], kcalPer100g: 29, proteinsPer100g: 2.0, carbsPer100g: 3.0, fatPer100g: 0.2, servingQuantity: 150 },
  { id: "ciqual-epinards", name: "Épinards cuits", category: "Légumes", keywords: ["epinard", "épinard", "épinards"], kcalPer100g: 27, proteinsPer100g: 3.0, carbsPer100g: 1.3, fatPer100g: 0.5, servingQuantity: 150 },
  { id: "ciqual-salade-verte", name: "Salade verte / Laitue / Mâche / Roquette", category: "Légumes", keywords: ["salade", "laitue", "mache", "mâche", "roquette", "mesclun"], kcalPer100g: 15, proteinsPer100g: 1.3, carbsPer100g: 1.3, fatPer100g: 0.2, servingQuantity: 60 },
  { id: "ciqual-poivron", name: "Poivron (rouge, vert ou jaune)", category: "Légumes", keywords: ["poivron", "poivrons"], kcalPer100g: 27, proteinsPer100g: 0.9, carbsPer100g: 4.6, fatPer100g: 0.3, servingQuantity: 100 },
  { id: "ciqual-champignon", name: "Champignons de Paris", category: "Légumes", keywords: ["champignon", "champignons"], kcalPer100g: 21, proteinsPer100g: 2.6, carbsPer100g: 1.3, fatPer100g: 0.4, servingQuantity: 120 },
  { id: "ciqual-aubergine", name: "Aubergine cuite", category: "Légumes", keywords: ["aubergine", "aubergines"], kcalPer100g: 33, proteinsPer100g: 0.8, carbsPer100g: 5.5, fatPer100g: 0.2, servingQuantity: 150 },
  { id: "ciqual-chou-fleur", name: "Chou-fleur cuit", category: "Légumes", keywords: ["chou-fleur", "chou fleur"], kcalPer100g: 23, proteinsPer100g: 1.7, carbsPer100g: 2.4, fatPer100g: 0.3, servingQuantity: 150 },
  { id: "ciqual-petits-pois", name: "Petits pois cuits", category: "Légumes", keywords: ["petits pois", "pois"], kcalPer100g: 74, proteinsPer100g: 5.4, carbsPer100g: 8.6, fatPer100g: 0.8, servingQuantity: 130 },
  { id: "ciqual-maïs", name: "Maïs doux en grains", category: "Légumes", keywords: ["mais", "maïs"], kcalPer100g: 96, proteinsPer100g: 2.9, carbsPer100g: 15.8, fatPer100g: 1.9, servingQuantity: 100 },
  { id: "ciqual-oignon", name: "Oignon cru ou cuit", category: "Légumes", keywords: ["oignon", "oignons", "echalote"], kcalPer100g: 40, proteinsPer100g: 1.1, carbsPer100g: 7.6, fatPer100g: 0.1, servingQuantity: 50 },
  { id: "ciqual-courge-butternut", name: "Courge Butternut / Potimarron cuit", category: "Légumes", keywords: ["butternut", "potimarron", "citrouille", "courge"], kcalPer100g: 45, proteinsPer100g: 1.0, carbsPer100g: 9.5, fatPer100g: 0.1, servingQuantity: 200 },

  // ─── VIANDES, VOLAILLES & CHARCUTERIE ─────────────────────────────────────
  { id: "ciqual-blanc-poulet-cuit", name: "Blanc de poulet / Filet de poulet cuit", category: "Viandes & Volailles", keywords: ["poulet", "blanc de poulet", "filet de poulet", "escalope de poulet", "volaille"], kcalPer100g: 150, proteinsPer100g: 29.8, carbsPer100g: 0, fatPer100g: 3.2, servingQuantity: 130 },
  { id: "ciqual-blanc-poulet-cru", name: "Filet de poulet cru", category: "Viandes & Volailles", keywords: ["poulet cru", "blanc de poulet cru", "escalope poulet"], kcalPer100g: 112, proteinsPer100g: 23.6, carbsPer100g: 0, fatPer100g: 1.8, servingQuantity: 150 },
  { id: "ciqual-cuisse-poulet", name: "Cuisse de poulet rôtie", category: "Viandes & Volailles", keywords: ["poulet", "cuisse de poulet", "poulet roti"], kcalPer100g: 198, proteinsPer100g: 25.4, carbsPer100g: 0, fatPer100g: 10.6, servingQuantity: 150 },
  { id: "ciqual-escalope-dinde", name: "Escalope de dinde cuite", category: "Viandes & Volailles", keywords: ["dinde", "escalope de dinde", "filet de dinde", "volaille"], kcalPer100g: 141, proteinsPer100g: 29.5, carbsPer100g: 0, fatPer100g: 2.3, servingQuantity: 130 },
  { id: "ciqual-steak-hache-5", name: "Steak haché 5% MG cuit", category: "Viandes & Volailles", keywords: ["steak", "steak hache", "steak haché", "boeuf", "bœuf", "viande hachee"], kcalPer100g: 149, proteinsPer100g: 25.5, carbsPer100g: 0, fatPer100g: 5.1, servingQuantity: 125 },
  { id: "ciqual-steak-hache-15", name: "Steak haché 15% MG cuit", category: "Viandes & Volailles", keywords: ["steak", "steak hache", "steak haché", "boeuf", "bœuf"], kcalPer100g: 231, proteinsPer100g: 24.3, carbsPer100g: 0, fatPer100g: 14.8, servingQuantity: 125 },
  { id: "ciqual-bavette-boeuf", name: "Steak de bœuf / Bavette / Rumsteck grillé", category: "Viandes & Volailles", keywords: ["boeuf", "bœuf", "bavette", "rumsteck", "faux-filet", "entrecote", "steak"], kcalPer100g: 185, proteinsPer100g: 28.0, carbsPer100g: 0, fatPer100g: 8.0, servingQuantity: 150 },
  { id: "ciqual-filet-mignon-porc", name: "Filet mignon / Côtes de porc cuit", category: "Viandes & Volailles", keywords: ["porc", "filet mignon", "cote de porc"], kcalPer100g: 175, proteinsPer100g: 27.2, carbsPer100g: 0, fatPer100g: 7.2, servingQuantity: 140 },
  { id: "ciqual-jambon-blanc", name: "Jambon blanc cuit supérieur (découenné dégraissé)", category: "Charcuterie", keywords: ["jambon", "jambon blanc", "jambon de paris", "tranche de jambon"], kcalPer100g: 112, proteinsPer100g: 21.0, carbsPer100g: 0.9, fatPer100g: 2.7, servingQuantity: 80 },
  { id: "ciqual-blanc-dinde-tranche", name: "Blanc de poulet ou dinde en tranches", category: "Charcuterie", keywords: ["blanc de dinde", "blanc de poulet", "tranche de poulet", "jambon de dinde"], kcalPer100g: 105, proteinsPer100g: 21.5, carbsPer100g: 1.2, fatPer100g: 1.5, servingQuantity: 80 },
  { id: "ciqual-jambon-cru", name: "Jambon cru / Serrano / Bayonne / Parme", category: "Charcuterie", keywords: ["jambon cru", "serrano", "bayonne", "parme", "prosciutto"], kcalPer100g: 245, proteinsPer100g: 28.5, carbsPer100g: 0.5, fatPer100g: 14.5, servingQuantity: 50 },
  { id: "ciqual-lardons", name: "Lardons fumés ou nature cuits", category: "Charcuterie", keywords: ["lardon", "lardons", "bacon"], kcalPer100g: 285, proteinsPer100g: 19.8, carbsPer100g: 0.6, fatPer100g: 22.8, servingQuantity: 75 },
  { id: "ciqual-merguez", name: "Merguez grillée", category: "Viandes & Volailles", keywords: ["merguez", "saucisse", "barbecue"], kcalPer100g: 295, proteinsPer100g: 18.5, carbsPer100g: 1.0, fatPer100g: 24.0, servingQuantity: 100 },
  { id: "ciqual-chipolata", name: "Saucisse de Toulouse / Chipolata cuite", category: "Viandes & Volailles", keywords: ["saucisse", "chipolata", "toulouse"], kcalPer100g: 278, proteinsPer100g: 17.5, carbsPer100g: 1.2, fatPer100g: 22.5, servingQuantity: 100 },
  { id: "ciqual-canard-magret", name: "Magret de canard grillé", category: "Viandes & Volailles", keywords: ["canard", "magret"], kcalPer100g: 242, proteinsPer100g: 24.5, carbsPer100g: 0, fatPer100g: 16.0, servingQuantity: 150 },

  // ─── POISSONS & FRUITS DE MER ─────────────────────────────────────────────
  { id: "ciqual-saumon-cuit", name: "Pavé de saumon cuit (four / vapeur / poêle)", category: "Poissons", keywords: ["saumon", "pave de saumon", "poisson"], kcalPer100g: 215, proteinsPer100g: 22.8, carbsPer100g: 0, fatPer100g: 13.8, servingQuantity: 140 },
  { id: "ciqual-saumon-cru", name: "Saumon cru (Sushi / Sashimi / Poké)", category: "Poissons", keywords: ["saumon cru", "sashimi", "saumon"], kcalPer100g: 194, proteinsPer100g: 20.5, carbsPer100g: 0, fatPer100g: 12.4, servingQuantity: 120 },
  { id: "ciqual-saumon-fume", name: "Saumon fumé", category: "Poissons", keywords: ["saumon fume", "saumon fumé", "truite fumee"], kcalPer100g: 178, proteinsPer100g: 22.0, carbsPer100g: 0.5, fatPer100g: 9.8, servingQuantity: 70 },
  { id: "ciqual-thon-naturel", name: "Thon au naturel en conserve (égoutté)", category: "Poissons", keywords: ["thon", "thon en boite", "thon au naturel"], kcalPer100g: 112, proteinsPer100g: 25.5, carbsPer100g: 0, fatPer100g: 1.0, servingQuantity: 100 },
  { id: "ciqual-cabillaud", name: "Cabillaud / Colin / Poisson blanc cuit", category: "Poissons", keywords: ["cabillaud", "colin", "lieu", "merlu", "poisson blanc", "dos de cabillaud"], kcalPer100g: 93, proteinsPer100g: 21.4, carbsPer100g: 0, fatPer100g: 0.8, servingQuantity: 150 },
  { id: "ciqual-crevettes", name: "Crevettes roses cuites décortiquées", category: "Poissons", keywords: ["crevette", "crevettes", "gambas", "fruits de mer"], kcalPer100g: 94, proteinsPer100g: 21.4, carbsPer100g: 0.3, fatPer100g: 0.9, servingQuantity: 100 },
  { id: "ciqual-sardines-huile", name: "Sardines ou Maquereaux en conserve (égouttés)", category: "Poissons", keywords: ["sardine", "sardines", "maquereau", "maquereaux"], kcalPer100g: 218, proteinsPer100g: 24.2, carbsPer100g: 0, fatPer100g: 13.5, servingQuantity: 100 },

  // ─── ŒUFS ─────────────────────────────────────────────────────────────────
  { id: "ciqual-oeuf-dur", name: "Œuf entier cuit / dur / mollet (1 œuf ≈ 60g)", category: "Œufs", keywords: ["oeuf", "œuf", "oeufs", "œufs", "oeuf dur", "oeuf mollet", "oeuf coque"], kcalPer100g: 140, proteinsPer100g: 12.7, carbsPer100g: 0.7, fatPer100g: 9.8, servingQuantity: 60 },
  { id: "ciqual-oeuf-plat", name: "Œuf au plat / Œufs brouillés / Omelette nature", category: "Œufs", keywords: ["oeuf au plat", "omelette", "oeufs brouilles", "oeuf"], kcalPer100g: 175, proteinsPer100g: 13.0, carbsPer100g: 0.7, fatPer100g: 13.5, servingQuantity: 120 },
  { id: "ciqual-blanc-oeuf", name: "Blanc d'œuf cuit", category: "Œufs", keywords: ["blanc d'oeuf", "blanc oeuf", "albumine"], kcalPer100g: 48, proteinsPer100g: 10.8, carbsPer100g: 0.7, fatPer100g: 0.1, servingQuantity: 100 },

  // ─── FÉCULENTS, CÉRÉALES & LÉGUMINEUSES ───────────────────────────────────
  { id: "ciqual-riz-blanc-cuit", name: "Riz blanc / Basmati / Thaï cuit", category: "Féculents", keywords: ["riz", "riz cuit", "riz basmati", "riz thai", "riz blanc"], kcalPer100g: 135, proteinsPer100g: 2.9, carbsPer100g: 29.5, fatPer100g: 0.4, servingQuantity: 150 },
  { id: "ciqual-riz-complet-cuit", name: "Riz complet cuit", category: "Féculents", keywords: ["riz complet", "riz brun", "riz"], kcalPer100g: 124, proteinsPer100g: 2.7, carbsPer100g: 25.6, fatPer100g: 1.0, servingQuantity: 150 },
  { id: "ciqual-riz-cru", name: "Riz blanc / Basmati cru (poids sec)", category: "Féculents", keywords: ["riz cru", "riz sec", "riz"], kcalPer100g: 354, proteinsPer100g: 7.4, carbsPer100g: 78.2, fatPer100g: 0.8, servingQuantity: 70 },
  { id: "ciqual-pates-cuites", name: "Pâtes cuites (Spaghetti, Coquillettes, Penne)", category: "Féculents", keywords: ["pates", "pâtes", "pates cuites", "spaghetti", "coquillettes", "penne", "tagliatelles", "macaroni"], kcalPer100g: 131, proteinsPer100g: 4.8, carbsPer100g: 25.8, fatPer100g: 0.8, servingQuantity: 180 },
  { id: "ciqual-pates-completes-cuites", name: "Pâtes complètes cuites", category: "Féculents", keywords: ["pates completes", "pâtes complètes", "pates"], kcalPer100g: 124, proteinsPer100g: 5.3, carbsPer100g: 23.2, fatPer100g: 1.1, servingQuantity: 180 },
  { id: "ciqual-pates-crues", name: "Pâtes sèches crues (avant cuisson)", category: "Féculents", keywords: ["pates crues", "pates seches", "pâtes crues"], kcalPer100g: 358, proteinsPer100g: 12.5, carbsPer100g: 71.8, fatPer100g: 1.8, servingQuantity: 80 },
  { id: "ciqual-pomme-de-terre-cuite", name: "Pomme de terre cuite (eau / vapeur / four)", category: "Féculents", keywords: ["pomme de terre", "patate", "pommes de terre", "pdt"], kcalPer100g: 85, proteinsPer100g: 1.9, carbsPer100g: 18.2, fatPer100g: 0.1, servingQuantity: 200 },
  { id: "ciqual-patate-douce", name: "Patate douce cuite", category: "Féculents", keywords: ["patate douce", "patates douces"], kcalPer100g: 86, proteinsPer100g: 1.6, carbsPer100g: 18.5, fatPer100g: 0.1, servingQuantity: 180 },
  { id: "ciqual-puree", name: "Purée de pommes de terre maison", category: "Féculents", keywords: ["puree", "purée", "mousseline"], kcalPer100g: 102, proteinsPer100g: 2.1, carbsPer100g: 15.2, fatPer100g: 3.5, servingQuantity: 200 },
  { id: "ciqual-frites", name: "Frites cuites (four ou friteuse)", category: "Féculents", keywords: ["frites", "frite", "potatoes"], kcalPer100g: 265, proteinsPer100g: 3.8, carbsPer100g: 34.5, fatPer100g: 12.0, servingQuantity: 150 },
  { id: "ciqual-semoule-cuite", name: "Semoule de blé / Couscous cuit", category: "Féculents", keywords: ["semoule", "couscous", "taboule", "boulgour"], kcalPer100g: 126, proteinsPer100g: 4.1, carbsPer100g: 25.0, fatPer100g: 0.6, servingQuantity: 160 },
  { id: "ciqual-quinoa-cuit", name: "Quinoa cuit", category: "Féculents", keywords: ["quinoa"], kcalPer100g: 120, proteinsPer100g: 4.4, carbsPer100g: 21.3, fatPer100g: 1.9, servingQuantity: 150 },
  { id: "ciqual-flocons-avoine", name: "Flocons d'avoine (Porridge / Muesli)", category: "Céréales", keywords: ["flocons d'avoine", "avoine", "oatmeal", "porridge"], kcalPer100g: 368, proteinsPer100g: 12.8, carbsPer100g: 59.5, fatPer100g: 6.5, servingQuantity: 50 },
  { id: "ciqual-lentilles-cuites", name: "Lentilles vertes ou corail cuites", category: "Légumineuses", keywords: ["lentilles", "lentille", "lentilles corail"], kcalPer100g: 115, proteinsPer100g: 9.0, carbsPer100g: 16.5, fatPer100g: 0.5, servingQuantity: 160 },
  { id: "ciqual-pois-chiches", name: "Pois chiches cuits", category: "Légumineuses", keywords: ["pois chiche", "pois chiches", "houmous"], kcalPer100g: 145, proteinsPer100g: 8.2, carbsPer100g: 21.0, fatPer100g: 2.5, servingQuantity: 150 },
  { id: "ciqual-haricots-rouges", name: "Haricots rouges ou blancs cuits", category: "Légumineuses", keywords: ["haricots rouges", "haricots blancs", "chili", "flageolets"], kcalPer100g: 118, proteinsPer100g: 8.5, carbsPer100g: 17.5, fatPer100g: 0.6, servingQuantity: 150 },

  // ─── PAINS, BISCOTTES & VIENNOISERIES ─────────────────────────────────────
  { id: "ciqual-baguette", name: "Pain baguette française", category: "Boulangerie", keywords: ["pain", "baguette", "tradition", "pain blanc"], kcalPer100g: 278, proteinsPer100g: 9.2, carbsPer100g: 56.6, fatPer100g: 1.3, servingQuantity: 60 },
  { id: "ciqual-pain-complet", name: "Pain complet / Pain aux céréales", category: "Boulangerie", keywords: ["pain complet", "pain aux cereales", "pain de campagne", "pain seigle"], kcalPer100g: 252, proteinsPer100g: 9.4, carbsPer100g: 46.5, fatPer100g: 2.4, servingQuantity: 60 },
  { id: "ciqual-pain-de-mie", name: "Pain de mie (nature ou complet)", category: "Boulangerie", keywords: ["pain de mie", "toast", "tartine"], kcalPer100g: 268, proteinsPer100g: 8.5, carbsPer100g: 48.0, fatPer100g: 4.2, servingQuantity: 70 },
  { id: "ciqual-biscotte", name: "Biscottes / Tartines craquantes", category: "Boulangerie", keywords: ["biscotte", "biscottes", "cracotte"], kcalPer100g: 398, proteinsPer100g: 11.2, carbsPer100g: 73.5, fatPer100g: 5.5, servingQuantity: 30 },
  { id: "ciqual-galette-riz", name: "Galette de riz ou maïs soufflé", category: "Boulangerie", keywords: ["galette de riz", "galettes de riz", "galette de mais"], kcalPer100g: 382, proteinsPer100g: 8.0, carbsPer100g: 81.0, fatPer100g: 2.8, servingQuantity: 20 },
  { id: "ciqual-croissant", name: "Croissant au beurre (boulangerie, 1 pièce ≈ 55g)", category: "Viennoiseries", keywords: ["croissant", "viennoiserie"], kcalPer100g: 412, proteinsPer100g: 8.2, carbsPer100g: 45.2, fatPer100g: 21.5, servingQuantity: 55 },
  { id: "ciqual-pain-au-chocolat", name: "Pain au chocolat / Chocolatine (1 pièce ≈ 65g)", category: "Viennoiseries", keywords: ["pain au chocolat", "chocolatine", "viennoiserie"], kcalPer100g: 420, proteinsPer100g: 7.8, carbsPer100g: 46.5, fatPer100g: 22.0, servingQuantity: 65 },
  { id: "ciqual-brioche", name: "Brioche tranchée", category: "Viennoiseries", keywords: ["brioche", "brioche tressee"], kcalPer100g: 365, proteinsPer100g: 8.5, carbsPer100g: 51.0, fatPer100g: 13.5, servingQuantity: 50 },
  { id: "ciqual-crepe", name: "Crêpe nature ou sucrée / Pancake", category: "Viennoiseries", keywords: ["crepe", "crêpe", "pancake", "gaufre"], kcalPer100g: 225, proteinsPer100g: 6.4, carbsPer100g: 32.0, fatPer100g: 7.5, servingQuantity: 70 },

  // ─── PRODUITS LAITIERS & FROMAGES ─────────────────────────────────────────
  { id: "ciqual-skyr", name: "Skyr nature 0% MG", category: "Produits laitiers", keywords: ["skyr", "yaourt proteiné", "fromage blanc 0"], kcalPer100g: 58, proteinsPer100g: 10.2, carbsPer100g: 3.8, fatPer100g: 0.2, servingQuantity: 140 },
  { id: "ciqual-fromage-blanc-0", name: "Fromage blanc 0% MG nature", category: "Produits laitiers", keywords: ["fromage blanc", "fromage blanc 0%", "faisselle"], kcalPer100g: 47, proteinsPer100g: 7.8, carbsPer100g: 3.8, fatPer100g: 0.1, servingQuantity: 150 },
  { id: "ciqual-fromage-blanc-3", name: "Fromage blanc 3% MG / Petit-suisse", category: "Produits laitiers", keywords: ["fromage blanc", "fromage blanc 3%", "petit suisse"], kcalPer100g: 73, proteinsPer100g: 7.4, carbsPer100g: 3.7, fatPer100g: 3.1, servingQuantity: 150 },
  { id: "ciqual-yaourt-nature", name: "Yaourt nature classique (1 pot = 125g)", category: "Produits laitiers", keywords: ["yaourt", "yaourt nature", "yogourt"], kcalPer100g: 46, proteinsPer100g: 4.1, carbsPer100g: 4.8, fatPer100g: 1.1, servingQuantity: 125 },
  { id: "ciqual-yaourt-grec", name: "Yaourt à la grecque nature", category: "Produits laitiers", keywords: ["yaourt grec", "yaourt a la grecque"], kcalPer100g: 122, proteinsPer100g: 3.9, carbsPer100g: 4.2, fatPer100g: 9.8, servingQuantity: 150 },
  { id: "ciqual-lait-demi-ecreme", name: "Lait demi-écrémé", category: "Produits laitiers", keywords: ["lait", "lait demi ecreme", "lait demi-écrémé"], kcalPer100g: 46, proteinsPer100g: 3.3, carbsPer100g: 4.8, fatPer100g: 1.5, servingQuantity: 200 },
  { id: "ciqual-lait-amande-avoine", name: "Boisson végétale (Lait d'avoine / amande / soja)", category: "Produits laitiers", keywords: ["lait d'amande", "lait d'avoine", "lait de soja", "boisson vegetale"], kcalPer100g: 42, proteinsPer100g: 1.5, carbsPer100g: 5.5, fatPer100g: 1.5, servingQuantity: 200 },
  { id: "ciqual-emmental", name: "Emmental / Gruyère (râpé ou bloc)", category: "Fromages", keywords: ["emmental", "gruyere", "gruyère", "fromage rape", "fromage râpé"], kcalPer100g: 368, proteinsPer100g: 27.5, carbsPer100g: 0.2, fatPer100g: 28.5, servingQuantity: 30 },
  { id: "ciqual-comte", name: "Comté / Beaufort", category: "Fromages", keywords: ["comte", "comté", "beaufort", "fromage"], kcalPer100g: 409, proteinsPer100g: 27.2, carbsPer100g: 0.5, fatPer100g: 33.5, servingQuantity: 30 },
  { id: "ciqual-mozzarella", name: "Mozzarella (au lait de vache ou bufflonne)", category: "Fromages", keywords: ["mozzarella", "mozza", "burrata"], kcalPer100g: 245, proteinsPer100g: 18.5, carbsPer100g: 1.0, fatPer100g: 18.5, servingQuantity: 60 },
  { id: "ciqual-feta", name: "Feta (brebis / chèvre)", category: "Fromages", keywords: ["feta", "fromage grec"], kcalPer100g: 264, proteinsPer100g: 14.2, carbsPer100g: 1.5, fatPer100g: 22.5, servingQuantity: 40 },
  { id: "ciqual-chevre", name: "Fromage de chèvre (bûche / crottin / frais)", category: "Fromages", keywords: ["chevre", "chèvre", "buche de chevre", "cabecou"], kcalPer100g: 285, proteinsPer100g: 18.5, carbsPer100g: 1.2, fatPer100g: 23.0, servingQuantity: 35 },
  { id: "ciqual-camembert", name: "Camembert / Brie", category: "Fromages", keywords: ["camembert", "brie", "coulommiers"], kcalPer100g: 286, proteinsPer100g: 20.0, carbsPer100g: 0.5, fatPer100g: 22.5, servingQuantity: 35 },
  { id: "ciqual-parmesan", name: "Parmesan (Parmigiano Reggiano)", category: "Fromages", keywords: ["parmesan", "grana padano"], kcalPer100g: 402, proteinsPer100g: 32.5, carbsPer100g: 0, fatPer100g: 29.7, servingQuantity: 20 },

  // ─── OLÉAGINEUX, MATIÈRES GRASSES & CONDIMENTS ────────────────────────────
  { id: "ciqual-amandes", name: "Amandes entières", category: "Oléagineux", keywords: ["amande", "amandes", "fruits a coque"], kcalPer100g: 608, proteinsPer100g: 21.2, carbsPer100g: 7.8, fatPer100g: 53.4, servingQuantity: 30 },
  { id: "ciqual-noix", name: "Noix / Cerneaux de noix", category: "Oléagineux", keywords: ["noix", "cerneaux de noix"], kcalPer100g: 678, proteinsPer100g: 15.2, carbsPer100g: 6.9, fatPer100g: 64.5, servingQuantity: 30 },
  { id: "ciqual-noix-cajou", name: "Noix de cajou", category: "Oléagineux", keywords: ["cajou", "noix de cajou", "noisettes"], kcalPer100g: 598, proteinsPer100g: 18.2, carbsPer100g: 22.8, fatPer100g: 47.8, servingQuantity: 30 },
  { id: "ciqual-beurre-cacahuete", name: "Beurre de cacahuète 100% pur", category: "Oléagineux", keywords: ["beurre de cacahuete", "beurre de cacahuète", "peanut butter", "cacahuete"], kcalPer100g: 612, proteinsPer100g: 25.8, carbsPer100g: 12.5, fatPer100g: 50.2, servingQuantity: 20 },
  { id: "ciqual-huile-olive", name: "Huile d'olive / colza / tournesol (1 c.à.s ≈ 10g)", category: "Matières grasses", keywords: ["huile", "huile d'olive", "huile de colza", "huile de tournesol"], kcalPer100g: 899, proteinsPer100g: 0, carbsPer100g: 0, fatPer100g: 99.9, servingQuantity: 10 },
  { id: "ciqual-beurre", name: "Beurre doux ou demi-sel (1 portion ≈ 10g)", category: "Matières grasses", keywords: ["beurre", "beurre demi-sel", "beurre doux"], kcalPer100g: 745, proteinsPer100g: 0.7, carbsPer100g: 0.8, fatPer100g: 82.0, servingQuantity: 10 },
  { id: "ciqual-creme-fraiche", name: "Crème fraîche 30% MG", category: "Matières grasses", keywords: ["creme fraiche", "crème fraîche", "creme liquide"], kcalPer100g: 295, proteinsPer100g: 2.3, carbsPer100g: 2.8, fatPer100g: 30.0, servingQuantity: 30 },
  { id: "ciqual-creme-legere", name: "Crème fraîche légère 15% MG", category: "Matières grasses", keywords: ["creme legere", "crème légère", "creme 15%"], kcalPer100g: 165, proteinsPer100g: 2.6, carbsPer100g: 3.8, fatPer100g: 15.0, servingQuantity: 30 },
  { id: "ciqual-mayonnaise", name: "Mayonnaise classique", category: "Sauces", keywords: ["mayonnaise", "mayo"], kcalPer100g: 695, proteinsPer100g: 1.2, carbsPer100g: 2.0, fatPer100g: 75.0, servingQuantity: 15 },
  { id: "ciqual-vinaigrette", name: "Vinaigrette maison ou allégée", category: "Sauces", keywords: ["vinaigrette", "sauce salade"], kcalPer100g: 450, proteinsPer100g: 0.3, carbsPer100g: 2.5, fatPer100g: 48.0, servingQuantity: 20 },
  { id: "ciqual-ketchup", name: "Sauce Ketchup", category: "Sauces", keywords: ["ketchup", "sauce tomate"], kcalPer100g: 112, proteinsPer100g: 1.3, carbsPer100g: 25.0, fatPer100g: 0.2, servingQuantity: 20 },

  // ─── SUCRÉ, CHOCOLAT & COMPLÉMENTS ────────────────────────────────────────
  { id: "ciqual-chocolat-noir", name: "Chocolat noir 70% cacao (1 carré ≈ 10g)", category: "Sucré", keywords: ["chocolat", "chocolat noir", "cacao"], kcalPer100g: 572, proteinsPer100g: 8.5, carbsPer100g: 33.5, fatPer100g: 43.2, servingQuantity: 20 },
  { id: "ciqual-chocolat-lait", name: "Chocolat au lait", category: "Sucré", keywords: ["chocolat au lait", "chocolat"], kcalPer100g: 545, proteinsPer100g: 7.2, carbsPer100g: 54.0, fatPer100g: 32.5, servingQuantity: 20 },
  { id: "ciqual-miel", name: "Miel toutes fleurs (1 c.à.c ≈ 10g)", category: "Sucré", keywords: ["miel", "sirop d'erable", "sirop d'agave"], kcalPer100g: 312, proteinsPer100g: 0.4, carbsPer100g: 77.5, fatPer100g: 0, servingQuantity: 15 },
  { id: "ciqual-confiture", name: "Confiture de fruits", category: "Sucré", keywords: ["confiture", "confiture de fraise", "confiture d'abricot"], kcalPer100g: 255, proteinsPer100g: 0.5, carbsPer100g: 62.0, fatPer100g: 0.1, servingQuantity: 20 },
  { id: "ciqual-sucre", name: "Sucre blanc ou roux (1 morceau ≈ 5g)", category: "Sucré", keywords: ["sucre", "cassonade"], kcalPer100g: 399, proteinsPer100g: 0, carbsPer100g: 99.8, fatPer100g: 0, servingQuantity: 5 },
  { id: "ciqual-whey", name: "Whey Protéine en poudre (Isolate / Concentrate)", category: "Sport & Compléments", keywords: ["whey", "proteine", "protéine", "shaker", "isolate"], kcalPer100g: 378, proteinsPer100g: 78.0, carbsPer100g: 6.5, fatPer100g: 4.5, servingQuantity: 30 },

  // ─── PLATS PRÉPARÉS & RESTAURATION COURANTE ───────────────────────────────
  { id: "ciqual-pizza-reine", name: "Pizza Reine / Margherita", category: "Plats préparés", keywords: ["pizza", "pizza reine", "margherita", "4 fromages"], kcalPer100g: 238, proteinsPer100g: 10.5, carbsPer100g: 27.5, fatPer100g: 9.2, servingQuantity: 350 },
  { id: "ciqual-quiche-lorraine", name: "Quiche Lorraine", category: "Plats préparés", keywords: ["quiche", "quiche lorraine", "tarte salee"], kcalPer100g: 272, proteinsPer100g: 10.2, carbsPer100g: 20.5, fatPer100g: 16.5, servingQuantity: 180 },
  { id: "ciqual-croque-monsieur", name: "Croque-Monsieur", category: "Plats préparés", keywords: ["croque monsieur", "croque-monsieur"], kcalPer100g: 268, proteinsPer100g: 13.8, carbsPer100g: 24.5, fatPer100g: 12.5, servingQuantity: 150 },
  { id: "ciqual-lasagnes", name: "Lasagnes à la bolognaise", category: "Plats préparés", keywords: ["lasagne", "lasagnes", "bolognaise"], kcalPer100g: 148, proteinsPer100g: 8.2, carbsPer100g: 13.5, fatPer100g: 6.8, servingQuantity: 350 },
  { id: "ciqual-hachis-parmentier", name: "Hachis Parmentier", category: "Plats préparés", keywords: ["hachis parmentier", "parmentier"], kcalPer100g: 128, proteinsPer100g: 7.5, carbsPer100g: 11.2, fatPer100g: 5.8, servingQuantity: 350 },
  { id: "ciqual-couscous-royal", name: "Couscous Royal complet (semoule, légumes, viandes)", category: "Plats préparés", keywords: ["couscous", "couscous royal"], kcalPer100g: 142, proteinsPer100g: 8.4, carbsPer100g: 15.2, fatPer100g: 5.1, servingQuantity: 450 },
  { id: "ciqual-sushi-saumon", name: "Sushi / Maki au saumon", category: "Plats préparés", keywords: ["sushi", "maki", "california roll", "japonais"], kcalPer100g: 155, proteinsPer100g: 6.8, carbsPer100g: 24.5, fatPer100g: 3.2, servingQuantity: 220 },
  { id: "ciqual-poke-bowl", name: "Poké Bowl Saumon Avocat Riz", category: "Plats préparés", keywords: ["poke bowl", "poké bowl", "poke"], kcalPer100g: 145, proteinsPer100g: 7.5, carbsPer100g: 18.0, fatPer100g: 4.8, servingQuantity: 400 },
  { id: "ciqual-burger", name: "Hamburger / Cheeseburger classique", category: "Plats préparés", keywords: ["burger", "hamburger", "cheeseburger"], kcalPer100g: 255, proteinsPer100g: 13.5, carbsPer100g: 24.0, fatPer100g: 11.5, servingQuantity: 220 },
  { id: "ciqual-sandwich-jambon-beurre", name: "Sandwich Jambon-Beurre / Emmental", category: "Plats préparés", keywords: ["sandwich", "jambon beurre", "jambon-beurre"], kcalPer100g: 258, proteinsPer100g: 11.5, carbsPer100g: 33.5, fatPer100g: 8.2, servingQuantity: 180 },
  { id: "ciqual-kebab", name: "Kebab / Grec / Tacos (pain, viande, crudités, sauce)", category: "Plats préparés", keywords: ["kebab", "grec", "tacos", "shawarma"], kcalPer100g: 228, proteinsPer100g: 12.2, carbsPer100g: 22.5, fatPer100g: 9.8, servingQuantity: 350 },
  { id: "ciqual-ratatouille", name: "Ratatouille cuisinée", category: "Plats préparés", keywords: ["ratatouille", "poelee de legumes"], kcalPer100g: 58, proteinsPer100g: 1.2, carbsPer100g: 5.2, fatPer100g: 3.5, servingQuantity: 200 },
  { id: "ciqual-soupe-legumes", name: "Soupe / Velouté de légumes", category: "Plats préparés", keywords: ["soupe", "veloute", "velouté", "potage"], kcalPer100g: 42, proteinsPer100g: 1.1, carbsPer100g: 5.8, fatPer100g: 1.4, servingQuantity: 250 },
];

/**
 * Normalise une chaîne (sans accents, minuscules) pour la recherche floue
 */
export const normalizeText = (str: string): string =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .trim();

/**
 * Recherche dans la base officielle CIQUAL avec score de pertinence
 */
export const searchCiqual = (query: string, limit = 15): UnifiedProduct[] => {
  const qNorm = normalizeText(query);
  if (!qNorm || qNorm.length < 2) return [];

  const tokens = qNorm.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) return [];

  const scored: { item: CiqualItem; score: number }[] = [];

  for (const item of CIQUAL_DATABASE) {
    const nameNorm = normalizeText(item.name);
    const kwNorm = item.keywords.map(normalizeText);
    const catNorm = normalizeText(item.category);

    let score = 0;

    // Correspondance exacte sur un mot-clé ou début du nom
    if (nameNorm === qNorm || kwNorm.includes(qNorm)) {
      score += 120;
    } else if (nameNorm.startsWith(qNorm)) {
      score += 100;
    } else if (kwNorm.some((k) => k.startsWith(qNorm))) {
      score += 85;
    } else if (nameNorm.includes(qNorm)) {
      score += 70;
    }

    // Tous les tokens doivent matcher quelque part (nom, mots-clés ou catégorie)
    let matchedTokens = 0;
    for (const token of tokens) {
      if (nameNorm.includes(token)) {
        score += 35;
        matchedTokens++;
      } else if (kwNorm.some((k) => k.includes(token))) {
        score += 25;
        matchedTokens++;
      } else if (catNorm.includes(token)) {
        score += 10;
        matchedTokens++;
      }
    }

    if (matchedTokens === tokens.length && score > 0) {
      scored.push({ item, score });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => ({
      id: item.id,
      name: item.name,
      brand: `Base officielle CIQUAL · ${item.category}`,
      kcalPer100g: item.kcalPer100g,
      proteinsPer100g: item.proteinsPer100g,
      carbsPer100g: item.carbsPer100g,
      fatPer100g: item.fatPer100g,
      source: "CIQUAL" as const,
      servingQuantity: item.servingQuantity,
    }));
};
