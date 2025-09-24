/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./node_modules/daisyui/**/*.js"
  ],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
}
