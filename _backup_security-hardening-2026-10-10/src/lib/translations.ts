// Language Translation Dictionary & Hook for Zovik AI
// Supports English (en), Roman Urdu (ru), and Urdu (ur)

export type LanguageCode = "en" | "ru" | "ur";

export interface Translations {
  girls: string;
  boys: string;
  anime: string;
  searchPlaceholder: string;
  getApp: string;
  login: string;
  logout: string;
  chatNow: string;
  unlockVip: string;
  backstory: string;
  traits: string;
  album: string;
  shareChar: string;
  linkCopied: string;
  deleteCustom: string;
  voiceNote: string;
  playingAudio: string;
  notificationsEnabled: string;
  testNotification: string;
  vipOnly: string;
  freeForAll: string;
}

export const translations: Record<LanguageCode, Translations> = {
  en: {
    girls: "Girls",
    boys: "Boys",
    anime: "Anime",
    searchPlaceholder: "Search characters...",
    getApp: "Get App",
    login: "Log In",
    logout: "Log Out",
    chatNow: "Chat Now",
    unlockVip: "Unlock VIP Chat 👑",
    backstory: "Backstory",
    traits: "Traits & Persona",
    album: "Photo Album",
    shareChar: "Share Character",
    linkCopied: "Link Copied!",
    deleteCustom: "Delete Custom Companion",
    voiceNote: "Voice Note",
    playingAudio: "Playing...",
    notificationsEnabled: "Companion Alerts ON",
    testNotification: "Test Companion Alert",
    vipOnly: "Plus & VIP Only",
    freeForAll: "Free for All",
  },
  ru: {
    girls: "Larkiyan",
    boys: "Larkay",
    anime: "Anime",
    searchPlaceholder: "Companions talash karein...",
    getApp: "App Hasil Karein",
    login: "Log In Karein",
    logout: "Log Out",
    chatNow: "Abhi Chat Karein",
    unlockVip: "VIP Chat Unlock Karein 👑",
    backstory: "Kahani & Persona",
    traits: "Khasusiyat & Mizaj",
    album: "Photo Album",
    shareChar: "Share Karein",
    linkCopied: "Link Copy Ho Gaya!",
    deleteCustom: "Custom Companion Delete Karein",
    voiceNote: "Voice Note Suno",
    playingAudio: "Bol rahi hai...",
    notificationsEnabled: "Pyar Bhari Alerts ON",
    testNotification: "Test Alert Bhejo",
    vipOnly: "Plus aur VIP Khas",
    freeForAll: "Sab ke Liye Free",
  },
  ur: {
    girls: "لڑکیاں",
    boys: "لڑکے",
    anime: "اینیمی",
    searchPlaceholder: "ساتھی تلاش کریں...",
    getApp: "ایپ حاصل کریں",
    login: "لاگ ان",
    logout: "لاگ آؤٹ",
    chatNow: "ابھی بات کریں",
    unlockVip: "وی آئی پی چیٹ کھولیں 👑",
    backstory: "پس منظر اور کہانی",
    traits: "خصوصیات اور مزاج",
    album: "تصویری البم",
    shareChar: "شیئر کریں",
    linkCopied: "لنک کاپی ہو گیا!",
    deleteCustom: "حذف کریں",
    voiceNote: "وائس نوٹ سنیں",
    playingAudio: "آواز جاری ہے...",
    notificationsEnabled: "اطلاعات فعال ہیں",
    testNotification: "الرٹ ٹیسٹ کریں",
    vipOnly: "پلس اور وی آئی پی",
    freeForAll: "سب کے لیے مفت",
  },
};

export const LANGUAGE_STORAGE_KEY = "zovik_lang";

export function getCurrentLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved === "ru" || saved === "ur" || saved === "en") return saved;
  return "en";
}

export function setLanguage(lang: LanguageCode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent("zovik_lang_changed", { detail: lang }));
}

export function getT(lang?: LanguageCode): Translations {
  const current = lang || getCurrentLanguage();
  return translations[current] || translations.en;
}
