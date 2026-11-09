export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Fase en la que se habilita. Sin valor = disponible. */
  phase?: number;
}

export type IconName = "home" | "palette" | "plug" | "sparkles" | "puzzle" | "chart" | "settings" | "globe";

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: "home" },
  { href: "/brand-kit", label: "Brand Kit", icon: "palette" },
  { href: "/integrations", label: "Ecommerce", icon: "plug", phase: 4 },
  { href: "/discovery", label: "Nueva landing", icon: "sparkles", phase: 2 },
  { href: "/toppings", label: "Toppings", icon: "puzzle", phase: 6 },
  { href: "/analytics", label: "Analytics", icon: "chart", phase: 8 },
  { href: "/settings", label: "Configuración", icon: "settings" },
];
