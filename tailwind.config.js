/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        m3: {
          sys: {
            primary: 'rgb(var(--m3-sys-primary) / <alpha-value>)',
            onPrimary: 'rgb(var(--m3-sys-on-primary) / <alpha-value>)',
            primaryContainer: 'rgb(var(--m3-sys-primary-container) / <alpha-value>)',
            onPrimaryContainer: 'rgb(var(--m3-sys-on-primary-container) / <alpha-value>)',
            secondary: 'rgb(var(--m3-sys-secondary) / <alpha-value>)',
            onSecondary: 'rgb(var(--m3-sys-on-secondary) / <alpha-value>)',
            secondaryContainer: 'rgb(var(--m3-sys-secondary-container) / <alpha-value>)',
            surface: 'rgb(var(--m3-sys-surface) / <alpha-value>)',
            surfaceDim: 'rgb(var(--m3-sys-surface-dim) / <alpha-value>)',
            surfaceBright: 'rgb(var(--m3-sys-surface-bright) / <alpha-value>)',
            surfaceContainerLowest: 'rgb(var(--m3-sys-surface-container-lowest) / <alpha-value>)',
            surfaceContainerLow: 'rgb(var(--m3-sys-surface-container-low) / <alpha-value>)',
            surfaceContainer: 'rgb(var(--m3-sys-surface-container) / <alpha-value>)',
            surfaceContainerHigh: 'rgb(var(--m3-sys-surface-container-high) / <alpha-value>)',
            surfaceContainerHighest: 'rgb(var(--m3-sys-surface-container-highest) / <alpha-value>)',
            onSurface: 'rgb(var(--m3-sys-on-surface) / <alpha-value>)',
            onSurfaceVariant: 'rgb(var(--m3-sys-on-surface-variant) / <alpha-value>)',
            outline: 'rgb(var(--m3-sys-outline) / <alpha-value>)',
            outlineVariant: 'rgb(var(--m3-sys-outline-variant) / <alpha-value>)',
            error: 'rgb(var(--m3-sys-error) / <alpha-value>)',
            onError: 'rgb(var(--m3-sys-on-error) / <alpha-value>)'
          }
        }
      },
      boxShadow: {
        'm3-1': '0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
        'm3-2': '0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)',
        'm3-3': '0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px 0px rgba(0, 0, 0, 0.30)',
        'm3-4': '0px 6px 10px 4px rgba(0, 0, 0, 0.15), 0px 2px 3px 0px rgba(0, 0, 0, 0.30)'
      }
    },
  },
  plugins: [],
}
