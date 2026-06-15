/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        // "Progressive Old Money" — Stealth Wealth Palette
        'deep-jungle':    '#0A1F1C',  // Library Leather — Primary Background
        'isabelline':     '#F5F2EA',  // Aged Paper — Content Surfaces
        'vegas-gold':     '#C5A059',  // Burnished Brass — Accent, Borders, CTAs
        'charcoal':       '#1C2329',  // India Ink — Primary Text
        'muted-brick':    '#8A2E2E',  // Sealing Wax — Error states
        'parchment-dark': '#E8E3D8',  // Darker parchment for hover states
        'forest-light':   '#112A26',  // Lighter jungle for cards/elevation
        'brass-light':    '#D4B76A',  // Lighter brass for hover
        'brass-dark':     '#A8884A',  // Darker brass for active
        // Code Editor Palette
        'code-bg':        '#1E1E1E',  // VS Code dark theme background
        'code-comment':   '#6A9955',  // Green comments
        'code-keyword':   '#569CD6',  // Blue keywords (from, import)
        'code-string':    '#CE9178',  // Orange strings
        'code-function':  '#DCDCAA',  // Yellow functions
        'code-variable':  '#9CDCFE',  // Light blue variables
        'terminal-green': '#4AF626',  // Classic terminal green
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', '"Times New Roman"', 'serif'],
        body:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'Menlo', 'Monaco', 'monospace'],
      },
      fontSize: {
        'hero':  ['clamp(3rem, 8vw, 6rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'title': ['clamp(2rem, 4vw, 3.5rem)', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
      },
      animation: {
        'fade-in':      'fadeIn 0.8s ease-out forwards',
        'fade-in-up':   'fadeInUp 0.8s ease-out forwards',
        'float':        'float 6s ease-in-out infinite',
        'signature':    'drawSignature 2s ease-out forwards',
        'typing':       'typing 2s steps(20) forwards',
        'fade-in-line': 'fadeInLine 0.5s ease-out forwards',
        'pulse-slow':   'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        drawSignature: {
          '0%':   { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        typing: {
          'from': { width: '0' },
          'to':   { width: '100%' },
        },
        fadeInLine: {
          '0%':   { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        'reading': '65ch',  // Optimal line length for readability
      },
      lineHeight: {
        'editorial': '1.75',
      },
    },
  },
  plugins: [],
}
