/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "c:/Users/varel/OneDrive/Documents/Antigravity/petrola-dashboard/index.html",
    "c:/Users/varel/OneDrive/Documents/Antigravity/petrola-dashboard/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        petrola: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        snapmart: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          900: '#1e3a8a',
        }
      }
    },
  },
  plugins: [],
}
