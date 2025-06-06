/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./InvaderGame.jsx" // InvaderGame.jsx もスキャン対象に含めます
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
