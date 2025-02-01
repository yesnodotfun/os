import { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { AppProps } from "@/apps/base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { TextEditMenuBar } from "./TextEditMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { appMetadata, helpItems } from "..";
import { APP_STORAGE_KEYS } from "@/utils/storage";
import { SlashCommands } from "../extensions/SlashCommands";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Function to get a filename from content
const getFilenameFromContent = (html: string): string => {
  // Try to find the first heading
  const headingMatch = html.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
  if (headingMatch) {
    return headingMatch[1]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric chars with hyphens
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  }

  // If no heading, try to get first line of text
  const textMatch = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30);

  if (textMatch) {
    return textMatch
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // Fallback to default name
  return "document";
};

// Function to convert HTML to Markdown
const htmlToMarkdown = (html: string): string => {
  let markdown = html;

  // Convert tables
  markdown = markdown.replace(
    /<table[^>]*>(.*?)<\/table>/gis,
    (_, tableContent) => {
      const rows = tableContent.match(/<tr[^>]*>.*?<\/tr>/gis) || [];
      if (rows.length === 0) return "";

      const markdownRows = rows.map((row: string) => {
        const cells = row.match(/<t[dh][^>]*>(.*?)<\/t[dh]>/gi) || [];
        return (
          "| " +
          cells
            .map((cell: string) =>
              cell
                .replace(/<t[dh][^>]*>(.*?)<\/t[dh]>/i, "$1")
                .trim()
                .replace(/\|/g, "\\|")
            )
            .join(" | ") +
          " |"
        );
      });

      // Insert header separator after first row
      if (markdownRows.length > 0) {
        const columnCount = (markdownRows[0].match(/\|/g) || []).length - 1;
        const separator = "\n|" + " --- |".repeat(columnCount);
        markdownRows.splice(1, 0, separator);
      }

      return "\n" + markdownRows.join("\n") + "\n";
    }
  );

  // Convert code blocks
  markdown = markdown.replace(
    /<pre[^>]*><code[^>]*(?:class="language-([^"]+)")?[^>]*>(.*?)<\/code><\/pre>/gis,
    (_, language, code) => {
      const lang = language || "";
      return `\n\`\`\`${lang}\n${code
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")}\n\`\`\`\n`;
    }
  );

  // Convert inline code
  markdown = markdown.replace(
    /<code[^>]*>(.*?)<\/code>/gi,
    (_, code) =>
      `\`${code
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")}\``
  );

  // Basic HTML to Markdown conversion (existing conversions)
  markdown = markdown
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
    .replace(/<u[^>]*>(.*?)<\/u>/gi, "_$1_")
    .replace(/<ul[^>]*>(.*?)<\/ul>/gi, (_, list) => {
      return list
        .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
        .replace(/<[^>]+>/g, "");
    })
    .replace(/<ol[^>]*>(.*?)<\/ol>/gi, (_, list) => {
      let index = 1;
      return list
        .replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${index++}. $1\n`)
        .replace(/<[^>]+>/g, "");
    })
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<br[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "") // Remove any remaining HTML tags
    .replace(/&nbsp;/g, " ")
    .replace(/\n\n+/g, "\n\n") // Normalize multiple newlines
    .trim();

  return markdown;
};

// Function to convert HTML to plain text
const htmlToPlainText = (html: string): string => {
  return html
    .replace(/<[^>]+>/g, "") // Remove all HTML tags
    .replace(/&nbsp;/g, " ")
    .replace(/\n\n+/g, "\n\n")
    .trim();
};

export function TextEditAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      SlashCommands,
    ],
    content: "",
    autofocus: true,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm prose-neutral max-w-none focus:outline-none p-4 [&>ul]:list-disc [&>ol]:list-decimal [&>*]:my-1 [&>p]:leading-5 [&>h1]:mt-3 [&>h1]:mb-2 [&>h2]:mt-2 [&>h2]:mb-1 [&>ul]:my-1 [&>ol]:my-1 [&>ul>li]:my-0.5 [&>ol>li]:my-0.5 [&>ul]:pl-0 [&>ol]:pl-4 [&>ul>li>p]:my-0 [&>ol>li>p]:my-0 [&>ul>li]:pl-0 [&>ol>li]:pl-0 [&>ul>li]:marker:text-neutral-900 [&>ol>li]:marker:text-neutral-900 min-h-full",
      },
    },
    onUpdate: ({ editor }) => {
      localStorage.setItem(APP_STORAGE_KEYS.textedit.CONTENT, editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor) {
      const savedContent = localStorage.getItem(
        APP_STORAGE_KEYS.textedit.CONTENT
      );
      if (savedContent) {
        editor.commands.setContent(savedContent);
      }
    }
  }, [editor]);

  const handleNewFile = () => {
    if (editor) {
      editor.commands.clearContent();
      localStorage.removeItem(APP_STORAGE_KEYS.textedit.CONTENT);
    }
  };

  const handleImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && editor) {
      const text = await file.text();

      // If it's an HTML file, set the content directly
      if (file.name.endsWith(".html")) {
        editor.commands.setContent(text);
      } else {
        // For other file types, set as plain text within a paragraph
        editor.commands.setContent(`<p>${text}</p>`);
      }

      localStorage.setItem(APP_STORAGE_KEYS.textedit.CONTENT, editor.getHTML());
    }
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExportFile = (format: "html" | "md" | "txt") => {
    if (!editor) return;

    const html = editor.getHTML();
    let content: string;
    let mimeType: string;
    let extension: string;
    let filename = getFilenameFromContent(html);

    switch (format) {
      case "md":
        content = htmlToMarkdown(html);
        mimeType = "text/markdown";
        extension = "md";
        break;
      case "txt":
        content = htmlToPlainText(html);
        mimeType = "text/plain";
        extension = "txt";
        break;
      case "html":
      default:
        content = html;
        mimeType = "text/html";
        extension = "html";
        break;
    }

    // Use the generated filename, fallback to 'document' if empty
    filename = filename || "document";

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".txt,.html,.md,.rtf,.doc,.docx"
        className="hidden"
      />
      <TextEditMenuBar
        editor={editor}
        onClose={onClose}
        isWindowOpen={isWindowOpen}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        onNewFile={handleNewFile}
        onImportFile={handleImportFile}
        onExportFile={handleExportFile}
      />
      <WindowFrame
        title="TextEdit"
        onClose={onClose}
        isForeground={isForeground}
        appId="textedit"
      >
        <div className="flex flex-col h-full w-full bg-white">
          <div className="flex bg-[#c0c0c0] border-b border-black w-full">
            <div className="flex px-1 py-1 gap-x-1">
              {/* Text style group */}
              <div className="flex">
                <button
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className="w-[26px] h-[22px] flex items-center justify-center"
                >
                  <img
                    src={`/icons/text-editor/bold-${
                      editor?.isActive("bold") ? "depressed" : "off"
                    }.png`}
                    alt="Bold"
                    className="w-[26px] h-[22px]"
                  />
                </button>
                <button
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className="w-[26px] h-[22px] flex items-center justify-center"
                >
                  <img
                    src={`/icons/text-editor/italic-${
                      editor?.isActive("italic") ? "depressed" : "off"
                    }.png`}
                    alt="Italic"
                    className="w-[26px] h-[22px]"
                  />
                </button>
                <button
                  onClick={() =>
                    editor?.chain().focus().toggleUnderline().run()
                  }
                  className="w-[26px] h-[22px] flex items-center justify-center"
                >
                  <img
                    src={`/icons/text-editor/underline-${
                      editor?.isActive("underline") ? "depressed" : "off"
                    }.png`}
                    alt="Underline"
                    className="w-[26px] h-[22px]"
                  />
                </button>
              </div>

              {/* Divider */}
              <div className="w-[1px] h-[22px] bg-[#808080] shadow-[1px_0_0_#ffffff]" />

              {/* Heading selector */}
              <div className="flex">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-[120px] h-[22px] flex items-center justify-between px-2 bg-white border border-[#808080] text-sm">
                      {editor?.isActive("heading", { level: 1 })
                        ? "Heading 1"
                        : editor?.isActive("heading", { level: 2 })
                        ? "Heading 2"
                        : editor?.isActive("heading", { level: 3 })
                        ? "Heading 3"
                        : "Normal Text"}
                      <span className="ml-1">▼</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[120px]">
                    <DropdownMenuItem
                      onClick={() =>
                        editor?.chain().focus().setParagraph().run()
                      }
                      className={`text-sm h-6 px-2 ${
                        editor?.isActive("paragraph") ? "bg-gray-200" : ""
                      }`}
                    >
                      Normal Text
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        editor
                          ?.chain()
                          .focus()
                          .toggleHeading({ level: 1 })
                          .run()
                      }
                      className={`text-sm h-6 px-2 ${
                        editor?.isActive("heading", { level: 1 })
                          ? "bg-gray-200"
                          : ""
                      }`}
                    >
                      Heading 1
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        editor
                          ?.chain()
                          .focus()
                          .toggleHeading({ level: 2 })
                          .run()
                      }
                      className={`text-sm h-6 px-2 ${
                        editor?.isActive("heading", { level: 2 })
                          ? "bg-gray-200"
                          : ""
                      }`}
                    >
                      Heading 2
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        editor
                          ?.chain()
                          .focus()
                          .toggleHeading({ level: 3 })
                          .run()
                      }
                      className={`text-sm h-6 px-2 ${
                        editor?.isActive("heading", { level: 3 })
                          ? "bg-gray-200"
                          : ""
                      }`}
                    >
                      Heading 3
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Divider */}
              <div className="w-[1px] h-[22px] bg-[#808080] shadow-[1px_0_0_#ffffff]" />

              {/* Alignment group */}
              <div className="flex">
                <button
                  onClick={() =>
                    editor?.chain().focus().setTextAlign("left").run()
                  }
                  className="w-[26px] h-[22px] flex items-center justify-center"
                >
                  <img
                    src={`/icons/text-editor/align-left-${
                      editor?.isActive({ textAlign: "left" })
                        ? "depressed"
                        : "off"
                    }.png`}
                    alt="Align Left"
                    className="w-[26px] h-[22px]"
                  />
                </button>
                <button
                  onClick={() =>
                    editor?.chain().focus().setTextAlign("center").run()
                  }
                  className="w-[26px] h-[22px] flex items-center justify-center"
                >
                  <img
                    src={`/icons/text-editor/align-center-${
                      editor?.isActive({ textAlign: "center" })
                        ? "depressed"
                        : "off"
                    }.png`}
                    alt="Align Center"
                    className="w-[26px] h-[22px]"
                  />
                </button>
                <button
                  onClick={() =>
                    editor?.chain().focus().setTextAlign("right").run()
                  }
                  className="w-[26px] h-[22px] flex items-center justify-center"
                >
                  <img
                    src={`/icons/text-editor/align-right-${
                      editor?.isActive({ textAlign: "right" })
                        ? "depressed"
                        : "off"
                    }.png`}
                    alt="Align Right"
                    className="w-[26px] h-[22px]"
                  />
                </button>
              </div>

              {/* Divider */}
              <div className="w-[1px] h-[22px] bg-[#808080] shadow-[1px_0_0_#ffffff]" />

              {/* List group */}
              <div className="flex">
                <button
                  onClick={() =>
                    editor?.chain().focus().toggleBulletList().run()
                  }
                  className="w-[26px] h-[22px] flex items-center justify-center"
                >
                  <img
                    src={`/icons/text-editor/unordered-list-${
                      editor?.isActive("bulletList") ? "depressed" : "off"
                    }.png`}
                    alt="Bullet List"
                    className="w-[26px] h-[22px]"
                  />
                </button>
                <button
                  onClick={() =>
                    editor?.chain().focus().toggleOrderedList().run()
                  }
                  className="w-[26px] h-[22px] flex items-center justify-center"
                >
                  <img
                    src={`/icons/text-editor/ordered-list-${
                      editor?.isActive("orderedList") ? "depressed" : "off"
                    }.png`}
                    alt="Ordered List"
                    className="w-[26px] h-[22px]"
                  />
                </button>
              </div>
            </div>
          </div>
          <EditorContent
            editor={editor}
            className="flex-1 overflow-auto w-full h-full"
          />
        </div>
        <HelpDialog
          isOpen={isHelpDialogOpen}
          onOpenChange={setIsHelpDialogOpen}
          helpItems={helpItems}
          appName="TextEdit"
        />
        <AboutDialog
          isOpen={isAboutDialogOpen}
          onOpenChange={setIsAboutDialogOpen}
          metadata={appMetadata}
        />
      </WindowFrame>
    </>
  );
}
