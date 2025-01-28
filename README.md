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

- Modern UI with Chicago Kare font and System 7-inspired design
- Audio visualization with WaveSurfer.js
- Multiple soundboard support with import/export functionality
- Customizable sound buttons with emojis and titles
- Keyboard shortcuts (1-9) for quick sound playback
- Microphone input device selection
- Responsive design for desktop and mobile
- Local storage persistence
- Drag and resize window support

## Development

The project uses:
- TypeScript for type safety
- ESLint for code quality
- Tailwind for utility-first CSS
- Radix UI primitives via shadcn/ui
- Lucide icons

## Project Structure

```
soundboard/
├── src/
│   ├── components/    # React components
│   └── App.tsx       # Main application
├── public/           # Static assets and soundboard presets
└── ...config files
```

## Scripts

- `bun dev` - Start development server
- `bun run build` - Build for production
- `bun run lint` - Run ESLint
- `bun run preview` - Preview production build

## Features in Detail

### Soundboard Management
- Create multiple soundboards
- Import/Export soundboards as JSON
- Rename and delete soundboards
- Reload from preset JSON file

### Sound Slots
- Record audio directly from microphone
- Play/Stop with click or number keys
- Add custom emojis and titles
- Visualize audio waveforms
- Delete individual sounds

### UI/UX
- System 7-inspired window design
- Draggable and resizable window
- Responsive layout for all screen sizes
- Dark mode support
- Keyboard shortcuts for quick access
