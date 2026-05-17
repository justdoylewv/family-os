import { LayoutDashboard, Calendar, ShoppingCart, Utensils, Info, Trophy, Users } from 'lucide-react';
import type { EventCategory, View } from './types';

export const NAV_ITEMS = [
  { id: 'dashboard' as View, label: 'Home', icon: <LayoutDashboard size={28} /> },
  { id: 'calendar' as View, label: 'Calendar', icon: <Calendar size={28} /> },
  { id: 'groceries' as View, label: 'Groceries', icon: <ShoppingCart size={28} /> },
  { id: 'chores' as View, label: 'Chores', icon: <Trophy size={28} /> },
  { id: 'meals' as View, label: 'Meals', icon: <Utensils size={28} /> },
  { id: 'members' as View, label: 'Family', icon: <Users size={28} /> },
  { id: 'info' as View, label: 'Info Hub', icon: <Info size={28} /> },
];

export const EVENT_CATEGORIES: EventCategory[] = [
  'family',
  'kids',
  'parents',
  'medical',
  'school',
  'work',
  'other',
];

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  family: 'bg-blue-500',
  kids: 'bg-green-500',
  parents: 'bg-purple-500',
  medical: 'bg-red-500',
  school: 'bg-yellow-500',
  work: 'bg-indigo-500',
  other: 'bg-gray-500',
};

export const MEMBER_COLORS = [
  'bg-blue-500',
  'bg-pink-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-rose-500',
  'bg-amber-500',
];

export const AISLES = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen', 'Household', 'Other'];

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
