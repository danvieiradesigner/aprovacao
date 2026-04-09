/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          dark: '#4f46e5',
        },
        bg: {
          DEFAULT: '#080d1a',
          sidebar: '#0f172a',
          card: '#111827',
          input: '#1e293b',
        },
        text: {
          primary: '#f8fafc',
          secondary: '#94a3b8',
          muted: '#475569',
        },
        border: 'rgba(255, 255, 255, 0.06)',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
      },
      boxShadow: {
        'brand': '0 0 20px rgba(99, 102, 241, 0.2)',
        'brand-sm': '0 0 10px rgba(99, 102, 241, 0.15)',
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

