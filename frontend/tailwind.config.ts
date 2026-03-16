import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
    	container: {
    		center: true,
    		padding: '2rem',
    		screens: {
    			'2xl': '1400px'
    		}
    	},
    	extend: {
    		colors: {
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			sidebar: {
    				DEFAULT: 'hsl(var(--sidebar-background))',
    				foreground: 'hsl(var(--sidebar-foreground))',
    				primary: 'hsl(var(--sidebar-primary))',
    				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
    				accent: 'hsl(var(--sidebar-accent))',
    				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
    				border: 'hsl(var(--sidebar-border))',
    				ring: 'hsl(var(--sidebar-ring))'
    			},
    			cognisim: {
    				teal: '#9F9EA1',
    				dark: '#3F3F3F',
    				light: '#F6F6F7',
    				accent: '#C8C8C9',
    				muted: '#F1F1F1'
    			},
    			chart: {
    				primary: '#3b82f6',
    				secondary: '#10b981',
    				tertiary: '#8b5cf6',
    				quaternary: '#f59e0b',
    				quinary: '#ef4444',
    				success: '#10b981',
    				warning: '#eab308',
    				danger: '#ef4444',
    				info: '#06b6d4',
    				type: {
    					story: '#10b981',
    					task: '#3b82f6',
    					bug: '#ef4444',
    					epic: '#8b5cf6',
    					untyped: '#94a3b8'
    				},
    				priority: {
    					highest: '#dc2626',
    					high: '#f97316',
    					medium: '#eab308',
    					low: '#3b82f6',
    					lowest: '#6b7280',
    					none: '#94a3b8'
    				},
    				status: {
    					todo: '#94a3b8',
    					'in-progress': '#3b82f6',
    					doing: '#3b82f6',
    					done: '#10b981',
    					completed: '#10b981'
    				}
    			}
    		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		fontFamily: {
    			space: [
    				'Space Grotesk',
    				'sans-serif'
    			]
    		},
    		keyframes: {
    			'accordion-down': {
    				from: {
    					height: '0'
    				},
    				to: {
    					height: 'var(--radix-accordion-content-height)'
    				}
    			},
    			'accordion-up': {
    				from: {
    					height: 'var(--radix-accordion-content-height)'
    				},
    				to: {
    					height: '0'
    				}
    			},
    			'slide-in': {
    				'0%': {
    					transform: 'translateX(-20px)',
    					opacity: '0'
    				},
    				'100%': {
    					transform: 'translateX(0)',
    					opacity: '1'
    				}
    			},
    			'slide-up': {
    				'0%': {
    					transform: 'translateY(20px)',
    					opacity: '0'
    				},
    				'100%': {
    					transform: 'translateY(0)',
    					opacity: '1'
    				}
    			},
    			'fade-in': {
    				'0%': {
    					opacity: '0'
    				},
    				'100%': {
    					opacity: '1'
    				}
    			},
    			float: {
    				'0%, 100%': {
    					transform: 'translateY(0)'
    				},
    				'50%': {
    					transform: 'translateY(-10px)'
    				}
    			},
    			'float-gentle': {
    				'0%, 100%': {
    					transform: 'translateY(0) rotate(0deg)'
    				},
    				'25%': {
    					transform: 'translateY(-5px) rotate(1deg)'
    				},
    				'75%': {
    					transform: 'translateY(-8px) rotate(-1deg)'
    				}
    			},
    			'pulse-slow': {
    				'0%, 100%': {
    					opacity: '1'
    				},
    				'50%': {
    					opacity: '0.8'
    				}
    			},
    			'pulse-glow': {
    				'0%, 100%': {
    					boxShadow: '0 0 20px -5px rgba(56, 189, 248, 0.3)'
    				},
    				'50%': {
    					boxShadow: '0 0 30px -5px rgba(56, 189, 248, 0.5)'
    				}
    			},
    			'scale-in-out': {
    				'0%, 100%': {
    					transform: 'scale(1)'
    				},
    				'50%': {
    					transform: 'scale(1.05)'
    				}
    			},
    			'rotate-slow': {
    				'0%': {
    					transform: 'rotate(0deg)'
    				},
    				'100%': {
    					transform: 'rotate(360deg)'
    				}
    			},
    			'bounce-subtle': {
    				'0%, 100%': {
    					transform: 'translateY(0)'
    				},
    				'50%': {
    					transform: 'translateY(-4px)'
    				}
    			},
    			shimmer: {
    				'0%': {
    					backgroundPosition: '-200% 0'
    				},
    				'100%': {
    					backgroundPosition: '200% 0'
    				}
    			},
    			'gradient-shift': {
    				'0%, 100%': {
    					backgroundPosition: '0% 50%'
    				},
    				'50%': {
    					backgroundPosition: '100% 50%'
    				}
    			},
    			'border-glow': {
    				'0%, 100%': {
    					borderColor: 'rgba(255, 255, 255, 0.1)'
    				},
    				'50%': {
    					borderColor: 'rgba(56, 189, 248, 0.3)'
    				}
    			}
    		},
			animation: {
    			'accordion-down': 'accordion-down 0.2s ease-out',
    			'accordion-up': 'accordion-up 0.2s ease-out',
    			'slide-in': 'slide-in 0.4s ease-out',
    			'slide-up': 'slide-up 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    			'fade-in': 'fade-in 0.4s ease-out',
    			float: 'float 6s ease-in-out infinite',
    			'float-gentle': 'float-gentle 8s ease-in-out infinite',
    			'pulse-slow': 'pulse-slow 4s ease-in-out infinite',
    			'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
    			'scale-in-out': 'scale-in-out 3s ease-in-out infinite',
    			'rotate-slow': 'rotate-slow 20s linear infinite',
    			'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
    			shimmer: 'shimmer 3s linear infinite',
    			'gradient-shift': 'gradient-shift 6s ease infinite',
    			'border-glow': 'border-glow 3s ease-in-out infinite'
    		}
    	},
    	plugins: [
    		'tailwindcssAnimate'
    	]
    } 
} satisfies Config;
