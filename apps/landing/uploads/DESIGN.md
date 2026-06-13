# DESIGN.md — Landing Page · Centro Veterinario Razas

## Brand Identity

**Brand name**: Centro Veterinario Razas  
**Tagline**: _"La salud de tu mascota, nuestra misión"_  
**Tone**: Cálido, profesional, cercano. Como un médico de confianza que también ama a los animales.  
**Audience**: Dueños de mascotas en Arequipa (perros, gatos, aves exóticas) que buscan atención veterinaria seria y accesible en Sachaca/Arequipa.

---

## Color Palette

Extraída directamente del logo oficial de Razas:

| Token              | Hex       | Uso                                                        |
|--------------------|-----------|------------------------------------------------------------|
| `--primary`        | `#F26522` | Naranja vivo del logo (cruz médica). CTAs, acentos, iconos |
| `--primary-dark`   | `#D4541A` | Hover / estados activos del primary                        |
| `--primary-light`  | `#FEF0E7` | Fondos suaves, badges, highlights                          |
| `--charcoal`       | `#4D4D4D` | Gris carbón del logo (siluetas + tipografía Razas)         |
| `--charcoal-light` | `#6B6B6B` | Texto secundario, subtítulos                               |
| `--white`          | `#FFFFFF` | Fondos principales                                         |
| `--cream`          | `#FAFAF7` | Fondos de secciones alternadas, tarjetas                   |
| `--border`         | `#E8E4DF` | Bordes suaves, separadores                                 |
| `--success`        | `#22C55E` | Indicadores de disponibilidad, confirmaciones              |
| `--emergency`      | `#EF4444` | Servicio de emergencias, alertas urgentes                  |

**Paleta dominante**: Naranja + Blanco + Gris carbón. El naranja lidera en botones y acentos; el carbón ancla la tipografía y da seriedad médica.

---

## Typography

**Display / Headings grandes**: [Nunito](https://fonts.google.com/specimen/Nunito) — peso 700–800. Redondeado, amigable, moderno. Evoca calidez sin perder profesionalismo.  
**Body / Párrafos**: [Inter](https://fonts.google.com/specimen/Inter) — peso 400–500. Limpio, legible, neutro.  
**Brand wordmark**: Cuando se muestre el nombre "Razas" como logotipo o hero-text, usar cursiva/script (el logo usa script manual). Para fallback web: `font-family: 'Dancing Script', cursive` como accent ocasional.

### Escala tipográfica

| Elemento         | Tamaño   | Peso   | Color        |
|------------------|----------|--------|--------------|
| Hero H1          | 56–64px  | 800    | `#4D4D4D`    |
| Section H2       | 36–40px  | 700    | `#4D4D4D`    |
| Card H3          | 22–24px  | 700    | `#4D4D4D`    |
| Body             | 16–18px  | 400    | `#6B6B6B`    |
| Caption / Label  | 13–14px  | 500    | `#6B6B6B`    |
| CTA Button       | 16px     | 600    | White        |

---

## Shape & Spacing

- **Border radius**: `12px` tarjetas, `8px` inputs, `999px` (pill) para botones principales y badges.
- **Shadows**: Suaves, cálidas. `box-shadow: 0 4px 24px rgba(242, 101, 34, 0.08)` para cards hover.
- **Spacing scale**: 8px base. Sections tienen `padding: 96px 0` en desktop, `64px 0` en mobile.
- **Max width content**: `1200px` centrado.
- **Grid**: 12 columnas en desktop, 4 en mobile.

---

## Appearance

**Mode**: Solo light mode (clínica con web informativa sencilla, sin necesidad de dark mode).  
**Background default**: `#FFFFFF`  
**Background alternado (sections)**: `#FAFAF7` (cream muy sutil)

---

## Page Structure & Sections

### 1. NAVBAR (fijo en top)
- Logo Razas a la izquierda (imagen del logo PNG).
- Links: Servicios · ¿Por qué Razas? · Contacto · Horarios.
- CTA button (pill, naranja): **"Reservar cita"** → enlaza a WhatsApp.
- En mobile: hamburger menu. Fondo blanco con sombra suave al hacer scroll.

---

### 2. HERO SECTION
**Estilo**: Split layout (50/50). Izquierda: texto + CTA. Derecha: imagen hero de mascota feliz con veterinario.

**Contenido izquierda**:
```
(badge pill naranja claro)  🐾 Arequipa · Sachaca

La salud de tu mascota,
nuestra misión.

Atención veterinaria profesional con calidez humana.
Consultas, cirugías, vacunación, grooming y hospedaje
en un solo lugar.

[Reservar cita por WhatsApp]  [Ver servicios ↓]
```

**Indicadores de confianza bajo los botones** (inline, con iconos):
- ✓ Más de 5 años de experiencia
- ✓ Atención personalizada
- ✓ Lunes a Sábado

**Imagen derecha**: Foto real de un veterinario con mascota, o ilustración cálida. Fondo con blobs suaves en naranja muy claro (`#FEF0E7`). La imagen tiene `border-radius: 24px`.

---

### 3. SERVICIOS
**Headline**: `Nuestros Servicios`  
**Sub**: `Todo lo que tu mascota necesita, en un solo lugar.`  
**Layout**: Grid 3×2 en desktop, 1×6 en mobile.  
**Fondo**: `#FAFAF7`

Cards de servicio (icon + título + descripción breve):

| Icono | Servicio           | Descripción corta                                              |
|-------|--------------------|----------------------------------------------------------------|
| 🩺    | **Consulta Médica**| Diagnóstico clínico profesional para perros, gatos y aves.    |
| 💉    | **Vacunación**     | Calendario completo de vacunas y desparasitación.             |
| 🔪    | **Cirugía**        | Cirugía general y especializada con equipamiento moderno.      |
| ✂️    | **Peluquería**     | Grooming y baño profesional según la raza de tu mascota.      |
| 🏠    | **Hospedaje**      | Hotel para mascotas seguro, monitoreado y con atención médica.|
| 🚨    | **Emergencias**    | Atención de urgencias en horario de atención.                 |

**Card design**: Blanco, `border-radius: 16px`, icono en círculo naranja claro (`#FEF0E7`), borde `#E8E4DF`, hover con sombra naranja suave y borde naranja.

---

### 4. ¿POR QUÉ ELEGIR RAZAS?
**Headline**: `¿Por qué confiar en Razas?`  
**Layout**: 4 columnas de "trust pillars" + imagen lateral.  
**Fondo**: Blanco.

Pillars con número grande en naranja:
1. **+5 años** — De experiencia en salud animal en Arequipa.
2. **3 especies** — Perros, gatos y aves exóticas bajo cuidado especializado.
3. **1 equipo** — Profesionales comprometidos con el bienestar de tu mascota.
4. **6 días** — Abiertos de lunes a sábado para servirte.

Texto de apoyo:
> _"En Razas tratamos a tu mascota como parte de la familia, porque sabemos lo mucho que significa para ti."_

---

### 5. TESTIMONIOS (Social proof)
**Headline**: `Lo que dicen nuestros clientes`  
**Layout**: Carousel de 3 cards en desktop, 1 en mobile.  
**Fondo**: `#FAFAF7`

Cards de testimonio:
- Avatar (inicial coloreada), nombre, ⭐⭐⭐⭐⭐, texto de 2-3 líneas.
- Estilo: blanco, borde sutil, `border-radius: 16px`.

Textos placeholder reales (basados en reseñas de veterinarias similares en Arequipa):
> _"Excelente atención, el equipo trata muy bien a mi Firulais. Volvemos siempre."_ — **María T.**
> _"La peluquería quedó perfecta y el trato fue muy profesional. Los recomiendo."_ — **Carlos R.**
> _"Llevé a mi gata de emergencia y la atendieron de inmediato. Muy agradecida."_ — **Sandra M.**

---

### 6. GALERÍA / INSTAGRAM STRIP (opcional)
4–6 fotos en grid horizontal de mascotas atendidas, del Instagram/Facebook de la clínica.  
**CTA**: `Síguenos en Facebook →`

---

### 7. UBICACIÓN, HORARIOS & CONTACTO
**Layout**: 2 columnas. Izquierda: info + mapa embed. Derecha: formulario de contacto rápido o botón WhatsApp grande.  
**Fondo**: Blanco.

**Info**:
```
📍  Tahuaycani 32, Sachaca, Arequipa, Perú
📞  (054) 588055
💬  WhatsApp: [número]
🕐  Lun – Vie  09:00 – 18:00
    Sábado      09:00 – 17:00
```

**Mapa**: Google Maps embed con pin en Tahuaycani 32, Sachaca.

**CTA principal** (botón verde WhatsApp pill grande):
```
💬  Escribirnos por WhatsApp
```

---

### 8. FOOTER
- Logo Razas + tagline.
- Links: Inicio · Servicios · Contacto · Política de privacidad.
- Redes: Facebook icon → página de Razas.
- Copyright: `© 2025 Centro Veterinario Razas · Arequipa, Perú`
- Fondo: `#4D4D4D` (carbón del logo), texto: blanco/cream.

---

## Component Specs

### Primary Button (CTA)
```css
background: #F26522;
color: white;
border-radius: 999px;
padding: 14px 28px;
font-size: 16px;
font-weight: 600;
transition: background 0.2s;
hover: background #D4541A;
```

### Secondary Button (Ghost)
```css
background: transparent;
color: #F26522;
border: 2px solid #F26522;
border-radius: 999px;
padding: 12px 26px;
hover: background #FEF0E7;
```

### WhatsApp Button
```css
background: #25D366;
color: white;
border-radius: 999px;
padding: 16px 32px;
font-size: 18px;
font-weight: 700;
```

### Service Card
```css
background: white;
border: 1px solid #E8E4DF;
border-radius: 16px;
padding: 32px 24px;
transition: box-shadow 0.2s, border-color 0.2s;
hover: {
  box-shadow: 0 8px 32px rgba(242, 101, 34, 0.12);
  border-color: #F26522;
}
```

---

## Imagery & Icons

- **Icons**: [Lucide](https://lucide.dev) o [Phosphor Icons](https://phosphoricons.com). Stroke icons en naranja o carbón.
- **Hero image**: Foto cálida de veterinario con mascota (perro o gato). Iluminación natural, colores tierra. Si no hay foto real disponible, usar placeholder de alta calidad de Unsplash (ej: `https://unsplash.com/s/photos/veterinarian`).
- **Logo**: Usar el archivo PNG del logo oficial con la cruz naranja y siluetas en carbón. Siempre sobre fondo blanco o muy claro.
- **Background decorativo hero**: Blob shape en `#FEF0E7` (naranja muy claro, 20% opacidad) detrás de la imagen, para dar profundidad sin distraer.
- **Pattern**: Opcionalmente, subtle paw print pattern en `#F26522` al 4% de opacidad en fondos de secciones alternadas.

---

## Animations & Interactions

- **Scroll reveal**: Cards y trust pillars aparecen con `fade-up` suave (translateY 20px → 0, opacity 0 → 1, 0.4s ease-out) al entrar al viewport.
- **Navbar**: Fondo blanco + sombra aparece al hacer scroll > 50px.
- **Cards hover**: Elevación suave con `box-shadow` naranja.
- **CTA buttons**: Scale 1.02 en hover, transition 0.15s.
- **NO** usar animaciones excesivas o loops. La experiencia debe ser fluida y médicamente seria.

---

## Mobile Responsiveness

| Breakpoint | Comportamiento                                              |
|------------|-------------------------------------------------------------|
| `< 640px`  | Single column. Hero stack vertical. Services 1×6.          |
| `640–1024px`| Services 2×3. Hero aún 50/50 con imagen más pequeña.     |
| `> 1024px` | Full desktop layout descrito arriba.                        |

- Navbar colapsa en hamburger icon (carbón) en mobile.
- WhatsApp CTA siempre visible (floating button en esquina inferior derecha en mobile: naranja, pill, ícono WhatsApp).
- Touch targets mínimo 44×44px.

---

## SEO & Meta

```html
<title>Centro Veterinario Razas | Arequipa · Sachaca</title>
<meta name="description" content="Centro Veterinario Razas en Sachaca, Arequipa. Consultas, cirugías, vacunación, peluquería y hospedaje para tu mascota. Lunes a Sábado 9:00–18:00. (054) 588055." />
<meta property="og:title" content="Centro Veterinario Razas · Arequipa" />
<meta property="og:description" content="Atención veterinaria profesional y cálida en Sachaca, Arequipa. Tu mascota en las mejores manos." />
```

---

## Key Design Decisions

1. **El naranja del logo (#F26522) es el alma del brand** — usar con generosidad en CTAs, iconos y acentos, pero siempre sobre fondo blanco o cream para no saturar.
2. **El carbón (#4D4D4D) da autoridad médica** — todos los headings y el footer van en carbón, reforzando la seriedad profesional.
3. **WhatsApp es el canal de conversión principal** — el botón verde de WhatsApp debe estar en hero, en la sección de contacto y flotante en mobile.
4. **Las mascotas al centro** — toda imagen y copy pone a la mascota como protagonista, no a los médicos.
5. **Simplicidad funcional** — landing de una sola página (SPA scroll), sin páginas internas innecesarias para el primer MVP.
