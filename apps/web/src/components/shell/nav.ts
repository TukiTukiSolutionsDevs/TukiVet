import {
  BarChart3,
  BedDouble,
  Calendar,
  ClipboardList,
  Contact,
  FileText,
  Home,
  MessageCircle,
  Package,
  PawPrint,
  Receipt,
  Scissors,
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
  { href: "/clientes", label: "Clientes", icon: Contact },
  { href: "/encuentros", label: "Encuentros", icon: Stethoscope },
  { href: "/peluqueria", label: "Peluquería", icon: Scissors },
  { href: "/hospedaje", label: "Hospedaje", icon: BedDouble },
  { href: "/vacunas", label: "Vacunas", icon: Syringe },
  { href: "/recetas", label: "Recetas", icon: FileText },
  { href: "/inventario", label: "Inventario", icon: Package },
  { href: "/pos", label: "POS y caja", icon: Wallet },
  { href: "/comprobantes", label: "Comprobantes", icon: Receipt },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/comunicaciones", label: "Comunicaciones", icon: MessageCircle },
  { href: "/equipo", label: "Equipo", icon: Users },
  { href: "/auditoria", label: "Auditoría", icon: ClipboardList },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];
