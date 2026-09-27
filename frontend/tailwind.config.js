/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#6C63FF', 50: '#EDEDFF', 100: '#D4D1FF', 200: '#B3ADFF', 300: '#9188FF', 400: '#7A72FF', 500: '#6C63FF', 600: '#5A52E0', 700: '#4841C2', 800: '#3630A3', 900: '#242085' },
        secondary: { DEFAULT: '#A855F7', 50: '#F3E8FF', 100: '#E0C8FF', 200: '#C89EFF', 300: '#B074FF', 400: '#A855F7', 500: '#9333EA', 600: '#7C22C7', 700: '#6518A4', 800: '#4E1080', 900: '#37085C' },
        accent: '#00D4FF',
        dark: { DEFAULT: '#0A0A0F', card: '#1A1A2E', lighter: '#2A2A3E', border: '#2A2A3E', text: '#FFFFFF', muted: '#9CA3AF' },
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      backgroundImage: { 'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))' },
    },
  },
  plugins: [],
}
