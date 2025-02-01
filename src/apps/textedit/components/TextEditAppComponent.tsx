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
    ],
    content: "",
    autofocus: true,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none p-4",
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
            <div className="flex">
              <button
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className="w-6 h-6 flex items-center justify-center"
              >
                <img
                  src={`/icons/text-editor/bold-${
                    editor?.isActive("bold") ? "depressed" : "off"
                  }.png`}
                  alt="Bold"
                  className="w-4 h-4"
                />
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className="w-6 h-6 flex items-center justify-center"
              >
                <img
                  src={`/icons/text-editor/italic-${
                    editor?.isActive("italic") ? "depressed" : "off"
                  }.png`}
                  alt="Italic"
                  className="w-4 h-4"
                />
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className="w-6 h-6 flex items-center justify-center"
              >
                <img
                  src={`/icons/text-editor/underline-${
                    editor?.isActive("underline") ? "depressed" : "off"
                  }.png`}
                  alt="Underline"
                  className="w-4 h-4"
                />
              </button>
              <div className="w-px h-6 bg-black" />
              <button
                onClick={() =>
                  editor?.chain().focus().setTextAlign("left").run()
                }
                className="w-6 h-6 flex items-center justify-center"
              >
                <img
                  src={`/icons/text-editor/align-left-${
                    editor?.isActive({ textAlign: "left" })
                      ? "depressed"
                      : "off"
                  }.png`}
                  alt="Align Left"
                  className="w-4 h-4"
                />
              </button>
              <button
                onClick={() =>
                  editor?.chain().focus().setTextAlign("center").run()
                }
                className="w-6 h-6 flex items-center justify-center"
              >
                <img
                  src={`/icons/text-editor/align-center-${
                    editor?.isActive({ textAlign: "center" })
                      ? "depressed"
                      : "off"
                  }.png`}
                  alt="Align Center"
                  className="w-4 h-4"
                />
              </button>
              <button
                onClick={() =>
                  editor?.chain().focus().setTextAlign("right").run()
                }
                className="w-6 h-6 flex items-center justify-center"
              >
                <img
                  src={`/icons/text-editor/align-right-${
                    editor?.isActive({ textAlign: "right" })
                      ? "depressed"
                      : "off"
                  }.png`}
                  alt="Align Right"
                  className="w-4 h-4"
                />
              </button>
              <div className="w-px h-6 bg-black" />
              <button
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className="w-6 h-6 flex items-center justify-center"
              >
                <img
                  src={`/icons/text-editor/unordered-list-${
                    editor?.isActive("bulletList") ? "depressed" : "off"
                  }.png`}
                  alt="Bullet List"
                  className="w-4 h-4"
                />
              </button>
              <button
                onClick={() =>
                  editor?.chain().focus().toggleOrderedList().run()
                }
                className="w-6 h-6 flex items-center justify-center"
              >
                <img
                  src={`/icons/text-editor/ordered-list-${
                    editor?.isActive("orderedList") ? "depressed" : "off"
                  }.png`}
                  alt="Ordered List"
                  className="w-4 h-4"
                />
              </button>
            </div>
          </div>
          <EditorContent
            editor={editor}
            className="flex-1 overflow-auto w-full"
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
