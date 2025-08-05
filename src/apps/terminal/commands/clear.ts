import { Command } from "../types";

export const clearCommand: Command = {
  name: "clear",
  description: "Clear terminal screen",
  handler: () => ({
    output: "",
    isError: false,
  }),
};