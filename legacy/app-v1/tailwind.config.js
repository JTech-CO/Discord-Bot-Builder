/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                discord: {
                    blurple: '#5865F2',
                    green: '#3BA55C',
                    red: '#ED4245',
                    yellow: '#FAA61A',
                    'bg-primary': '#36393F',
                    'bg-secondary': '#2F3136',
                    'bg-tertiary': '#202225',
                    'bg-floating': '#18191C',
                    'text-normal': '#DCDDDE',
                    'text-muted': '#72767D',
                    'text-link': '#00AFF4',
                    'header-primary': '#FFFFFF',
                    'header-secondary': '#B9BBBE',
                    'interactive-normal': '#B9BBBE',
                    'interactive-hover': '#DCDDDE',
                    'interactive-active': '#FFFFFF',
                },
            },
            borderRadius: {
                'sm-discord': '2px',
                'md-discord': '4px',
            },
            fontFamily: {
                sans: ['"Noto Sans KR"', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            spacing: {
                'sidebar': '280px',
                'inspector': '320px',
                'titlebar': '32px',
            },
        },
    },
    plugins: [],
};
