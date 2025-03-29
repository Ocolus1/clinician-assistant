import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      spacing: {
        sidebar: '240px',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        // Primary Colors
        "primary-blue": {
          900: "#1E4E8C", // For darkest accents and hover states
          700: "#2A69DD", // For strong emphasis and important elements
          500: "#3B82F6", // Main primary color
          300: "#7EB0FF", // For lighter UI elements and highlights
          100: "#C7DDFF", // For very subtle blue backgrounds
        },
        // Secondary Colors
        "teal": {
          900: "#1D6A66", // For darkest teal accents
          700: "#2C9490", // For strong teal emphasis
          500: "#38B2AC", // Main secondary color
          300: "#7AD1CC", // For lighter teal elements
          100: "#C4F1EE", // For very subtle teal backgrounds
        },
        // Neutral Colors
        "gray": {
          900: "#1A202C", // Darkest gray for high contrast text
          800: "#2D3748", // For primary text
          600: "#4A5568", // For headings and subheadings
          500: "#718096", // For secondary text
          400: "#A0AEC0", // For placeholder text and disabled states
          300: "#CBD5E0", // For borders and dividers
          200: "#E2E8F0", // For light backgrounds and hover states
          100: "#EDF2F7", // For backgrounds of interactive elements
          50: "#F7FAFC", // For main content backgrounds
        },
        // Feedback Colors
        "success": {
          700: "#2F855A", // Dark green for hover states on success buttons
          500: "#48BB78", // Primary success color
          300: "#9AE6B4", // Light success for backgrounds and subtle indicators
          100: "#C6F6D5", // Very light success for background states
        },
        "warning": {
          700: "#C05621", // Dark orange for hover states on warning buttons
          500: "#F6AD55", // Primary warning color
          300: "#FBD38D", // Light warning for backgrounds and subtle indicators
          100: "#FEEBC8", // Very light warning for background states
        },
        "error": {
          700: "#C53030", // Dark red for hover states on error buttons
          500: "#F56565", // Primary error color
          300: "#FC8181", // Light error for backgrounds and subtle indicators
          100: "#FED7D7", // Very light error for background states
        },
        "info": {
          700: "#2B6CB0", // Dark blue for hover states on info buttons
          500: "#4299E1", // Primary info color
          300: "#90CDF4", // Light info for backgrounds and subtle indicators
          100: "#D0E5FA", // Very light info for background states
        },
        // Legacy color system (keep for backward compatibility)
        "google-blue": "#1a73e8", 
        "google-gray": {
          50: "#f8f9fa",
          100: "#f1f3f4",
          200: "#e8eaed",
          300: "#dadce0",
          400: "#bdc1c6",
          500: "#9aa0a6",
          600: "#80868b",
          700: "#5f6368",
          800: "#3c4043",
          900: "#202124",
        },
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
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
