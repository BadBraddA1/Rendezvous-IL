# Rendezvous IL Website

A fast, mobile-first static site for the Rendezvous Christian Homeschool Family Retreat, built with Vue 3, Vite, and Mint UI.

## Features

- Mobile-first responsive design
- Vue 3 with Composition API
- Vite for fast development and builds
- Mint UI component library for mobile UI
- Vue Router with smooth scrolling and hash navigation
- Accessible (WCAG AA compliant)
- Light/dark mode support via `prefers-color-scheme`
- Lightweight CSS (< 20KB unminified custom styles)

## Tech Stack

- **Vue 3** - Progressive JavaScript framework
- **Vite** - Next generation frontend tooling
- **Mint UI** - Mobile UI component library
- **Vue Router** - Official router for Vue.js

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The site will be available at `http://localhost:5173`

### Build for Production

Create an optimized production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

## Project Structure

```
rendezvous-il/
├── index.html              # Entry HTML file
├── vite.config.js          # Vite configuration
├── package.json            # Dependencies and scripts
├── src/
│   ├── main.js            # Vue app bootstrap
│   ├── router.js          # Vue Router configuration
│   ├── App.vue            # Root component
│   ├── styles/
│   │   ├── base.css       # Base styles and CSS variables
│   │   └── mint-overrides.css  # Mint UI theme overrides
│   ├── views/
│   │   ├── HomeView.vue       # Home page
│   │   ├── ScheduleView.vue   # Schedule page
│   │   └── AboutView.vue      # About page
│   └── components/
│       ├── DaySection.vue     # Collapsible day section
│       ├── StickySubnav.vue   # Day navigation
│       └── FactCard.vue       # Quick facts card
└── README.md
```

## Pages

- **Home** (`/`) - Event overview, quick facts, and call-to-action
- **Schedule** (`/schedule`) - Complete 5-day event schedule with collapsible sections
- **About** (`/about`) - Introduction and history of Rendezvous

## Customization

### Colors

Edit CSS variables in `src/styles/base.css`:

```css
:root {
  --color-primary: #4a7c59;
  --color-secondary: #8b6f47;
  --color-accent: #c9a961;
  /* ... */
}
```

### Typography

The site uses the system font stack for optimal performance. To change fonts, edit the `--font-family` variable in `base.css`.

### Mint UI Overrides

Customize Mint UI components in `src/styles/mint-overrides.css` while maintaining WCAG AA compliance.

## Accessibility

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- High contrast focus states
- WCAG AA color contrast ratios
- Screen reader friendly
- Respects `prefers-reduced-motion`

## Performance

- Minimal JavaScript bundle
- System fonts (no webfont downloads)
- Lazy loading where applicable
- Optimized images with width/height attributes
- CSS code splitting

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

© 2025 Rendezvous Illinois. All rights reserved.

## Contact

Stephen & Ranae Bradd  
824 W. Main St.  
Clinton, IL 61727  
(217)935-5058  
Stephen@Bradd.us

Website: www.RendezvousIL.com  
Facebook: www.facebook.com/groups/RendezvousIL
