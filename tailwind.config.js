/** @type {import('tailwindcss').Config} */
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  safelist: [
    // Force include dark mode classes
    'dark:bg-gray-900',
    'dark:text-gray-100',
    'dark:text-gray-200',
    'dark:text-gray-300',
    'dark:text-gray-400',
    'dark:bg-gray-800',
    'dark:bg-gray-700',
    'dark:border-gray-700',
    'dark:border-gray-600',
    'dark:hover:bg-gray-700',
    'dark:hover:bg-gray-600',
    'dark:text-white',
    'dark:text-blue-400',
    'dark:text-green-400',
    'dark:text-red-400',
    'dark:text-purple-400',
    'dark:bg-blue-900/20',
    'dark:bg-green-900/20',
    'dark:bg-red-900/20',
    'dark:bg-purple-900/20',
    'dark:border-blue-800',
    'dark:border-green-800',
    'dark:border-red-800',
    'dark:border-purple-800'
  ],
  content: [
    './src/report-generator/html-generator.ts',
    './src/report-generator/client/components/*.js',
    './src/report-generator/client/ReportApp.js',
    './src/report-generator/client/utils/*.js',
    // Legacy paths (deprecated)
    './src/report-generator/components/Layout.ts',
    './src/report-generator/components/Header.ts',
    './src/report-generator/components/Summary.ts',
    './src/report-generator/components/Suite.ts',
    './src/report-generator/components/Step.ts',
    './src/report-generator/components/Tabs.ts',
    './src/report-generator/components/Footer.ts'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1976d2', // azul logo
          dark: '#1565c0',
        },
        accent: {
          DEFAULT: '#43b581', // verde logo
          dark: '#2e8c5a',
        },
        warning: {
          DEFAULT: '#f7b500', // amarelo/dourado logo
          dark: '#c49000',
        },
        bg: {
          DEFAULT: '#f8fafc', // fundo claro
          dark: '#10151c', // fundo escuro
        },
        bgSecondary: {
          DEFAULT: '#ffffff',
          dark: '#18202b',
        },
        text: {
          DEFAULT: '#1a2733',
          dark: '#e3eaf2',
        },
        title: {
          DEFAULT: '#0a2540',
          dark: '#b2c7e6',
        },
        status: {
          DEFAULT: '#43b581',
          dark: '#43b581',
        },
        logoShadow: {
          DEFAULT: '0 2px 8px rgba(25, 118, 210, 0.08)',
          dark: '0 2px 8px rgba(67, 181, 129, 0.18)',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      fontFamily: {
        'mono': ['Monaco', 'Menlo', 'Consolas', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}