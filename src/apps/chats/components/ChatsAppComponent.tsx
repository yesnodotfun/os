import { useState, useEffect } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { ChatsMenuBar } from "./ChatsMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { helpItems, appMetadata } from "..";
import { useChat } from "ai/react";
import { loadChatMessages, saveChatMessages } from "@/utils/storage";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";

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
    experimental_throttle: 50,
  });
  const [messages, setMessages] = useState(aiMessages);

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
          <ChatInput
            input={input}
            isLoading={isLoading}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            onStop={stop}
          />
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
