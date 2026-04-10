/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FEF1DD",
        "arcade-orange": "#FF4F14",
        "arcade-orange-dark": "#E51E00",
        "arcade-orange-hover": "#B61902",
        "arcade-text": "#2F2B27",
        "arcade-ring": "#e3c9a1",
      },
      fontFamily: {
        nunito: ["Nunito", "system-ui", "sans-serif"],
        playpen: ["Playpen Sans", "cursive"],
        titan: ["Titan One", "cursive"],
      },
    },
  },
  plugins: [],
};
