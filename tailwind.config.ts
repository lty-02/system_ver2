import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,vue,ts}',
  ],
  theme: {
    extend: {
      colors: {
        'primary-light': '#4b7ba7',
        'primary-medium': '#2d5a7b',
        'primary-dark': '#023058',
        'accent-gold': '#f2cb52',
        'accent-yellow': '#a69f41',
        'accent-light': '#d7d7d9',
      },
    },
  },
  plugins: [],
} satisfies Config