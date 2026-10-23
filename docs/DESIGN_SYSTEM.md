# Meda Design System

## Brand

Canonical logo: `public/assets/meda-logo.png`

The product uses a dark clinical visual workspace with a restrained purple-to-blue gradient accent. The visual style should communicate precision and modernity without feeling gaming-oriented.

## Color tokens

```css
--meda-bg: #07111f;
--meda-bg-deep: #050b14;
--meda-sidebar: #09172a;
--meda-surface: #0c1827;
--meda-surface-2: #101f31;
--meda-surface-hover: #14263b;
--meda-border: #23354a;
--meda-border-soft: rgba(255,255,255,.08);

--meda-text: #f7f9fc;
--meda-text-secondary: #a7b2c2;
--meda-text-muted: #718097;

--meda-purple: #7c4dff;
--meda-purple-2: #9747ff;
--meda-blue: #4da3ff;
--meda-cyan: #42d7d7;
--meda-green: #2ed39a;
--meda-yellow: #ffc947;
--meda-orange: #ff9f43;
--meda-red: #ff5c7a;

--meda-brand-gradient: linear-gradient(135deg,#9a4dff 0%,#7756ff 48%,#4da3ff 100%);
```

## Typography

Preferred stack:

```css
font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

Use:

- 28–32 px / 700 for major patient/page titles
- 18–20 px / 650 for card headings
- 14–16 px / 500 for primary UI text
- 12–13 px / 500 for metadata
- 11–12 px / 600 for status labels

## Shape language

- Major panels: 14 px radius
- Cards: 12 px radius
- Small controls: 8–10 px radius
- Pills: 999 px radius
- Borders: 1 px subtle navy/white alpha
- Shadows: minimal; depth primarily from tonal surfaces

## Spacing

Base 4 px system:

- 4, 8, 12, 16, 20, 24, 32, 40

Desktop page gutters: 20–28 px.

## Iconography

Use simple 1.75–2 px line icons. Prefer Lucide-style geometry.

## Body map marker system

Do not use color alone. Each category gets a color + shape/icon.

- Melanocytic nevus: blue filled circle
- Atypical / monitored lesion: yellow ring
- BCC/SCC / malignant history: pink-red target
- Actinic keratosis: purple diamond
- Surgical site: white outlined square
- Biopsy site: white dotted ring
- Rash/inflammation: teal marker
- Burn/scar: orange marker

Hover/focus state increases marker size slightly and adds a thin halo.

Selected marker uses a strong outer ring plus connector line to the inspector when space allows.

## Imagery

Clinical images should:

- use neutral crop and lighting
- preserve medically relevant scale/context
- show date and anatomical site
- avoid decorative filters
- never autoplay video

Body maps may use standardized photography or a stitched clinical body representation. The UI should support both without changing the information architecture.
