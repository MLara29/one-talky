/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			card: {
  				DEFAULT: 'var(--card)',
  				foreground: 'var(--card-foreground)'
  			},
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
  			primary: {
  				DEFAULT: 'var(--primary)',
  				foreground: 'var(--primary-foreground)'
  			},
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			destructive: {
  				DEFAULT: 'var(--destructive)',
  				foreground: 'var(--destructive-foreground)'
  			},
  			border: 'var(--border)',
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  			chart: {
  				'1': 'var(--chart-1)',
  				'2': 'var(--chart-2)',
  				'3': 'var(--chart-3)',
  				'4': 'var(--chart-4)',
  				'5': 'var(--chart-5)'
  			},
  			sidebar: {
  				DEFAULT: 'var(--sidebar)',
  				foreground: 'var(--sidebar-foreground)',
  				primary: 'var(--sidebar-primary)',
  				'primary-foreground': 'var(--sidebar-primary-foreground)',
  				accent: 'var(--sidebar-accent)',
  				'accent-foreground': 'var(--sidebar-accent-foreground)',
  				border: 'var(--sidebar-border)',
  				ring: 'var(--sidebar-ring)'
  			}
  		},
  		fontFamily: {
  			sans: ['var(--font-sans)', 'Inter', 'ui-sans-serif'],
  			serif: ['var(--font-serif)', 'Georgia', 'ui-serif'],
  			mono: ['var(--font-mono)', 'Menlo', 'ui-monospace'],
  			heading: ['var(--font-heading)', 'Poppins', 'ui-sans-serif'],
  			body: ['var(--font-body)', 'Inter', 'ui-sans-serif'],
  			display: ['var(--font-display)', 'Poppins', 'ui-sans-serif'],
  		},
  		keyframes: {
  			'float': {
  				'0%, 100%': { transform: 'translateY(0px)' },
  				'50%': { transform: 'translateY(-12px)' },
  			},
  			'pulse-glow': {
  				'0%, 100%': { boxShadow: '0 0 0 0 rgba(103,114,229,0.4)' },
  				'50%': { boxShadow: '0 0 0 12px rgba(103,114,229,0)' },
  			},
  			'shimmer': {
  				'0%': { backgroundPosition: '-200% 0' },
  				'100%': { backgroundPosition: '200% 0' },
  			},
  			'fade-up': {
  				'0%': { opacity: '0', transform: 'translateY(24px)' },
  				'100%': { opacity: '1', transform: 'translateY(0)' },
  			},
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'float': 'float 4s ease-in-out infinite',
  			'float-slow': 'float 6s ease-in-out infinite',
  			'float-delayed': 'float 5s ease-in-out infinite 1.5s',
  			'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
  			'fade-up': 'fade-up 0.6s ease-out forwards',
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
