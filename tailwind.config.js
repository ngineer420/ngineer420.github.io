/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./public/**/*.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      keyframes: theme => ({
        blockHide: {
          '0%': { display: 'none' },
          '99%': { display: 'none' },
          '100%': { display: 'block' }
        },
      }),

      colors: {
        'black': '#2e3436',
        'bright-green': '#8ae234'
      }
    },
  },
  plugins: [],
}

