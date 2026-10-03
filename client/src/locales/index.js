// client/src/locales/index.js
import en from './en';
import te from './te';
import hi from './hi';

export const translations = {
  en,
  te,
  hi
};

export const SUPPORTED_LANGUAGES = [
  { id: 'en', label: 'English', nativeName: 'English' },
  { id: 'te', label: 'తెలుగు', nativeName: 'తెలుగు' },
  { id: 'hi', label: 'हिन्दी', nativeName: 'हिन्दी' }
];

export default translations;
