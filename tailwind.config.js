const { hairlineWidth } = require('nativewind/theme');
 
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './features/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        icon: 'var(--icon)',
        'icon-muted': 'var(--icon-muted)',
        placeholder: 'var(--placeholder)',
        overlay: 'var(--overlay)',
        'surface-subtle': 'var(--surface-subtle)',
        'verified-bg': 'var(--verified-bg)',
        'verified-fg': 'var(--verified-fg)',
        'rating-star': 'var(--rating-star)',
        'calendar-range': 'var(--calendar-range)',
        'calendar-range-dark': 'var(--calendar-range-dark)',
        'map-marker-bg': 'var(--map-marker-bg)',
        'map-marker-fg': 'var(--map-marker-fg)',
        'map-marker-border': 'var(--map-marker-border)',
        'map-popup-bg': 'var(--map-popup-bg)',
        'map-popup-muted': 'var(--map-popup-muted)',
        'map-popup-cta-bg': 'var(--map-popup-cta-bg)',
        'map-popup-cta-fg': 'var(--map-popup-cta-fg)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [require('tailwindcss-animate')],
};
