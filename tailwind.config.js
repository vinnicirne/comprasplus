/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class", 
  theme: { 
    extend: { 
      "colors": { "inverse-primary": "#68dba9", "primary-container": "#00855d", "inverse-surface": "#283044", "surface-container-low": "#f2f3ff", "primary-fixed-dim": "#68dba9", "surface-container-high": "#e2e7ff", "outline": "#6d7a72", "tertiary-fixed": "#cce5ff", "on-secondary-container": "#457000", "on-primary": "#ffffff", "surface-container-lowest": "#ffffff", "error": "#ba1a1a", "on-primary-container": "#f5fff7", "outline-variant": "#bccac0", "on-tertiary": "#ffffff", "surface-dim": "#d2d9f4", "on-background": "#131b2e", "surface-bright": "#faf8ff", "secondary-container": "#acf847", "tertiary-fixed-dim": "#93ccff", "on-tertiary-container": "#fdfcff", "surface": "#faf8ff", "on-secondary-fixed": "#102000", "surface-container-highest": "#dae2fd", "on-tertiary-fixed": "#001d31", "tertiary-container": "#007bb9", "on-error": "#ffffff", "on-secondary": "#ffffff", "secondary-fixed": "#acf847", "secondary": "#416900", "error-container": "#ffdad6", "inverse-on-surface": "#eef0ff", "on-secondary-fixed-variant": "#304f00", "on-primary-fixed-variant": "#005137", "on-tertiary-fixed-variant": "#004b73", "surface-container": "#eaedff", "on-error-container": "#93000a", "primary": "#006948", "surface-tint": "#006c4a", "tertiary": "#006194", "primary-fixed": "#85f8c4", "on-primary-fixed": "#002114", "background": "#faf8ff", "on-surface": "#131b2e", "secondary-fixed-dim": "#91db2a", "surface-variant": "#dae2fd", "on-surface-variant": "#3d4a42" }, 
      "borderRadius": { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" }, 
      "spacing": { "margin": "1.25rem", "space-lg": "1.5rem", "gutter-sm": "0.75rem", "space-xs": "0.25rem", "space-sm": "0.5rem", "margin-sm": "1rem", "gutter": "1rem", "margin-lg": "2rem", "space-xl": "2rem", "space-md": "1rem" }, 
      "fontFamily": { "numeric-hero-mobile": ["Plus Jakarta Sans"], "body-lg": ["Plus Jakarta Sans"], "body-sm": ["Plus Jakarta Sans"], "headline-lg-mobile": ["Plus Jakarta Sans"], "headline-md": ["Plus Jakarta Sans"], "label-lg": ["Plus Jakarta Sans"], "headline-sm": ["Plus Jakarta Sans"], "headline-lg": ["Plus Jakarta Sans"], "headline-xl-mobile": ["Plus Jakarta Sans"], "numeric-hero": ["Plus Jakarta Sans"], "body-md": ["Plus Jakarta Sans"], "headline-xl": ["Plus Jakarta Sans"], "label-md": ["Plus Jakarta Sans"], "label-sm": ["Plus Jakarta Sans"], "sans": ["Plus Jakarta Sans", "sans-serif"] }, 
      "fontSize": { "numeric-hero-mobile": ["28px", { "lineHeight": "32px", "letterSpacing": "-0.02em", "fontWeight": "800" }], "body-lg": ["16px", { "lineHeight": "24px", "letterSpacing": "-0.005em", "fontWeight": "400" }], "body-sm": ["12px", { "lineHeight": "16px", "letterSpacing": "0.01em", "fontWeight": "400" }], "headline-lg-mobile": ["22px", { "lineHeight": "28px", "letterSpacing": "-0.01em", "fontWeight": "700" }], "headline-md": ["20px", { "lineHeight": "26px", "letterSpacing": "-0.01em", "fontWeight": "700" }], "label-lg": ["15px", { "lineHeight": "20px", "letterSpacing": "0em", "fontWeight": "600" }], "headline-sm": ["17px", { "lineHeight": "22px", "letterSpacing": "0em", "fontWeight": "600" }], "headline-lg": ["28px", { "lineHeight": "34px", "letterSpacing": "-0.015em", "fontWeight": "700" }], "headline-xl-mobile": ["30px", { "lineHeight": "36px", "letterSpacing": "-0.02em", "fontWeight": "800" }], "numeric-hero": ["36px", { "lineHeight": "40px", "letterSpacing": "-0.03em", "fontWeight": "800" }], "body-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0em", "fontWeight": "400" }], "headline-xl": ["40px", { "lineHeight": "48px", "letterSpacing": "-0.02em", "fontWeight": "800" }], "label-md": ["13px", { "lineHeight": "18px", "letterSpacing": "0.01em", "fontWeight": "600" }], "label-sm": ["11px", { "lineHeight": "14px", "letterSpacing": "0.03em", "fontWeight": "700" }] },
      "boxShadow": {
        'level-1': '0 1px 3px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.02)',
        'level-2': '0 8px 24px -4px rgba(5, 150, 105, 0.08), 0 4px 8px -2px rgba(15, 23, 42, 0.04)',
        'level-3': '0 12px 28px -6px rgba(5, 150, 105, 0.28), 0 6px 12px -4px rgba(15, 23, 42, 0.08)',
        'level-4': '0 20px 40px -10px rgba(15, 23, 42, 0.16)'
      }
    } 
  },
  plugins: [],
}
