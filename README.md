# Soundboard

A modern soundboard application built with React, Vite, and TailwindCSS. Features a sleek UI powered by shadcn components and WaveSurfer.js for audio visualization.

## Tech Stack

- React 18.3 with TypeScript
- Vite 6.0 for blazing fast development
- TailwindCSS 4.0 for styling
- shadcn/ui components
- WaveSurfer.js for audio waveform visualization
- Bun as package manager

## Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Build for production
bun run build
```

## Features

- Modern UI with Chicago Kare font
- Audio visualization
- Customizable sound buttons
- Responsive design

## Development

The project uses:
- TypeScript for type safety
- ESLint for code quality
- Tailwind for utility-first CSS
- Radix UI primitives via shadcn/ui

## Project Structure

```
soundboard/
├── src/
│   ├── components/    # React components
│   └── App.tsx       # Main application
├── public/           # Static assets
└── ...config files
```

## Scripts

- `bun dev` - Start development server
- `bun run build` - Build for production
- `bun run lint` - Run ESLint
- `bun run preview` - Preview production build
