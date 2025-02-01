import { Editor } from "@tiptap/react";
import { MenuBar } from "@/components/layout/MenuBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface TextEditMenuBarProps {
  editor: Editor | null;
  onClose: () => void;
  onShowHelp: () => void;
  onShowAbout: () => void;
  isWindowOpen: boolean;
}

export function TextEditMenuBar({
  editor,
  onClose,
  onShowHelp,
  onShowAbout,
}: TextEditMenuBarProps) {
  return (
    <MenuBar>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-2 py-1 border-none hover:bg-gray-200 active:bg-gray-900 active:text-white focus-visible:ring-0"
          >
            File
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={onClose}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Close
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-2 py-1 border-none hover:bg-gray-200 active:bg-gray-900 active:text-white focus-visible:ring-0"
          >
            Edit
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().undo().run()}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Undo
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().redo().run()}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Redo
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={() => {
              if (window.getSelection()?.toString()) {
                document.execCommand("copy");
              }
            }}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Copy
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              if (window.getSelection()?.toString()) {
                document.execCommand("cut");
              }
            }}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Cut
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => document.execCommand("paste")}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Paste
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().selectAll().run()}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Select All
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-2 py-1 border-none hover:bg-gray-200 active:bg-gray-900 active:text-white focus-visible:ring-0"
          >
            Format
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`text-md h-6 px-3 active:bg-gray-900 active:text-white ${
              editor?.isActive("bold") ? "bg-gray-200" : ""
            }`}
          >
            Bold
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`text-md h-6 px-3 active:bg-gray-900 active:text-white ${
              editor?.isActive("italic") ? "bg-gray-200" : ""
            }`}
          >
            Italic
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            className={`text-md h-6 px-3 active:bg-gray-900 active:text-white ${
              editor?.isActive("underline") ? "bg-gray-200" : ""
            }`}
          >
            Underline
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().setTextAlign("left").run()}
            className={`text-md h-6 px-3 active:bg-gray-900 active:text-white ${
              editor?.isActive({ textAlign: "left" }) ? "bg-gray-200" : ""
            }`}
          >
            Align Left
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
            className={`text-md h-6 px-3 active:bg-gray-900 active:text-white ${
              editor?.isActive({ textAlign: "center" }) ? "bg-gray-200" : ""
            }`}
          >
            Align Center
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().setTextAlign("right").run()}
            className={`text-md h-6 px-3 active:bg-gray-900 active:text-white ${
              editor?.isActive({ textAlign: "right" }) ? "bg-gray-200" : ""
            }`}
          >
            Align Right
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={`text-md h-6 px-3 active:bg-gray-900 active:text-white ${
              editor?.isActive("bulletList") ? "bg-gray-200" : ""
            }`}
          >
            Bullet List
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className={`text-md h-6 px-3 active:bg-gray-900 active:text-white ${
              editor?.isActive("orderedList") ? "bg-gray-200" : ""
            }`}
          >
            Numbered List
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="default"
            className="h-6 text-md px-2 py-1 border-none hover:bg-gray-200 active:bg-gray-900 active:text-white focus-visible:ring-0"
          >
            Help
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={1} className="px-0">
          <DropdownMenuItem
            onClick={onShowHelp}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            Get Help
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuItem
            onClick={onShowAbout}
            className="text-md h-6 px-3 active:bg-gray-900 active:text-white"
          >
            About TextEdit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </MenuBar>
  );
}
