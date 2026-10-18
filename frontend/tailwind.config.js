/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        flood: {
          0: "#10b981", // green (dry / safe)
          1: "#84cc16", // lime (puddle / level 1)
          2: "#eab308", // yellow (caution / level 2)
          3: "#f97316", // orange (danger / level 3)
          4: "#ef4444", // red (severe / level 4)
          5: "#7c3aed", // purple (catastrophic / level 5)
        },
      },
    },
  },
  plugins: [],
};
