import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  HeartPulse,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  Stethoscope,
  Syringe,
  Quote,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicHeader } from "@/components/marketing/public-header";

const STATS = [
  { value: "12.4k+", label: "pacientes atendidos" },
  { value: "15 años", label: "de experiencia" },
  { value: "4.9★", label: "valoración Google" },
  { value: "8", label: "veterinarios titulados" },
];

const SERVICES = [
  {
    icon: Stethoscope,
    title: "Consultas",
    body: "Revisión clínica completa con historia médica digital y plan de seguimiento.",
  },
  {
    icon: Syringe,
    title: "Vacunación",
    body: "Calendario por especie con recordatorios automáticos por WhatsApp.",
  },
  {
    icon: HeartPulse,
    title: "Cirugía",
    body: "Esterilización, ortopedia y blandos con anestesia inhalatoria.",
  },
  {
    icon: ShieldCheck,
    title: "Emergencias",
    body: "Atención de urgencias con derivación a hospitalización 24/7.",
  },
  {
    icon: CalendarCheck,
    title: "Hospitalización",
    body: "Monitoreo continuo, fluidoterapia y reporte diario a los tutores.",
  },
  {
    icon: HeartPulse,
    title: "Grooming",
    body: "Baño medicado, corte de raza y cuidado de uñas, oídos y glándulas.",
  },
];

const TEAM = [
  {
    name: "Dra. Camila Rojas",
    role: "Directora médica · Medicina interna",
    cmvp: "CMVP-12345",
  },
  {
    name: "Dr. Luis Alarcón",
    role: "Cirugía y traumatología",
    cmvp: "CMVP-23456",
  },
  {
    name: "Dra. Sofía Ramírez",
    role: "Dermatología y oncología",
    cmvp: "CMVP-34567",
  },
  {
    name: "Dr. Diego Mendoza",
    role: "Felinos y exóticos",
    cmvp: "CMVP-45678",
  },
];

const TESTIMONIALS = [
  {
    name: "María Huamán",
    pet: "Rocky · Labrador",
    quote:
      "Atendieron a Rocky una emergencia un domingo. Profesionales, claros y nos avisaban todo por WhatsApp.",
  },
  {
    name: "José Castillo",
    pet: "Mishi · Gato",
    quote:
      "El portal me deja ver las vacunas y reservar citas sin llamar. Muy práctico.",
  },
  {
    name: "Carla Vega",
    pet: "Max · Bulldog Francés",
    quote:
      "Operaron a Max y la recuperación fue impecable. Recomendadísimos.",
  },
];

const SCHEDULE = [
  { label: "Lun – Vie", hours: "08:00 – 21:00" },
  { label: "Sábado", hours: "08:00 – 19:00" },
  { label: "Domingo", hours: "09:00 – 14:00 · Emergencias 24h" },
];

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      {/* 1. Hero */}
      <section className="border-b border-border/60 bg-gradient-to-b from-[var(--primary-50)] to-background">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2">
          <div>
            <Badge className="mb-5 bg-primary/10 text-primary hover:bg-primary/15">
              San Borja · Lima
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Cuidamos a quienes más amás.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Veterinaria con historia clínica digital, recordatorios por
              WhatsApp y portal para tutores. Reserva online en segundos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/portal" className={buttonVariants({ size: "lg" })}>
                Reservar cita online
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#servicios"
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                Ver servicios
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-3xl bg-primary/10 blur-2xl" />
            <Card className="overflow-hidden border-primary/20 bg-card p-0">
              <div className="aspect-[4/3] bg-gradient-to-br from-primary/15 via-primary/5 to-accent/15">
                <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                  <span className="text-7xl">🐾</span>
                  <p className="text-sm font-medium text-muted-foreground">
                    Fotos del consultorio
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 2. Banda de confianza */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {s.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Servicios */}
      <section id="servicios" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Servicios veterinarios
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Todo lo que tu mascota necesita, en un solo lugar.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map(({ icon: Icon, title, body }) => (
              <Card
                key={title}
                className="group gap-3 p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="text-lg font-bold tracking-tight">{title}</div>
                <p className="text-sm text-muted-foreground">{body}</p>
                <Link
                  href="/portal"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  Agendar
                  <ArrowRight className="size-3.5" />
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Equipo */}
      <section id="equipo" className="border-y border-border bg-secondary/40 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Nuestro equipo
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Veterinarios titulados con colegiatura CMVP vigente.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((v) => (
              <Card key={v.name} className="gap-3 p-6 text-center">
                <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/15 text-2xl font-bold text-primary">
                  {v.name
                    .replace("Dr. ", "")
                    .replace("Dra. ", "")
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <div className="text-base font-bold">{v.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {v.role}
                  </div>
                  <div className="mt-2 text-[11px] font-semibold tracking-wide text-primary">
                    {v.cmvp}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Sobre nosotros */}
      <section className="py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Una clínica moderna con corazón de barrio.
            </h2>
            <p className="mt-5 text-base text-muted-foreground">
              Desde 2010 atendemos a las familias de San Borja con tecnología
              veterinaria de primer nivel y trato cercano. Trabajamos con
              historia clínica digital, recordatorios automáticos y
              comprobantes electrónicos SUNAT.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                "Historia clínica digital con respaldo en la nube",
                "Recordatorios por WhatsApp opt-in",
                "Boletas y facturas electrónicas (SUNAT)",
                "Cumplimiento Ley 29733 (protección de datos)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 flex-shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-accent/10 blur-2xl" />
            <Card className="overflow-hidden p-0">
              <div className="aspect-[4/3] bg-gradient-to-br from-accent/20 via-secondary to-primary/10">
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Foto del local
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 6. Ubicación */}
      <section
        id="ubicacion"
        className="border-y border-border bg-secondary/40 py-20"
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-[1fr_320px]">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Visítanos
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Estamos a una cuadra del Parque Loyola.
            </p>
            <Card className="mt-6 overflow-hidden p-0">
              <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-primary/10 via-secondary to-accent/10 text-sm text-muted-foreground">
                Mapa embebido
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="gap-3 p-5">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 flex-shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-bold">Dirección</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Av. Larco 123, San Borja, Lima
                  </div>
                </div>
              </div>
            </Card>

            <Card className="gap-3 p-5">
              <div className="flex items-start gap-3">
                <CalendarCheck className="mt-0.5 size-5 flex-shrink-0 text-primary" />
                <div className="flex-1">
                  <div className="text-sm font-bold">Horarios</div>
                  <dl className="mt-2 space-y-1 text-sm">
                    {SCHEDULE.map((s) => (
                      <div
                        key={s.label}
                        className="flex justify-between gap-3"
                      >
                        <dt className="text-muted-foreground">{s.label}</dt>
                        <dd className="font-medium">{s.hours}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </Card>

            <a
              href="https://wa.me/51999999999"
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-3 rounded-xl border border-success/40 bg-[var(--success-bg)] px-4 py-3 text-sm font-semibold text-success transition-colors hover:bg-success/15"
            >
              <MessageCircle className="size-5" />
              <span className="flex-1">Escríbenos por WhatsApp</span>
              <Phone className="size-4" />
            </a>
          </div>
        </div>
      </section>

      {/* 7. Testimonios */}
      <section id="testimonios" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight">
              Familias que confían en nosotros
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="gap-4 p-6">
                <Quote className="size-6 text-primary/50" />
                <p className="text-sm text-foreground/90">“{t.quote}”</p>
                <div className="mt-2 flex items-center gap-3 border-t border-border pt-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                    {t.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.pet}
                    </div>
                  </div>
                  <div className="ml-auto flex gap-0.5 text-warning">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-current" />
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg">
                🐾
              </span>
              <span className="text-lg font-extrabold">TukiVet</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Veterinaria con historia clínica digital, recordatorios y
              comprobantes SUNAT.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              TukiTuki Solutions SAC · RUC 20613614509
            </p>
          </div>
          <div>
            <div className="text-sm font-bold">Producto</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#servicios" className="hover:text-foreground">
                  Servicios
                </Link>
              </li>
              <li>
                <Link href="#equipo" className="hover:text-foreground">
                  Equipo
                </Link>
              </li>
              <li>
                <Link href="/portal" className="hover:text-foreground">
                  Portal del cliente
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-bold">Veterinarias</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-foreground">
                  Iniciar sesión
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-foreground">
                  Registrar veterinaria
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-6 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center">
            <span>© 2026 TukiTuki Solutions SAC. Todos los derechos reservados.</span>
            <span>Cumplimiento Ley 29733</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
