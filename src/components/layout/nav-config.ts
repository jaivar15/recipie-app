import type { LucideIcon } from "lucide-react";
import {
  Home,
  BookOpen,
  PlusCircle,
  Tags,
  Carrot,
  Activity,
  CalendarDays,
  ShoppingCart,
  Users,
  Settings,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const primaryNav: NavItem[] = [
  { title: "Home", href: "/", icon: Home },
  { title: "Recipe Library", href: "/recipes", icon: BookOpen },
  { title: "Add Recipe", href: "/recipes/new", icon: PlusCircle },
  { title: "Categories", href: "/categories", icon: Tags },
  { title: "Ingredients", href: "/ingredients", icon: Carrot },
  { title: "Nutrition", href: "/nutrition", icon: Activity },
  { title: "Meal Planner", href: "/meal-planner", icon: CalendarDays },
  { title: "Shopping Lists", href: "/shopping-lists", icon: ShoppingCart },
];

export const secondaryNav: NavItem[] = [
  { title: "Family", href: "/family", icon: Users },
  { title: "Settings", href: "/settings", icon: Settings },
];
