/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        crimson: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fcc8c8',
          300: '#f89090',
          400: '#f15050',
          500: '#e03030',
          600: '#cf2e2e',
          700: '#a52424',
          800: '#8B1A1A',
          900: '#6b1212',
        },
        gold: {
          50:  '#fdfbf0',
          100: '#faf3d0',
          200: '#f3e099',
          300: '#e8c84a',
          400: '#d9ac20',
          500: '#C8960C',
          600: '#a57a08',
          700: '#835f06',
          800: '#634605',
        },
      },
    },
  },
  plugins: [],
}
