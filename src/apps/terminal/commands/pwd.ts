import { Command } from "../types";

export const pwdCommand: Command = {
  name: "pwd",
  description: "Show current directory",
  handler: (_, context) => ({
    output: context.currentPath,
    isError: false,
  }),
};