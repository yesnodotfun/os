import { Command } from "../types";

export const aboutCommand: Command = {
  name: "about",
  description: "About terminal",
  handler: (_, context) => {
    setTimeout(() => context.setIsAboutDialogOpen(true), 100);
    return {
      output: "opening about dialog...",
      isError: false,
    };
  },
};