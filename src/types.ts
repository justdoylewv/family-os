export type EventCategory =
  | 'family'
  | 'kids'
  | 'parents'
  | 'medical'
  | 'school'
  | 'work'
  | 'other';

export interface Member {
  id: string;
  name: string;
  points: number;
  avatar_color: string;
  sort_order?: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  category: EventCategory;
  assigned_to_member_id?: string | null;
  google_event_id?: string | null;
}

export interface GroceryItem {
  id: string;
  text: string;
  completed: boolean;
  aisle: string;
}

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Chore {
  id: string;
  text: string;
  completed: boolean;
  assigned_to_member_id?: string | null;
  points: number;
  due_date?: string | null;
  recurrence: Recurrence;
}

export interface Reward {
  id: string;
  points: number;
  description: string;
  sort_order?: number;
}

export interface MealPlan {
  day: string;
  lunch: string;
  dinner: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  sort_order?: number;
}

export type View = 'dashboard' | 'calendar' | 'groceries' | 'meals' | 'info' | 'chores';
