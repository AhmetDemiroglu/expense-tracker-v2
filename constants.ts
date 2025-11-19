import { Category } from './types';

export const INCOME_CATEGORIES = [
  Category.MAAS,
  Category.FREELANCE,
  Category.YATIRIM,
  Category.DIGER_GELIR
];

export const EXPENSE_CATEGORIES = [
  Category.GIDA,
  Category.ULASIM,
  Category.KONUT,
  Category.FATURA,
  Category.SAGLIK,
  Category.EGITIM,
  Category.EGLENCE,
  Category.GIYIM,
  Category.TEKNOLOJI,
  Category.DIGER_GIDER
];

export const COLORS = {
  income: '#10b981', // emerald-500
  expense: '#ef4444', // red-500
  primary: '#6366f1', // indigo-500
  background: '#1e293b', // slate-800
  text: '#f1f5f9' // slate-100
};

export const PIE_COLORS = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ef4444', // red
  '#14b8a6', // teal
];