/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './index2.html',
    './JS/**/*.js'
  ],
  theme: {
    extend: {}
  },
  plugins: [require('@tailwindcss/forms')]
};
