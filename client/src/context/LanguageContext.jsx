import { createContext, useContext, useState } from 'react';

const translations = {
  en: {
    book: 'Book', myTrips: 'My Trips', selectServices: 'Select services', journeyDetails: 'Journey details',
    confirmBooking: 'Confirm booking', heroA: 'Travel with', heroB: 'confidence.',
    heroSub: 'Pick services, book in seconds, track your assistant live.',
    verified: 'Verified assistants', station: 'Station', date: 'Date', time: 'Time',
    active: 'Active', history: 'History', viewLive: 'View live', cancel: 'Cancel',
    noActive: 'No active bookings.', bookFirst: 'Book your first trip', noHistory: 'No past trips yet.',
    settings: 'Settings', language: 'Language', appearance: 'Appearance', light: 'Light', dark: 'Dark',
    logout: 'Logout', safety: 'Safety', help: 'Help & Support', myJobs: 'My Jobs',
    earnings: 'Earnings & History', account: 'Account', role: 'Role',
  },
  te: {
    book: 'బుక్', myTrips: 'నా ప్రయాణాలు', selectServices: 'సేవలను ఎంచుకోండి', journeyDetails: 'ప్రయాణ వివరాలు',
    confirmBooking: 'బుకింగ్ కన్ఫర్మ్ చేయండి', heroA: 'ప్రయాణించండి', heroB: 'నమ్మకంతో.',
    heroSub: 'సేవలు ఎంచుకోండి, సెకన్లలో బుక్ చేయండి, అసిస్టెంట్‌ను లైవ్‌గా ట్రాక్ చేయండి.',
    verified: 'ధృవీకరించిన అసిస్టెంట్లు', station: 'స్టేషన్', date: 'తేదీ', time: 'సమయం',
    active: 'యాక్టివ్', history: 'చరిత్ర', viewLive: 'లైవ్ చూడండి', cancel: 'రద్దు',
    noActive: 'యాక్టివ్ బుకింగ్‌లు లేవు.', bookFirst: 'మీ మొదటి ప్రయాణం బుక్ చేయండి', noHistory: 'ఇంకా ప్రయాణాలు లేవు.',
    settings: 'సెట్టింగ్‌లు', language: 'భాష', appearance: 'థీమ్', light: 'లైట్', dark: 'డార్క్',
    logout: 'లాగ్ అవుట్', safety: 'భద్రత', help: 'సహాయం & మద్దతు', myJobs: 'నా జాబ్స్',
    earnings: 'ఆదాయం & చరిత్ర', account: 'ఖాతా', role: 'పాత్ర',
  },
  hi: {
    book: 'बुक', myTrips: 'मेरी यात्राएँ', selectServices: 'सेवाएँ चुनें', journeyDetails: 'यात्रा विवरण',
    confirmBooking: 'बुकिंग पक्की करें', heroA: 'यात्रा करें', heroB: 'भरोसे के साथ.',
    heroSub: 'सेवाएँ चुनें, सेकंडों में बुक करें, असिस्टेंट को लाइव ट्रैक करें.',
    verified: 'सत्यापित असिस्टेंट', station: 'स्टेशन', date: 'तारीख', time: 'समय',
    active: 'सक्रिय', history: 'इतिहास', viewLive: 'लाइव देखें', cancel: 'रद्द करें',
    noActive: 'कोई सक्रिय बुकिंग नहीं.', bookFirst: 'अपनी पहली यात्रा बुक करें', noHistory: 'अभी तक कोई यात्रा नहीं.',
    settings: 'सेटिंग्स', language: 'भाषा', appearance: 'थीम', light: 'लाइट', dark: 'डार्क',
    logout: 'लॉग आउट', safety: 'सुरक्षा', help: 'सहायता और समर्थन', myJobs: 'मेरे काम',
    earnings: 'कमाई और इतिहास', account: 'खाता', role: 'भूमिका',
  },
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('rm-lang') || 'en');
  const t = (key) => translations[lang]?.[key] || translations.en[key] || key;
  const setLanguage = (l) => { setLang(l); localStorage.setItem('rm-lang', l); };
  return <LanguageContext.Provider value={{ lang, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
