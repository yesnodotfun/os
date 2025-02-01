import { useState } from "react";
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
    content: "<p>Welcome to TextEdit!</p>",
    autofocus: true,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none p-4",
      },
    },
  });

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
        <div className="flex flex-col h-full bg-white">
          <div className="flex gap-1 p-1 bg-[#c0c0c0] border-b border-black">
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`w-6 h-6 flex items-center justify-center ${
                editor?.isActive("bold") ? "bg-[#808080]" : ""
              }`}
            >
              <img
                src="/icons/text-editor/bold-off.png"
                alt="Bold"
                className="w-4 h-4"
              />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`w-6 h-6 flex items-center justify-center ${
                editor?.isActive("italic") ? "bg-[#808080]" : ""
              }`}
            >
              <img
                src="/icons/text-editor/italic-off.png"
                alt="Italic"
                className="w-4 h-4"
              />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className={`w-6 h-6 flex items-center justify-center ${
                editor?.isActive("underline") ? "bg-[#808080]" : ""
              }`}
            >
              <img
                src="/icons/text-editor/underline-off.png"
                alt="Underline"
                className="w-4 h-4"
              />
            </button>
            <div className="w-px h-6 bg-black mx-1" />
            <button
              onClick={() => editor?.chain().focus().setTextAlign("left").run()}
              className={`w-6 h-6 flex items-center justify-center ${
                editor?.isActive({ textAlign: "left" }) ? "bg-[#808080]" : ""
              }`}
            >
              <img
                src="/icons/text-editor/align-left-off.png"
                alt="Align Left"
                className="w-4 h-4"
              />
            </button>
            <button
              onClick={() =>
                editor?.chain().focus().setTextAlign("center").run()
              }
              className={`w-6 h-6 flex items-center justify-center ${
                editor?.isActive({ textAlign: "center" }) ? "bg-[#808080]" : ""
              }`}
            >
              <img
                src="/icons/text-editor/align-center-off.png"
                alt="Align Center"
                className="w-4 h-4"
              />
            </button>
            <button
              onClick={() =>
                editor?.chain().focus().setTextAlign("right").run()
              }
              className={`w-6 h-6 flex items-center justify-center ${
                editor?.isActive({ textAlign: "right" }) ? "bg-[#808080]" : ""
              }`}
            >
              <img
                src="/icons/text-editor/align-right-off.png"
                alt="Align Right"
                className="w-4 h-4"
              />
            </button>
            <div className="w-px h-6 bg-black mx-1" />
            <button
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`w-6 h-6 flex items-center justify-center ${
                editor?.isActive("bulletList") ? "bg-[#808080]" : ""
              }`}
            >
              <img
                src="/icons/text-editor/unordered-list-off.png"
                alt="Bullet List"
                className="w-4 h-4"
              />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`w-6 h-6 flex items-center justify-center ${
                editor?.isActive("orderedList") ? "bg-[#808080]" : ""
              }`}
            >
              <img
                src="/icons/text-editor/ordered-list-off.png"
                alt="Ordered List"
                className="w-4 h-4"
              />
            </button>
          </div>
          <EditorContent editor={editor} className="flex-1 overflow-auto" />
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
