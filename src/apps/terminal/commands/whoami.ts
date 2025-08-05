import { Command } from "../types";

export const whoamiCommand: Command = {
  name: "whoami",
  description: "Display current user",
  handler: (_, context) => ({
    output: context.username || "you",
    isError: false,
  }),
};