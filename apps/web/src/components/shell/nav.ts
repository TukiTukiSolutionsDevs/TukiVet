import {
  BarChart3,
  Calendar,
  FileText,
  Home,
  MessageCircle,
  Package,
  PawPrint,
  Receipt,
  Settings,
  Stethoscope,
  Syringe,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/pacientes", label: "Pacientes", icon: PawPrint },
  { href: "/encuentros", label: "Encuentros", icon: Stethoscope },
  { href: "/vacunas", label: "Vacunas", icon: Syringe },
  { href: "/recetas", label: "Recetas", icon: FileText },
  { href: "/inventario", label: "Inventario", icon: Package },
  { href: "/pos", label: "POS y caja", icon: Wallet },
  { href: "/comprobantes", label: "Comprobantes", icon: Receipt },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/comunicaciones", label: "Comunicaciones", icon: MessageCircle },
  { href: "/equipo", label: "Equipo", icon: Users },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];
