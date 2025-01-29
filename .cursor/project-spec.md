# Soundboard.app spec and to-dos

## To-do features

- [x] Add an abstraction to allow multiple apps, eg. "Soundboard.app" is just one of the apps.
- [x] Apps show up in the desktop as DesktopIcons, and can show up in the Apple menu.
- [ ] Add a new app for "Internet Explorer"

## App architecture
- New apps are defined in src/apps/[app-name]/index.tsx
- App components are defined in src/apps/[app-name]/components/[component-name].tsx
- Apps are imported and registered in src/App.tsx
- AppManager.tsx is the main entry point for the app, and is responsible for rendering the apps and managing the state of the apps.
