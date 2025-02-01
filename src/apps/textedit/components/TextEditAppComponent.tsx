import { useState, useEffect } from "react";
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

export function TextEditAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);

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

  return (
    <>
      <TextEditMenuBar
        editor={editor}
        onClose={onClose}
        isWindowOpen={isWindowOpen}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
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
