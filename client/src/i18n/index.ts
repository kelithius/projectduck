import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import zh_tw from './locales/zh_tw.json';
import en from './locales/en.json';

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