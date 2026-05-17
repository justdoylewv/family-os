
import React from 'react';
import { LayoutDashboard, Calendar, ShoppingCart, Utensils, Info, Trophy } from 'lucide-react';
import { Category, View } from './types';

export const NAV_ITEMS = [
  { id: 'dashboard' as View, label: 'Home', icon: <LayoutDashboard size={28} /> },
  { id: 'calendar' as View, label: 'Calendar', icon: <Calendar size={28} /> },
  { id: 'groceries' as View, label: 'Groceries', icon: <ShoppingCart size={28} /> },
  { id: 'chores' as View, label: 'Chores', icon: <Trophy size={28} /> },
  { id: 'meals' as View, label: 'Meals', icon: <Utensils size={28} /> },
  { id: 'info' as View, label: 'Info Hub', icon: <Info size={28} /> },
];

export const CATEGORY_COLORS: Record<Category, string> = {
  [Category.FAMILY]: 'bg-blue-500',
  [Category.WORK]: 'bg-purple-500',
  [Category.KIDS]: 'bg-green-500',
  [Category.BILLS]: 'bg-red-500',
};

export const AISLES = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen', 'Household', 'Other'];
