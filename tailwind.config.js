/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        stencil: ['"Black Ops One"', 'Impact', 'sans-serif'],
        body: ['"Special Elite"', 'Georgia', 'serif'],
      },
      colors: {
        crimson: {
          DEFAULT: '#c0392b',
          dark: '#7a1f17',
          light: '#e74c3c',
        },
        iron: {
          DEFAULT: '#7f8c8d',
          dark: '#34495e',
          light: '#bdc3c7',
        },
        brass: {
          DEFAULT: '#b08d57',
          dark: '#7a5b30',
          light: '#d4af6a',
        },
        steel: {
          50: '#f5f5f1',
          100: '#dad9d3',
          200: '#a8a79f',
          300: '#75756c',
          400: '#4a4a44',
          500: '#2e2e29',
          600: '#1e1e1a',
          700: '#141411',
          800: '#0c0c0a',
          900: '#050504',
        },
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='1.0' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
