import { useState, useEffect, useCallback } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { ChatsMenuBar } from "./ChatsMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { InputDialog } from "@/components/dialogs/InputDialog";
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
    append,
  } = useChat({
    initialMessages: loadChatMessages() || [initialMessage],
    experimental_throttle: 50,
  });
  const [messages, setMessages] = useState(aiMessages);

  useEffect(() => {
    setMessages(aiMessages);
    saveChatMessages(aiMessages);
  }, [aiMessages]);

  const handleDirectMessageSubmit = useCallback(
    (message: string) => {
      append({
        content: message,
        role: "user",
      });
    },
    [append]
  );

  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveFileName, setSaveFileName] = useState("");

  const clearChats = () => {
    setIsClearDialogOpen(true);
  };

  const confirmClearChats = () => {
    setAiMessages([initialMessage]);
    saveChatMessages([initialMessage]);
    setIsClearDialogOpen(false);
  };

  const handleSaveTranscript = () => {
    setIsSaveDialogOpen(true);
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase()
      .replace(":", "-");
    setSaveFileName(`chat-${date}-${time}.md`);
  };

  const handleSaveSubmit = (fileName: string) => {
    const transcript = messages
      .map((msg) => {
        const time = msg.createdAt
          ? new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })
          : "";
        return `**${msg.role === "user" ? "You" : "Ryo"}** (${time}):\n${
          msg.content
        }\n`;
      })
      .join("\n");

    const finalFileName = fileName.endsWith(".md")
      ? fileName
      : `${fileName}.md`;
    const filePath = `/Documents/${finalFileName}`;

    const saveEvent = new CustomEvent("saveFile", {
      detail: {
        name: finalFileName,
        path: filePath,
        content: transcript,
        icon: "/icons/file-text.png",
        isDirectory: false,
      },
    });
    window.dispatchEvent(saveEvent);

    setIsSaveDialogOpen(false);
  };

  if (!isWindowOpen) return null;

  return (
    <>
      <ChatsMenuBar
        onClose={onClose}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        onClearChats={clearChats}
        onSaveTranscript={handleSaveTranscript}
      />
      <WindowFrame
        title="Chats"
        onClose={onClose}
        isForeground={isForeground}
        appId="chats"
        windowConstraints={{
          maxHeight: window.innerWidth <= 768 ? 360 : undefined,
        }}
      >
        <div className="flex flex-col h-full bg-[#c0c0c0] p-2 w-full">
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            error={error}
            onRetry={reload}
            onClear={clearChats}
          />
          <ChatInput
            input={input}
            isLoading={isLoading}
            isForeground={isForeground}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            onStop={stop}
            onDirectMessageSubmit={handleDirectMessageSubmit}
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
        <ConfirmDialog
          isOpen={isClearDialogOpen}
          onOpenChange={setIsClearDialogOpen}
          onConfirm={confirmClearChats}
          title="Clear Chats"
          description="Are you sure you want to clear all chats? This action cannot be undone."
        />
        <InputDialog
          isOpen={isSaveDialogOpen}
          onOpenChange={setIsSaveDialogOpen}
          onSubmit={handleSaveSubmit}
          title="Save Transcript"
          description="Enter a name for your transcript file"
          value={saveFileName}
          onChange={setSaveFileName}
        />
      </WindowFrame>
    </>
  );
}
