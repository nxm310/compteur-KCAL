/**
 * Unified AI Service for CaloTrack KCAL
 * Supports Google Gemini, OpenAI (ChatGPT), and Mistral AI
 * for both Multimodal Photo Analysis and Text Nutritional Estimation.
 */

export type AiProvider = "gemini" | "openai" | "mistral";

export interface AiModelOption {
  id: string;
  label: string;
  tag: string;
  supportsVision: boolean;
}

export interface AiProviderMeta {
  id: AiProvider;
  name: string;
  shortName: string;
  badge: string;
  defaultModel: string;
  models: AiModelOption[];
  keyStorageKey: string;
  modelStorageKey: string;
  keyPlaceholder: string;
  keyConsoleUrl: string;
  keyConsoleName: string;
  description: string;
  colorTheme: {
    badgeBg: string;
    badgeText: string;
    border: string;
    activeBg: string;
    text: string;
    ring: string;
    accent: string;
  };
}

export interface AiFoodResult {
  name: string;
  estimatedWeight: number; // in grams
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export const AI_PROVIDERS: Record<AiProvider, AiProviderMeta> = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    shortName: "Gemini",
    badge: "Quota Gratuit (Free Tier)",
    defaultModel: "gemini-3.8-flash",
    models: [
      { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", tag: "Recommandé · Multimodal rapide & précis", supportsVision: true },
      { id: "gemini-4-argon", label: "Gemini 4 Argon", tag: "Puissance maximale · Raisonnement avancé", supportsVision: true },
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", tag: "Ultra-rapide & léger", supportsVision: true },
      { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", tag: "Économique & haute fréquence", supportsVision: true },
    ],
    keyStorageKey: "calo_gemini_api_key",
    modelStorageKey: "calo_gemini_model",
    keyPlaceholder: "AIzaSy...",
    keyConsoleUrl: "https://aistudio.google.com/app/apikey",
    keyConsoleName: "Google AI Studio",
    description: "Modèles multimodaux Google AI Studio. Quota gratuit très généreux pour les particuliers.",
    colorTheme: {
      badgeBg: "bg-blue-100 dark:bg-blue-900/50",
      badgeText: "text-blue-700 dark:text-blue-300",
      border: "border-blue-500",
      activeBg: "bg-blue-50 dark:bg-blue-950/40",
      text: "text-blue-600 dark:text-blue-400",
      ring: "focus-visible:ring-blue-500",
      accent: "#3b82f6",
    },
  },
  openai: {
    id: "openai",
    name: "OpenAI (ChatGPT)",
    shortName: "ChatGPT",
    badge: "Vision GPT-4o",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini", tag: "Recommandé · Vision ultra-rapide & économique", supportsVision: true },
      { id: "gpt-4o", label: "GPT-4o", tag: "Précision maximale · Vision haute résolution", supportsVision: true },
    ],
    keyStorageKey: "calo_openai_api_key",
    modelStorageKey: "calo_openai_model",
    keyPlaceholder: "sk-proj-...",
    keyConsoleUrl: "https://platform.openai.com/api-keys",
    keyConsoleName: "OpenAI Platform",
    description: "Modèles GPT-4o avec analyse d'images haute résolution et excellente reconnaissance culinaire.",
    colorTheme: {
      badgeBg: "bg-emerald-100 dark:bg-emerald-900/50",
      badgeText: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-500",
      activeBg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-600 dark:text-emerald-400",
      ring: "focus-visible:ring-emerald-500",
      accent: "#10b981",
    },
  },
  mistral: {
    id: "mistral",
    name: "Mistral AI",
    shortName: "Mistral",
    badge: "IA Européenne 🇫🇷",
    defaultModel: "pixtral-12b-2409",
    models: [
      { id: "pixtral-12b-2409", label: "Pixtral 12B", tag: "Recommandé · Modèle multimodal visuel rapide", supportsVision: true },
      { id: "pixtral-large-latest", label: "Pixtral Large", tag: "Vision haute précision pour assiettes complexes", supportsVision: true },
      { id: "mistral-small-latest", label: "Mistral Small", tag: "Modèle texte rapide pour estimations", supportsVision: false },
    ],
    keyStorageKey: "calo_mistral_api_key",
    modelStorageKey: "calo_mistral_model",
    keyPlaceholder: "...",
    keyConsoleUrl: "https://console.mistral.ai/api-keys/",
    keyConsoleName: "Mistral La Plateforme",
    description: "Champion européen de l'IA. Pixtral est spécialisé dans l'analyse conjointe d'images et de texte.",
    colorTheme: {
      badgeBg: "bg-amber-100 dark:bg-amber-900/50",
      badgeText: "text-amber-700 dark:text-amber-300",
      border: "border-amber-500",
      activeBg: "bg-amber-50 dark:bg-amber-950/40",
      text: "text-amber-600 dark:text-amber-400",
      ring: "focus-visible:ring-amber-500",
      accent: "#f59e0b",
    },
  },
};

export const DEFAULT_AI_PROVIDER: AiProvider = "gemini";

export const PROMPT_IMAGE_ANALYSIS =
  "Analyze this food image. Identify the food item and estimate its nutritional values. " +
  "IMPORTANT: Provide the response STRICTLY as a single raw JSON object. Do not wrap the JSON in ```json markdown blocks, just return raw JSON text. " +
  "The JSON keys MUST be exactly: " +
  "'name' (string, the French name of the food or dish e.g. 'Salade César', 'Pizza Reine', 'Pomme Rouge'), " +
  "'estimatedWeight' (number, the estimated portion weight in grams), " +
  "'kcalPer100g' (number, estimated calories per 100g of this item), " +
  "'proteinPer100g' (number, estimated proteins in grams per 100g), " +
  "'carbsPer100g' (number, estimated carbohydrates in grams per 100g), " +
  "'fatPer100g' (number, estimated fats/lipids in grams per 100g).";

export const getPromptTextEstimation = (query: string) =>
  `Tu es un expert en nutrition française (table CIQUAL / ANSES). Analyse l'aliment ou le plat suivant : "${query}". ` +
  "Fournis une estimation nutritionnelle précise pour 100g ainsi que le poids moyen d'une portion normale. " +
  "IMPORTANT: Réponds UNIQUEMENT avec un objet JSON brut valide (sans balises markdown) contenant exactement les clés : " +
  "'name' (string, nom clair en français ex: 'Couscous Royal', 'Croissant aux amandes'), " +
  "'estimatedWeight' (number, poids moyen d'une portion en grammes), " +
  "'kcalPer100g' (number, calories pour 100g), " +
  "'proteinPer100g' (number, protéines en g pour 100g), " +
  "'carbsPer100g' (number, glucides en g pour 100g), " +
  "'fatPer100g' (number, lipides en g pour 100g).";

/**
 * Robust JSON extraction from LLM response text
 */
export function extractAndParseJson<T = any>(rawText: string): T {
  let cleaned = rawText.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z0-9_-]*\s*/i, "").replace(/```\s*$/, "").trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

/**
 * Normalizes raw LLM output into typed and bounded AiFoodResult
 */
export function normalizeAiFoodResult(raw: any, fallbackName = "Aliment analysé"): AiFoodResult {
  return {
    name: typeof raw?.name === "string" && raw.name.trim() ? raw.name.trim() : fallbackName,
    estimatedWeight: Math.max(1, Math.round(Number(raw?.estimatedWeight) || 150)),
    kcalPer100g: Math.max(0, Math.round(Number(raw?.kcalPer100g) || 0)),
    proteinPer100g: Math.max(0, Math.round((Number(raw?.proteinPer100g) || 0) * 10) / 10),
    carbsPer100g: Math.max(0, Math.round((Number(raw?.carbsPer100g) || 0) * 10) / 10),
    fatPer100g: Math.max(0, Math.round((Number(raw?.fatPer100g) || 0) * 10) / 10),
  };
}

/**
 * Direct client/server call to Google Gemini
 */
export async function callGeminiApi({
  apiKey,
  model,
  prompt,
  base64Image,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  base64Image?: string;
}): Promise<AiFoodResult> {
  const cleanBase64 = base64Image ? base64Image.replace(/^data:image\/\w+;base64,/, "") : null;
  const parts: any[] = [];

  if (cleanBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64,
      },
    });
  }
  parts.push({ text: prompt });

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  const modelsToTry = Array.from(
    new Set([
      model.trim() || AI_PROVIDERS.gemini.defaultModel,
      AI_PROVIDERS.gemini.defaultModel,
      "gemini-4-argon",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
    ])
  );

  let lastErrorMsg = "";
  for (const currentModel of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          currentModel
        )}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData.error?.message || `Erreur Gemini (${response.status})`;
        if (response.status === 404 || msg.toLowerCase().includes("not found")) {
          lastErrorMsg = msg;
          continue;
        }
        throw new Error(msg);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("L'API Gemini a retourné une réponse vide.");
      }

      const parsed = extractAndParseJson(text);
      return normalizeAiFoodResult(parsed, "Aliment détecté (Gemini)");
    } catch (err: any) {
      lastErrorMsg = err.message || "Erreur de connexion à Gemini";
      if (!err.message?.includes("404") && !err.message?.toLowerCase().includes("not found")) {
        throw err;
      }
    }
  }

  throw new Error(lastErrorMsg || "Impossible de contacter l'API Gemini avec les modèles disponibles.");
}

/**
 * Direct client/server call to OpenAI (ChatGPT)
 */
export async function callOpenAiApi({
  apiKey,
  model,
  prompt,
  base64Image,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  base64Image?: string;
}): Promise<AiFoodResult> {
  const activeModel = model.trim() || AI_PROVIDERS.openai.defaultModel;
  let userContent: any;

  if (base64Image) {
    const fullDataUrl = base64Image.startsWith("data:")
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`;
    userContent = [
      { type: "text", text: prompt },
      {
        type: "image_url",
        image_url: {
          url: fullDataUrl,
          detail: "auto",
        },
      },
    ];
  } else {
    userContent = prompt;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: activeModel,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const msg = errData.error?.message || `Erreur OpenAI (${response.status})`;
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("L'API OpenAI a retourné une réponse vide.");
  }

  const parsed = extractAndParseJson(text);
  return normalizeAiFoodResult(parsed, "Aliment détecté (ChatGPT)");
}

/**
 * Direct client/server call to Mistral AI (Pixtral / Mistral)
 */
export async function callMistralApi({
  apiKey,
  model,
  prompt,
  base64Image,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  base64Image?: string;
}): Promise<AiFoodResult> {
  const activeModel = model.trim() || AI_PROVIDERS.mistral.defaultModel;
  let userContent: any;

  if (base64Image) {
    const fullDataUrl = base64Image.startsWith("data:")
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`;
    userContent = [
      { type: "text", text: prompt },
      {
        type: "image_url",
        image_url: fullDataUrl,
      },
    ];
  } else {
    userContent = prompt;
  }

  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: activeModel,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const msg = errData.error?.message || `Erreur Mistral (${response.status})`;
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("L'API Mistral a retourné une réponse vide.");
  }

  const parsed = extractAndParseJson(text);
  return normalizeAiFoodResult(parsed, "Aliment détecté (Mistral)");
}

/**
 * Unified food image analysis orchestrator
 */
export async function analyzeFoodImage({
  provider,
  apiKey,
  model,
  base64Image,
}: {
  provider: AiProvider;
  apiKey: string;
  model: string;
  base64Image: string;
}): Promise<AiFoodResult> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error(`Clé API manquante pour ${AI_PROVIDERS[provider].name}.`);
  }

  switch (provider) {
    case "gemini":
      return callGeminiApi({
        apiKey,
        model,
        prompt: PROMPT_IMAGE_ANALYSIS,
        base64Image,
      });

    case "openai":
      return callOpenAiApi({
        apiKey,
        model,
        prompt: PROMPT_IMAGE_ANALYSIS,
        base64Image,
      });

    case "mistral":
      return callMistralApi({
        apiKey,
        model,
        prompt: PROMPT_IMAGE_ANALYSIS,
        base64Image,
      });

    default:
      throw new Error(`Fournisseur d'IA non supporté: ${provider}`);
  }
}

/**
 * Unified food text estimation orchestrator
 */
export async function analyzeFoodText({
  provider,
  apiKey,
  model,
  query,
}: {
  provider: AiProvider;
  apiKey: string;
  model: string;
  query: string;
}): Promise<AiFoodResult> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error(`Clé API manquante pour ${AI_PROVIDERS[provider].name}.`);
  }

  const prompt = getPromptTextEstimation(query.trim());

  switch (provider) {
    case "gemini":
      return callGeminiApi({
        apiKey,
        model,
        prompt,
      });

    case "openai":
      return callOpenAiApi({
        apiKey,
        model,
        prompt,
      });

    case "mistral":
      return callMistralApi({
        apiKey,
        model,
        prompt,
      });

    default:
      throw new Error(`Fournisseur d'IA non supporté: ${provider}`);
  }
}
