# Soundboard.app spec and to-dos

## To-do features

- [x] Add an abstraction to allow multiple apps, eg. "Soundboard.app" is just one of the apps.
- [x] Apps show up in the desktop as DesktopIcons, and can show up in the Apple menu.
- [x] Add a new app for "Internet Explorer"
- [x] Refactor the Apple Menu out of the SoundboardMenuBar.tsx into a new layout component
- [x] Clean up MenuBar.tsx to show default menu bar with no app specific menu items when no app is active

- [] create a new synthesizer music app structured like other apps eg. @TextEditAppComponent.tsx , with the following features:
  - synthesizer in window frame, show a virtual piano keyboard
  - simple menu bar like @TextEditMenuBar.tsx
  - play synth using the same tone.js as @useChatSynth.ts
  - allow playing with qwerty
  - allow switching between different preset sounds

## App architecture

- New apps are defined in src/apps/[app-name]/index.tsx
- App components are defined in src/apps/[app-name]/components/[component-name].tsx
- Apps are imported and registered in src/App.tsx
- AppManager.tsx is the main entry point for the app, and is responsible for rendering the apps and managing the state of the apps.
