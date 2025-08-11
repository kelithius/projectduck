'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh_tw from '../../public/locales/zh_tw/common.json';
import en from '../../public/locales/en/common.json';

const resources = {
  'zh-tw': {
    translation: zh_tw,
  },
  en: {
    translation: en,
  },
};

// 自動偵測語言功能
const getDetectedLanguage = (): string => {
  if (typeof window === 'undefined') {
    // SSR 環境下返回預設語言
    return 'en';
  }

  // 檢查 localStorage 中是否有儲存的語言偏好
  const savedLanguage = localStorage.getItem('i18nextLng');
  if (savedLanguage && ['zh-tw', 'en'].includes(savedLanguage)) {
    return savedLanguage;
  }

  // 檢查瀏覽器語言設定
  const browserLanguages = navigator.languages || [navigator.language];
  
  for (const lang of browserLanguages) {
    const normalizedLang = lang.toLowerCase();
    
    // 英文偵測 (先檢查英文，因為更常見)
    if (normalizedLang.startsWith('en')) {
      return 'en';
    }
    
    // 繁體中文偵測 (Taiwan, Hong Kong, Macau)
    if (normalizedLang.includes('zh-tw') || 
        normalizedLang.includes('zh-hk') || 
        normalizedLang.includes('zh-mo') ||
        normalizedLang === 'zh-hant') {
      return 'zh-tw';
    }
    
    // 簡體中文也映射到繁體中文
    if (normalizedLang.includes('zh-cn') || 
        normalizedLang.includes('zh-sg') ||
        normalizedLang === 'zh-hans' ||
        normalizedLang === 'zh') {
      return 'zh-tw';
    }
  }

  // 預設為英文 (對國際用戶更友善)
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDetectedLanguage(),
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    // 支援的語言
    supportedLngs: ['zh-tw', 'en'],
    
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;