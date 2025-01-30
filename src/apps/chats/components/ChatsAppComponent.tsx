import { useState } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatsMenuBar } from "./ChatsMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { helpItems, appMetadata } from "..";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

export function ChatsAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // TODO: Implement AI response
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: "I'm Ryo, your AI assistant. How can I help you today?",
      sender: "assistant",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMessage]);
  };

  if (!isWindowOpen) return null;

  return (
    <>
      <ChatsMenuBar
        onClose={onClose}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
      />
      <WindowFrame
        title="Chats"
        onClose={onClose}
        isForeground={isForeground}
        appId="chats"
        windowConstraints={{
          minWidth: 260,
          minHeight: 400,
          maxWidth: 260,
          maxHeight: 800,
        }}
      >
        <div className="flex flex-col h-full bg-[#c0c0c0] p-2">
          <ScrollArea className="flex-1 bg-white border-2 border-gray-800 rounded mb-2 p-2 h-full">
            <div className="flex flex-col gap-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${
                    message.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="text-sm text-gray-500 mb-1">
                    {message.sender === "user" ? "You" : "Ryo"} •{" "}
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div
                    className={`max-w-[80%] p-2 rounded ${
                      message.sender === "user"
                        ? "bg-yellow-200 text-black"
                        : "bg-blue-200 text-black"
                    }`}
                  >
                    <div className="break-words">{message.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 border-2 border-gray-800"
            />
            <Button
              onClick={handleSendMessage}
              className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-gray-800"
            >
              Send
            </Button>
          </div>
        </div>
        <HelpDialog
          isOpen={isHelpDialogOpen}
          onOpenChange={setIsHelpDialogOpen}
          helpItems={helpItems}
          appName="Chats"
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
