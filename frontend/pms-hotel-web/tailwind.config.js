/** @type {import('tailwindcss').Config} */
const tailwindConfig = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        hotel: {
          primary: '#2C3E35',
          dark: '#1E2B25',
          hover: '#3A5246',
          accent: '#C5A880',
          gold: '#D4AF37',
          cream: '#FDFCFA',
          ivory: '#F5F2EB',
          charcoal: '#121815',
          deep: '#1A231F',
        },
      },
    },
  },
  plugins: [],
};

export default tailwindConfig;
