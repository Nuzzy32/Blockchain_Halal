# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Traceability Sapi
**Generated:** 2026-09-05 11:54:00
**Category:** General
**Design Dials:** Variance 6/10 (Balanced / Modern) | Motion 5/10 (Standard) | Density 4/10 (Standard)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#EA580C` | `--color-primary` |
| On Primary | `#000000` | `--color-on-primary` |
| Secondary | `#F97316` | `--color-secondary` |
| On Secondary | `#000000` | `--color-on-secondary` |
| Accent/CTA | `#2563EB` | `--color-accent` |
| On Accent/CTA | `#FFFFFF` | `--color-on-accent` |
| Background | `#FFF7ED` | `--color-background` |
| Foreground | `#0F172A` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#0F172A` | `--color-card-foreground` |
| Muted | `#FDF4F0` | `--color-muted` |
| Muted Foreground | `#475569` | `--color-muted-foreground` |
| Border | `#FCEAE1` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#EA580C` | `--color-ring` |

**Color Notes:** Appetizing orange + trust blue

### Typography

- **Heading Font:** Outfit
- **Body Font:** Work Sans
- **Mood:** geometric, modern, clean, balanced, contemporary, versatile
- **Google Fonts:** [Outfit + Work Sans](https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&display=swap');
```

### Spacing Variables

*Density: 4/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #2563EB;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #EA580C;
  border: 2px solid #EA580C;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #FFF7ED;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #EA580C;
  outline: none;
  box-shadow: 0 0 0 3px #EA580C20;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Minimalism & Swiss Style

**Keywords:** Clean, simple, spacious, functional, white space, high contrast, geometric, sans-serif, grid-based, essential

**Best For:** Enterprise apps, dashboards, documentation sites, SaaS platforms, professional tools

**Key Effects:** Subtle hover (200-250ms), smooth transitions, sharp shadows if any, clear type hierarchy, fast loading

### Page Pattern

**Pattern Name:** Hero + Features + CTA

- **Conversion Strategy:** Deep CTA placement. For CTA label text, verify at least 4.5:1 against the button fill; use 7:1 only when the product explicitly targets AAA normal-text contrast. Keep focus and component boundaries independently visible. Disable hero parallax under reduced motion and render its static final state.
- **CTA Placement:** Hero (sticky) + Bottom
- **Section Order:** Hero with headline/image > Value prop > Key features (3-5) > CTA section > Footer

---

## Motion

**Stagger List** (Standard) — Trigger: load or scroll | Duration: 300-450ms | Easing: `back.out(1.4)`

```js
gsap.from('.grid-item', { opacity: 0, scale: 0.92, y: 16, duration: 0.4, stagger: { each: 0.06, from: 'start', grid: 'auto' }, ease: 'back.out(1.4)' });
```

**Framework notes:** grid: 'auto' lets GSAP infer rows/columns from a CSS grid layout for a natural wave stagger; Use matchMedia('(prefers-reduced-motion: reduce)') to skip non-essential motion and render the final state immediately

- ✅ Combine with from: 'center' for a bento-grid layout to draw the eye inward first
- ❌ Don't use back.out on dense data tables; the overshoot reads as sloppy on informational UI
- ⚡ Group DOM writes; avoid interleaving layout reads (getBoundingClientRect) between staggered tweens

---

## Anti-Patterns (Do NOT Use)


### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile

---

## Project Overrides (terverifikasi 2026-09-05)

Empat penyimpangan dari output generator di atas. Semua diukur, bukan selera.

### 1. Palet diganti: "Citizen Science" menggantikan "Appetizing orange + trust blue"

Generator mencocokkan query ke profil **makanan/restoran** (oranye menggugah selera).
Produk ini bukan pemasaran makanan — ini **dokumen verifikasi** yang dibuka konsumen
untuk memutuskan apakah data bisa dipercaya. Oranye-nafsu-makan melawan tujuan itu, dan
akan bertabrakan dengan warna peringatan "jaringan salah" yang juga oranye.

Dipakai sebagai gantinya, hasil `--domain color "certification verification trust badge"`
(match ke-2, *Citizen Science Platform* — "Discovery green + volunteer badge + data neutral"):

| Peran | Hex | Catatan |
|---|---|---|
| Primary | `#15803D` | on-primary `#FFFFFF` — 5.02:1 |
| Secondary | `#22C55E` | on-secondary `#0F172A` — 7.83:1 |
| Accent | `#D97706` | **hanya sebagai fill**, teks di atasnya `#000000` — 6.59:1 |
| Background | `#F0FDF4` | |
| Foreground | `#14532D` | 8.70:1 di latar |
| Muted foreground | `#475569` | 7.24:1 di latar |
| Destructive | `#DC2626` | |

### 2. `--color-accent` GAGAL sebagai warna teks

`#D97706` di atas kartu putih = **3.19:1**, di bawah ambang 4.5:1. Banner "jaringan salah"
memakainya sebagai teks, jadi harus diganti.

→ `--color-warn-text: #B45309` (amber-700) — 5.02:1 di kartu, 4.80:1 di latar. LULUS.
`#D97706` tetap dipakai, tapi hanya sebagai latar/fill.

### 3. `--color-border` GAGAL untuk kontrol form

`#BBF7D0` di atas kartu putih = **1.21:1**, jauh di bawah ambang 3:1 untuk batas komponen
UI (WCAG 1.4.11). Batas input form adalah batas kontrol, bukan hiasan.

→ Dipecah dua token:
- `--color-divider: #BBF7D0` — garis pemisah & tepi kartu (dekoratif, tidak diatur 1.4.11)
- `--color-border: #6B8A78` — batas input, tombol ghost, dan chip. 3.80:1 di kartu,
  3.63:1 di latar. LULUS.

### 4. Pattern "Hero + Features + CTA" ditolak

Itu struktur **landing page** (hero → value prop → fitur → CTA → footer). Tidak ada
halaman di aplikasi ini yang berbentuk landing page:

- `/?id=N` adalah **hasil pemindaian** — pengguna sudah memutuskan, tinggal butuh jawaban.
  Menyisipkan "value prop" dan "CTA section" akan menunda informasi yang dicari.
- `/` adalah **alat kerja** untuk tiga aktor, bukan halaman jualan.

Struktur tetap mengikuti arsitektur informasi yang ada. Style *Minimalism & Swiss Style*
tetap dipakai penuh — grid tegas, hierarki tipografi kuat, kontras tinggi, hanya yang
esensial.

### 5. Motion tanpa GSAP

Preset `Stagger List` (300-450ms, `back.out(1.4)`, stagger 0.06s) diadopsi karakternya,
tapi diimplementasi dengan CSS `animation-delay` + `cubic-bezier(0.34, 1.56, 0.64, 1)`.
Menambah GSAP (~100KB) untuk satu stagger tidak sepadan di aplikasi 4 layar.
`prefers-reduced-motion` dihormati.
