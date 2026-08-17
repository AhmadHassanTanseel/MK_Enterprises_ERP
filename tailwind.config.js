/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary — classic soda red. DOMINANT: sidebar, buttons, active nav, energy.
        soda: {
          50:  '#FDF3F2',
          100: '#F7D9D3',
          200: '#EDB3A8',
          300: '#DE7F6E',
          400: '#CC4F3C',
          500: '#B33223',
          600: '#9C2418', // PRIMARY — buttons, active nav, CTAs
          700: '#7A1B12', // hover/pressed
          800: '#551209', // sidebar header
          900: '#3A0C06', // sidebar background — deep maroon-brown, not neon
          950: '#220602', // darkest anchor
        },
        // Secondary — cola brown. Grounds the red, used for info/totals/text, not CTAs.
        cola: {
          50:  '#FBF6F0', // page background — warm cream
          100: '#F0E2D0',
          200: '#DEC29E',
          300: '#C69B6C',
          400: '#A97645',
          500: '#8B5A2E',
          600: '#6B4423',
          700: '#4F3119', // informational highlights, secondary text
          800: '#38220F',
          900: '#241608',
        },
        // Gourmet accent — gold, reserved for premium signals only (totals, brand mark)
        gold: {
          400: '#E0B84D',
          500: '#CBA135',
          600: '#B8860B',
        },
      },
    },
  },
  plugins: [],
}