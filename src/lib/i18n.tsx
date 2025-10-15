"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zh_tw from "../../public/locales/zh_tw/common.json";
import en from "../../public/locales/en/common.json";

const resources = {
  "zh-tw": {
    translation: zh_tw,
  },
  en: {
    translation: en,
  },
};

// Automatic language detection feature
const getDetectedLanguage = (): string => {
  if (typeof window === "undefined") {
    // Return default language in SSR environment
    return "en";
  }

  // Check if there's a saved language preference in localStorage
  const savedLanguage = localStorage.getItem("i18nextLng");
  if (savedLanguage && ["zh-tw", "en"].includes(savedLanguage)) {
    return savedLanguage;
  }

  // Check browser language settings
  const browserLanguages = navigator.languages || [navigator.language];

  for (const lang of browserLanguages) {
    const normalizedLang = lang.toLowerCase();

    // English detection (check English first as it's more common)
    if (normalizedLang.startsWith("en")) {
      return "en";
    }

    // Traditional Chinese detection (Taiwan, Hong Kong, Macau)
    if (
      normalizedLang.includes("zh-tw") ||
      normalizedLang.includes("zh-hk") ||
      normalizedLang.includes("zh-mo") ||
      normalizedLang === "zh-hant"
    ) {
      return "zh-tw";
    }

    // Simplified Chinese also maps to Traditional Chinese
    if (
      normalizedLang.includes("zh-cn") ||
      normalizedLang.includes("zh-sg") ||
      normalizedLang === "zh-hans" ||
      normalizedLang === "zh"
    ) {
      return "zh-tw";
    }
  }

  // Default to English (more friendly for international users)
  return "en";
};

i18n.use(initReactI18next).init({
  resources,
  lng: getDetectedLanguage(),
  fallbackLng: "en",
  debug: process.env.NODE_ENV === "development",

  // Supported languages
  supportedLngs: ["zh-tw", "en"],

  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
