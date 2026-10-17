module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          DEFAULT: '#087F8C',
          light: '#E6F4F5',
          dark: '#06636E',
          50: '#F0F9FA',
          100: '#E6F4F5',
          200: '#C2E5E8',
          500: '#087F8C',
          600: '#076F7B',
          700: '#065F69',
        },
        navy: {
          DEFAULT: '#142B3B',
          light: '#1B3A4F',
          dark: '#0E1F2B',
          800: '#112330',
          900: '#0A1721',
        },
        surface: {
          bg: '#F7F9F8',
          card: '#FFFFFF',
          border: '#E5EAE9',
          subtle: '#EEF2F1',
        },
        charcoal: '#1D2935',
        slateText: '#64748B',
        success: {
          DEFAULT: '#16875D',
          light: '#E8F5EE',
          dark: '#116847',
        },
        warning: {
          DEFAULT: '#D28A21',
          light: '#FCF4E9',
          dark: '#A66B15',
        },
        critical: {
          DEFAULT: '#C84848',
          light: '#FAEDED',
          dark: '#A03434',
        },
      },
      borderRadius: {
        card: '14px',
        btn: '10px',
        input: '8px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(20, 43, 59, 0.05), 0 1px 2px rgba(20, 43, 59, 0.03)',
        card: '0 2px 8px -2px rgba(20, 43, 59, 0.06), 0 1px 4px -1px rgba(20, 43, 59, 0.04)',
        elevated: '0 8px 24px -4px rgba(20, 43, 59, 0.08), 0 4px 12px -2px rgba(20, 43, 59, 0.04)',
        'glow-brand': '0 0 20px -3px rgba(8, 127, 140, 0.35)',
        'glow-success': '0 0 16px -2px rgba(22, 135, 93, 0.35)',
        'glow-critical': '0 0 16px -2px rgba(200, 72, 72, 0.4)',
        'glow-warning': '0 0 16px -2px rgba(210, 138, 33, 0.35)',
        'card-hover': '0 8px 30px -4px rgba(20, 43, 59, 0.08), 0 2px 10px -2px rgba(8, 127, 140, 0.08)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'wave-bar': 'wave 1.2s ease-in-out infinite',
      },
      keyframes: {
        wave: {
          '0%, 100%': { height: '4px' },
          '50%': { height: '18px' },
        },
      },
    },
  },
  plugins: [],
};
