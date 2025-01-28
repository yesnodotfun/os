# Soundboard.app spec and to-dos

## To-do features

- [ ] Add an abstraction to allow multiple apps, eg. "Soundboard.app" is just one of the apps.
- [ ] Apps show up in the desktop as DesktopIcons, and can show up in the Apple menu.
- [ ] Add a new app for "Assistant"


# Ideas
refactor the app to prepare for multi-app world. add a "app" abstraction
- make Soundboard.app one of the apps
- available apps show up in the desktop as icons, and also in the MenuBar
- separate out SoundboardApp out of App.tsx