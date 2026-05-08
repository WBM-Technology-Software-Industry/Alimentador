/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fff0',
          100: '#d4ffd4',
          200: '#a8f5a0',
          300: '#70e860',
          400: '#4DDB30',
          500: '#39FF14',  // WBM green
          600: '#28CC08',  // botões principais
          700: '#1DA006',
          800: '#157504',
          900: '#0D5203',
        },
        dark: {
          500: '#1A1A1A',  // WBM dark
          600: '#141414',
          700: '#0D0D0D',
        },
      },
    },
  },
  plugins: [],
}
