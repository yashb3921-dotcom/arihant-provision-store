export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#FAF5E9', deep: '#F1E8D4', line: '#E6DAC0' },
        forest: { DEFAULT: '#1E5C3A', dark: '#154329' },
        leaf: '#3A7A45',
        amber: { DEFAULT: '#D99A33', dark: '#B97E1F' },
        ink: '#16261E',
      },
      fontFamily: { sans: ['Inter', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
