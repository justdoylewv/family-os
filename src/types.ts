
export enum Category {
  FAMILY = 'Family',
  WORK = 'Work',
  KIDS = 'Kids',
  BILLS = 'Bills'
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  category: Category;
}

export interface GroceryItem {
  id: string;
  text: string;
  completed: boolean;
  aisle: string;
}

export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  assignedTo?: string;
  points: number;
  dueDate?: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
}

export interface Member {
  id: string;
  name: string;
  points: number;
  avatarColor: string;
}

export interface MealPlan {
  day: string;
  lunch: string;
  dinner: string;
}

export type View = 'dashboard' | 'calendar' | 'groceries' | 'meals' | 'info' | 'chores';
