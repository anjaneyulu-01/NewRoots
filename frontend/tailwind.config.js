/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Fiverr-inspired NewRoots branding
        hope: {
          green: '#1dbf73', // Primary success/action color
          'green-dark': '#19a463',
          'green-light': '#e7f7ee',
          gray: {
            50: '#fafafa',
            100: '#f5f5f5',
            200: '#eeeeee',
            300: '#dadbdd',
            400: '#b5b6ba',
            500: '#74767e',
            600: '#62646a',
            700: '#404145',
            800: '#2b2d31',
            900: '#1e1f23',
          },
          blue: '#446ee7',
          'blue-light': '#e8f0fe',
        },
        primary: { DEFAULT: '#1dbf73' },
        secondary: { DEFAULT: '#446ee7' },
        accent: { DEFAULT: '#ff6b2c' },
        surface: { light: '#ffffff', dark: '#1e1f23' },
        base: { light: '#fafafa', dark: '#111827' },
      },
      boxShadow: {
        glow: '0 10px 25px rgba(29,191,115,0.15)',
        card: '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
        soft: '0 1px 3px rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
    },
  },
  plugins: [],
};
