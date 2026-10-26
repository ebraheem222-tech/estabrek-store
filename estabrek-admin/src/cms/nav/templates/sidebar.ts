import type { NavTemplate } from "../types";

export const SIDEBAR_NAV: NavTemplate[] = [
  {
    id: "nav-sidebar-light",
    name: "Sidebar Light",
    nameAr: "شريط جانبي فاتح",
    category: "sidebar",
    styles: {
      nav: "fixed inset-y-0 right-0 w-64 bg-white border-l border-gray-200 flex flex-col",
      container: "flex-1 flex flex-col",
      logo: "text-xl font-bold text-gray-900 p-6 border-b border-gray-200",
      links: "flex-1 flex flex-col py-4",
      link: "text-gray-600 text-sm font-medium px-6 py-3 transition-colors duration-200",
      linkHover: "hover:bg-gray-100 hover:text-gray-900",
      linkActive: "bg-blue-50 text-blue-600 border-l-4 border-blue-600",
      button: "mx-6 mb-6 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium text-center hover:bg-blue-700 transition-colors",
    },
  },
  {
    id: "nav-sidebar-dark",
    name: "Sidebar Dark",
    nameAr: "شريط جانبي داكن",
    category: "sidebar",
    styles: {
      nav: "fixed inset-y-0 right-0 w-64 bg-gray-900 flex flex-col",
      container: "flex-1 flex flex-col",
      logo: "text-xl font-bold text-white p-6 border-b border-gray-800",
      links: "flex-1 flex flex-col py-4",
      link: "text-gray-400 text-sm font-medium px-6 py-3 transition-colors duration-200",
      linkHover: "hover:bg-gray-800 hover:text-white",
      linkActive: "bg-gray-800 text-white border-l-4 border-blue-500",
      button: "mx-6 mb-6 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium text-center hover:bg-blue-700 transition-colors",
    },
  },
  {
    id: "nav-sidebar-gradient",
    name: "Sidebar Gradient",
    nameAr: "شريط جانبي متدرج",
    category: "sidebar",
    styles: {
      nav: "fixed inset-y-0 right-0 w-64 bg-gradient-to-b from-purple-900 to-indigo-900 flex flex-col",
      container: "flex-1 flex flex-col",
      logo: "text-xl font-bold text-white p-6",
      links: "flex-1 flex flex-col py-4",
      link: "text-purple-200/70 text-sm font-medium px-6 py-3 transition-colors duration-200",
      linkHover: "hover:bg-white/10 hover:text-white",
      linkActive: "bg-white/20 text-white",
      button: "mx-6 mb-6 bg-white text-purple-900 px-4 py-2 rounded-lg text-sm font-bold text-center hover:bg-purple-100 transition-colors",
    },
  },
  {
    id: "nav-sidebar-compact",
    name: "Sidebar Compact",
    nameAr: "شريط جانبي مضغوط",
    category: "sidebar",
    styles: {
      nav: "fixed inset-y-0 right-0 w-20 bg-gray-900 flex flex-col items-center",
      container: "flex-1 flex flex-col items-center",
      logo: "text-2xl font-bold text-white py-6",
      links: "flex-1 flex flex-col items-center py-4 gap-2",
      link: "text-gray-400 p-3 rounded-xl transition-colors duration-200",
      linkHover: "hover:bg-gray-800 hover:text-white",
      linkActive: "bg-blue-600 text-white",
    },
  },
];

