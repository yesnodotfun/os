# ryOS — Web-based Desktop Environment

A modern web-based desktop environment inspired by classic macOS, built with React and modern web technologies. Features multiple built-in applications and a familiar desktop interface. Works on all devices—including mobile, tablet, and desktop.

## Tech Stack

- React 18.3 with TypeScript
- Vite 6.0 for blazing fast development
- TailwindCSS 4.0 for styling
- shadcn/ui components
- Framer Motion for animations
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

### Desktop Environment

- Authentic macOS-style window management
- Multiple resizable and draggable windows
- Desktop icons and dock
- Window minimize/maximize controls
- Menu bar with application-specific menus

### Built-in Applications

- **Finder**: File system navigation and management
- **Text Editor**: Rich text editing with Tiptap
- **Chat**: AI-powered chat interface using OpenAI
- **Minesweeper**: Classic game implementation
- More applications coming soon!

### Core Features

- Window management system with z-index handling
- Application state management
- Local storage persistence
- Keyboard shortcuts
- Dark mode support
- Responsive design

## Project Structure

```
project/
├── src/
│   ├── apps/           # Individual applications
│   │   ├── base/       # Base app functionality
│   │   ├── finder/     # File system app
│   │   ├── textedit/   # Text editor app
│   │   ├── chats/      # Chat application
│   │   └── minesweeper/# Game implementation
│   ├── components/     # Shared React components
│   │   ├── layout/     # Core layout components
│   │   ├── ui/         # shadcn/ui components
│   │   └── dialogs/    # System dialogs
│   └── utils/         # Shared utilities
├── api/               # Backend API endpoints
├── public/           # Static assets
└── ...config files
```

## Development

The project uses:

- TypeScript for type safety
- ESLint for code quality
- Tailwind for utility-first CSS
- shadcn/ui components built on Radix UI primitives
- Lucide icons
- Vercel for deployment

## Scripts

- `bun dev` - Start development server
- `bun run build` - Build for production
- `bun run lint` - Run ESLint
- `bun run preview` - Preview production build

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
