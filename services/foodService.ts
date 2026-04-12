const OFF_BASE = "https://world.openfoodfacts.org";
const OFF_USER_AGENT = "CaloTrack - WebApp - Version 1.0";
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_API_KEY = "SBFfcU1dYSIQkGUKBUstxhJUkJVim2DqaWbnBd0J";

// ─── Helpers ────────────────────────────────────────────────────────────────

const safeJson = async (response: Response): Promise<any | null> => {
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("application/json") && !ct.includes("text/json")) {
    console.warn("API: réponse non-JSON (content-type:", ct, ")");
    return null;
  }
  try {
    return await response.json();
  } catch (e) {
    console.warn("API: échec du parsing JSON", e);
    return null;
  }
};

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OFFProduct { ... }
export interface UnifiedProduct { ... }

// ─── etc. (voir fichier complet ci-dessus)
