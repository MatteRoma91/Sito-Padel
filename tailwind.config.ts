import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50: '#c5d4fc',
          100: '#9AB0F8',
          200: '#9AB0F8',
          300: '#6270F3',
          400: '#4d5cf4',
          500: '#3445F1',
          600: '#2a38c9',
          700: '#202ca1',
          800: '#162079',
          900: '#0c1451',
        },
        accent: {
          50: '#f2ffcc',
          100: '#e5ff99',
          200: '#e5ff99',
          300: '#d6ff66',
          400: '#c4ff33',
          500: '#B2FF00',
          600: '#9ee600',
          700: '#8acc00',
          800: '#76b300',
          900: '#629900',
        },
      },
    },
  },
  plugins: [],
};
export default config;
