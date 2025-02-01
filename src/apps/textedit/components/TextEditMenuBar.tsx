import { Editor } from "@tiptap/react";
import { MenuBar } from "@/components/layout/MenuBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
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
          <DropdownMenuCheckboxItem
            checked={editor?.isActive("bold")}
            onCheckedChange={() => editor?.chain().focus().toggleBold().run()}
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>Bold</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={editor?.isActive("italic")}
            onCheckedChange={() => editor?.chain().focus().toggleItalic().run()}
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>Italic</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={editor?.isActive("underline")}
            onCheckedChange={() =>
              editor?.chain().focus().toggleUnderline().run()
            }
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>Underline</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuCheckboxItem
            checked={editor?.isActive("paragraph")}
            onCheckedChange={() => editor?.chain().focus().setParagraph().run()}
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>Normal Text</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={editor?.isActive("heading", { level: 1 })}
            onCheckedChange={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>Heading 1</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={editor?.isActive("heading", { level: 2 })}
            onCheckedChange={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>Heading 2</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={editor?.isActive("heading", { level: 3 })}
            onCheckedChange={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>Heading 3</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuCheckboxItem
            checked={editor?.isActive({ textAlign: "left" })}
            onCheckedChange={() =>
              editor?.chain().focus().setTextAlign("left").run()
            }
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>Align Left</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={editor?.isActive({ textAlign: "center" })}
            onCheckedChange={() =>
              editor?.chain().focus().setTextAlign("center").run()
            }
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>Align Center</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={editor?.isActive({ textAlign: "right" })}
            onCheckedChange={() =>
              editor?.chain().focus().setTextAlign("right").run()
            }
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>Align Right</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator className="h-[2px] bg-black my-1" />
          <DropdownMenuCheckboxItem
            checked={editor?.isActive("bulletList")}
            onCheckedChange={() =>
              editor?.chain().focus().toggleBulletList().run()
            }
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>Bullet List</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={editor?.isActive("orderedList")}
            onCheckedChange={() =>
              editor?.chain().focus().toggleOrderedList().run()
            }
            className="text-md h-6 px-3 pl-8 active:bg-gray-900 active:text-white flex justify-between items-center"
          >
            <span>Numbered List</span>
          </DropdownMenuCheckboxItem>
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
