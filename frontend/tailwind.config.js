/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50:  '#FDFAF4',
          100: '#FAF4EB',
          200: '#F5F0E8',
          300: '#EDE4D3',
          400: '#DDD0BB',
        },
        brown: {
          100: '#E8D5C0',
          200: '#C9A882',
          300: '#A67C5D',
          400: '#8B5E34',
          500: '#6B4423',
          600: '#4E2F12',
        },
        success: '#6B8E5E',
        warning: '#D9A66D',
        danger:  '#B86A5E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
