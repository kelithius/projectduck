'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh_tw from '../../public/locales/zh_tw/common.json';
import en from '../../public/locales/en/common.json';

const resources = {
  zh_tw: {
    translation: zh_tw,
  },
  en: {
    translation: en,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh_tw',
    fallbackLng: 'zh_tw',
    debug: false,
    
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;