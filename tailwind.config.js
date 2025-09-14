/** @type {import('tailwindcss').Config} */
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
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
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        }
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