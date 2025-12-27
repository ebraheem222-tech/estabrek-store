import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  lng: "ar",
  fallbackLng: "ar",
  resources: {
    ar: {
      translation: {
        appName: "لوحة إدارة متجر إستبرك",
        login: "تسجيل الدخول",
        orders: "الطلبات",
        status: "الحالة",
        actions: "إجراءات",
      },
    },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
