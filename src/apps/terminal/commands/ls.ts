import { Command } from "../types";

export const lsCommand: Command = {
  name: "ls",
  description: "List directory contents",
  handler: (_, context) => {
    if (context.files.length === 0) {
      return { output: "no files found", isError: false };
    }
    return {
      output: context.files
        .map((file) => (file.isDirectory ? file.name : file.name))
        .join("\n"),
      isError: false,
    };
  },
};