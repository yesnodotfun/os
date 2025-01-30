import { useState, useEffect } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChatsMenuBar } from "./ChatsMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { helpItems, appMetadata } from "..";
import { useChat } from "ai/react";
import { ArrowUp, Square } from "lucide-react";
import { loadChatMessages, saveChatMessages } from "@/utils/storage";
import { ChatMessages } from "./ChatMessages";

export function ChatsAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
}: AppProps) {
  const initialMessage = {
    id: "1",
    role: "assistant" as const,
    content: "👋 hey! i'm ryo. ask me anything!",
    createdAt: new Date(),
  };

  const {
    messages: aiMessages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    reload,
    error,
    stop,
    setMessages: setAiMessages,
  } = useChat({
    initialMessages: loadChatMessages() || [initialMessage],
  });
  const [messages, setMessages] = useState(aiMessages);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setMessages(aiMessages);
    saveChatMessages(aiMessages);
  }, [aiMessages]);

  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);

  const clearChats = () => {
    setAiMessages([initialMessage]);
    saveChatMessages([initialMessage]);
  };

  if (!isWindowOpen) return null;

  return (
    <>
      <ChatsMenuBar
        onClose={onClose}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        onClearChats={clearChats}
      />
      <WindowFrame
        title="Chats"
        onClose={onClose}
        isForeground={isForeground}
        appId="chats"
        windowConstraints={{
          minWidth: window.innerWidth >= 768 ? 260 : 320,
          minHeight: window.innerWidth >= 768 ? 300 : 300,
          maxWidth: window.innerWidth >= 768 ? 260 : 320,
          maxHeight: window.innerWidth >= 768 ? 800 : 365,
        }}
      >
        <div className="flex flex-col h-full bg-[#c0c0c0] p-2 w-[320px] md:w-[260px] max-w-full">
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            error={error}
            onRetry={reload}
          />
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className={`flex-1 border-2 border-gray-800 text-xs font-['Geneva-12'] antialiased h-8 ${
                isFocused ? "input--focused" : ""
              }`}
              onFocus={() => {
                setIsFocused(true);
              }}
              onBlur={() => setIsFocused(false)}
              onTouchStart={(e) => {
                e.preventDefault();
              }}
            />
            {isLoading ? (
              <Button
                type="button"
                onClick={() => stop()}
                className="bg-black hover:bg-black/80 text-white text-xs border-2 border-gray-800 w-8 h-8 p-0 flex items-center justify-center"
              >
                <Square className="h-4 w-4" fill="currentColor" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="bg-black hover:bg-black/80 text-white text-xs border-2 border-gray-800 w-8 h-8 p-0 flex items-center justify-center"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </form>
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
