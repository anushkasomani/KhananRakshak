/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#060a12',
          900: '#0b0f19',
          850: '#0e1524',
          800: '#141d31',
          750: '#1c2844',
          700: '#233256',
        },
        cyber: {
          cyan: '#00f0ff',
          teal: '#06b6d4',
          blue: '#3b82f6',
          amber: '#f59e0b',
          orange: '#ff6b35',
          emerald: '#10b981',
          danger: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(0, 240, 255, 0.25)',
        'glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.25)',
        'glow-danger': '0 0 30px -5px rgba(239, 68, 68, 0.4)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.25)',
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'beacon': 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
