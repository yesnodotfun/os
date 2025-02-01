import { Extension } from "@tiptap/core";
import Suggestion, {
  SuggestionOptions,
  SuggestionProps,
} from "@tiptap/suggestion";
import { Editor } from "@tiptap/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";

interface CommandItem {
  title: string;
  description: string;
  command: (editor: Editor) => void;
}

const SlashMenuContent = ({
  items,
  onCommand,
}: {
  items: CommandItem[];
  onCommand: (command: CommandItem) => void;
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when items change (when filtering)
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle navigation keys
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % items.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
          break;
        case "Enter":
          e.preventDefault();
          if (items.length > 0) {
            onCommand(items[selectedIndex]);
          }
          break;
        // Let other keys pass through to the editor
        default:
          return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIndex, onCommand]);

  return (
    <div className="p-1">
      {items.map((item, index) => (
        <div
          key={index}
          role="menuitem"
          onClick={() => onCommand(item)}
          onMouseEnter={() => setSelectedIndex(index)}
          className={`h-8 px-2 py-1.5 text-sm rounded-sm cursor-default select-none outline-none ${
            index === selectedIndex
              ? "bg-accent text-accent-foreground"
              : "text-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          {item.title}
        </div>
      ))}
    </div>
  );
};

const commands: CommandItem[] = [
  {
    title: "Text",
    description: "Just start typing with plain text",
    command: (editor: Editor) => {
      editor.chain().focus().setParagraph().run();
    },
  },
  {
    title: "Heading 1",
    description: "Large section heading",
    command: (editor: Editor) => {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    command: (editor: Editor) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    command: (editor: Editor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list",
    command: (editor: Editor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a numbered list",
    command: (editor: Editor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    title: "Bold",
    description: "Make text bold",
    command: (editor: Editor) => {
      editor.chain().focus().toggleBold().run();
    },
  },
  {
    title: "Italic",
    description: "Make text italic",
    command: (editor: Editor) => {
      editor.chain().focus().toggleItalic().run();
    },
  },
  {
    title: "Underline",
    description: "Make text underlined",
    command: (editor: Editor) => {
      editor.chain().focus().toggleUnderline().run();
    },
  },
];

const suggestion: Partial<SuggestionOptions> = {
  char: "/",
  startOfLine: false,
  command: ({
    editor,
    range,
    props,
  }: {
    editor: Editor;
    range: { from: number; to: number };
    props: { command: CommandItem };
  }) => {
    props.command.command(editor);
    editor.commands.deleteRange(range);
  },
  items: ({ query }: { query: string }) => {
    return commands
      .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);
  },
  render: () => {
    let root: ReturnType<typeof createRoot> | null = null;
    let container: HTMLElement | null = null;

    const cleanup = () => {
      if (root) {
        root.unmount();
      }
      if (container) {
        container.remove();
      }
    };

    return {
      onStart: (props: SuggestionProps) => {
        const rect = props.clientRect?.();
        if (!rect) return;

        container = document.createElement("div");
        if (!container) return;

        container.style.position = "absolute";
        container.style.zIndex = "50";
        document.body.appendChild(container);

        root = createRoot(container);
        if (!root) return;

        root.render(
          <DropdownMenu open>
            <DropdownMenuContent
              style={{
                position: "fixed",
                top: `${rect.top + rect.height}px`,
                left: `${rect.left}px`,
              }}
              className="w-72"
            >
              <SlashMenuContent
                items={props.items}
                onCommand={(command: CommandItem) => {
                  props.command({ command });
                  cleanup();
                }}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },

      onUpdate: (props: SuggestionProps) => {
        const rect = props.clientRect?.();
        if (!rect || !root || !container) return;

        container.style.position = "absolute";
        container.style.zIndex = "50";

        root.render(
          <DropdownMenu open>
            <DropdownMenuContent
              style={{
                position: "fixed",
                top: `${rect.top + rect.height}px`,
                left: `${rect.left}px`,
              }}
              className="w-72"
            >
              <SlashMenuContent
                items={props.items}
                onCommand={(command: CommandItem) => {
                  props.command({ command });
                  cleanup();
                }}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },

      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === "Escape") {
          cleanup();
          return true;
        }
        return false;
      },

      onExit: cleanup,
    };
  },
};

export const SlashCommands = Extension.create({
  name: "slash-commands",
  addOptions() {
    return {
      suggestion,
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
