/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        success: '#10B981', // Emerald 500
        warning: '#F59E0B', // Amber 500
        danger:  '#EF4444', // Red 500
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // Blue 500
          600: '#2563eb', // Blue 600
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4', // Cyan 500
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        slate: {
          950: '#020617', // Very deep blue-black for rich dark mode
        },
        pastel: {
          blue: '#dbeafe', // soft blue
          lavender: '#e0e7ff', // soft lavender/indigo
          peach: '#ffedd5', // soft peach/orange
          green: '#d1fae5', // soft mint green
          pink: '#fce7f3', // soft pink
          purple: '#f3e8ff', // soft purple
        }
      },
      fontFamily: {
        sans: ['Quantico', 'Arial Narrow', 'sans-serif'],
        display: ['Quantico', 'Arial Narrow', 'sans-serif'],
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
