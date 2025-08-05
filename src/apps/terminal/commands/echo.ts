import { Command } from "../types";

export const echoCommand: Command = {
  name: "echo",
  description: "Display text",
  usage: "echo <text>",
  handler: (args) => ({
    output: args.join(" "),
    isError: false,
  }),
};