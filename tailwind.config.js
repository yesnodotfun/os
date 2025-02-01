/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        system7: {
          "window-bg": "#FFFFFF",
          "menubar-bg": "#FFFFFF",
          "title-bar": "#000000",
          "title-text": "#FFFFFF",
          border: "#000000",
          "button-highlight": "#FFFFFF",
          "button-shadow": "#808080",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      typography: {
        DEFAULT: {
          css: {
            p: {
              marginTop: "0.5em",
              marginBottom: "0.5em",
            },
            ul: {
              listStyleType: "disc",
              listStylePosition: "outside",
              marginLeft: "1.5em",
              marginTop: "0.5em",
              marginBottom: "0.5em",
            },
            ol: {
              listStyleType: "decimal",
              listStylePosition: "outside",
              marginLeft: "1.5em",
              marginTop: "0.5em",
              marginBottom: "0.5em",
            },
            "ul li, ol li": {
              marginTop: "0.25em",
              marginBottom: "0.25em",
              padding: 0,
            },
            "> ul > li p": {
              marginTop: "0.25em",
              marginBottom: "0.25em",
            },
            "> ol > li p": {
              marginTop: "0.25em",
              marginBottom: "0.25em",
            },
          },
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    function ({ addBase }) {
      addBase({
        img: {
          "image-rendering": "pixelated",
        },
      });
    },
  ],
  corePlugins: {
    preflight: true,
  },
};
