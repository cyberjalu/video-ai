/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.10), 0 20px 80px rgba(0,0,0,0.55)",
        "glow-violet": "0 0 40px rgba(139,92,246,0.25), 0 0 0 1px rgba(139,92,246,0.20)",
        "glow-cyan": "0 0 40px rgba(34,211,238,0.20), 0 0 0 1px rgba(34,211,238,0.15)",
        "card": "0 18px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)",
      },
      backgroundImage: {
        "clipnews-radial":
          "radial-gradient(900px circle at 8% 12%, rgba(139,92,246,0.22) 0%, rgba(10,10,10,0) 55%), radial-gradient(900px circle at 88% 16%, rgba(34,211,238,0.14) 0%, rgba(10,10,10,0) 60%), radial-gradient(700px circle at 55% 92%, rgba(59,130,246,0.10) 0%, rgba(10,10,10,0) 55%)",
        "hero-grid":
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-40": "40px 40px",
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "pulse-soft": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 1.8s ease-in-out infinite",
      },
      colors: {
        surface: {
          DEFAULT: "rgba(24,24,27,0.8)",
          subtle: "rgba(24,24,27,0.5)",
        },
      },
      // Support arbitrary opacity values for bg-white/*
      opacity: {
        "6": "0.06",
        "8": "0.08",
        "15": "0.15",
      },
    },
  },
  plugins: [],
};
