/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Mirrors the CSS variables defined in src/index.css so classes such as
      // bg-primary, text-secondary and bg-primary/5 resolve.
      colors: {
        primary: '#111111',
        secondary: '#ffffff',
        accent: '#f5f5f5',
        muted: '#888888',
        border: '#e2e2e2',
        error: '#ff4d4f',
        success: '#52c41a',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        heading: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
