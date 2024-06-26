/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  important: true,
  plugins: [],
  theme: {
    extend: {
      colors: {
        error: '#d32f2f',
      },
    },
  },
};

