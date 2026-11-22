/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#080d1a',
          navy: '#0b1329',
          surface: '#111c38',
          card: '#162347',
          cyan: '#06b6d4',
          'cyan-light': '#22d3ee',
          'cyan-dark': '#0891b2',
          electric: '#2563eb',
          'electric-light': '#3b82f6',
          'electric-glow': '#60a5fa',
          accent: '#00f0ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.35)',
        'glow-blue': '0 0 20px -3px rgba(37, 99, 235, 0.35)',
        'soft': '0 2px 10px -2px rgba(15, 23, 42, 0.06), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
        'card': '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
      },
    },
  },
  plugins: [],
}
