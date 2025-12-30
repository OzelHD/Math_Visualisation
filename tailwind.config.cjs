/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './index2.html',
    './JS/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        hours: "rgba(253, 41, 112, 1)",
        minutes: "rgba(252, 230, 0, 1)",
        seconds: "rgba(6, 252, 63, 1)",
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
