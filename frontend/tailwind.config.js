/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          primary: '#C6F366',
        },
        dark: {
          bg: '#070A08',
          'bg-alt': '#0B0F0C',
          surface: '#0F1511',
          'surface-alt': '#121A14',
        },
        text: {
          primary: '#E6EAE6',
          muted: '#9AA39C',
        },
      },
      boxShadow: {
        'neon': '0 0 20px rgba(198, 243, 102, 0.3)',
        'neon-sm': '0 0 10px rgba(198, 243, 102, 0.2)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
  corePlugins: {
    // Desabilitar ring de focus padrão do Tailwind
    ringWidth: false,
  },
}

