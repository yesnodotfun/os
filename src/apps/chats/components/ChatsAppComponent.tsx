import { useState, useCallback } from "react";
import { AppProps } from "../../base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { ChatsMenuBar } from "./ChatsMenuBar";
import { HelpDialog } from "@/components/dialogs/HelpDialog";
import { AboutDialog } from "@/components/dialogs/AboutDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { InputDialog } from "@/components/dialogs/InputDialog";
import { helpItems, appMetadata } from "..";
import { useChatRoom } from "../hooks/useChatRoom";
import { useAiChat } from "../hooks/useAiChat";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { ChatRoomSidebar } from "./ChatRoomSidebar"; // Import ChatRoomSidebar
import { useChatsStore } from "@/stores/useChatsStore";
import { type Message as UIMessage } from "ai/react";
import { type ChatMessage, type ChatRoom } from "@/types/chat";

export function ChatsAppComponent({
  isWindowOpen,
  onClose,
  isForeground,
  skipInitialSound,
}: AppProps) {
  const { aiMessages } = useChatsStore();
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: handleAiSubmit,
    isLoading,
    reload,
    error,
    stop,
    handleDirectMessageSubmit,
    handleNudge,
    handleSaveTranscript,
    isClearDialogOpen,
    setIsClearDialogOpen,
    confirmClearChats,
    isSaveDialogOpen,
    setIsSaveDialogOpen,
    saveFileName,
    setSaveFileName,
    handleSaveSubmit,
  } = useAiChat();

  const {
    username,
    rooms,
    currentRoomId,
    currentRoomMessages,
    isSidebarVisible,
    isAdmin,
    handleRoomSelect,
    sendRoomMessage,
    toggleSidebarVisibility,
    promptSetUsername,
    promptAddRoom,
    promptDeleteRoom,
    isUsernameDialogOpen,
    setIsUsernameDialogOpen,
    newUsername,
    setNewUsername,
    isSettingUsername,
    usernameError,
    submitUsernameDialog,
    isNewRoomDialogOpen,
    setIsNewRoomDialogOpen,
    newRoomName,
    setNewRoomName,
    isCreatingRoom,
    roomError,
    submitNewRoomDialog,
    isDeleteRoomDialogOpen,
    setIsDeleteRoomDialogOpen,
    roomToDelete,
    confirmDeleteRoom,
  } = useChatRoom(isWindowOpen ?? false, isForeground ?? false);

  const [isShaking, setIsShaking] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);

  // Add safety check: ensure rooms is an array before finding
  const currentRoom = Array.isArray(rooms) && currentRoomId
    ? rooms.find((r: ChatRoom) => r.id === currentRoomId)
    : null;

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (currentRoomId && username) {
        sendRoomMessage(input);
        handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
      } else {
        handleAiSubmit(e);
      }
    },
    [currentRoomId, username, sendRoomMessage, handleAiSubmit, input, handleInputChange]
  );

  const handleDirectSubmit = useCallback(
    (message: string) => {
      if (currentRoomId && username) {
        sendRoomMessage(message);
      } else {
        handleDirectMessageSubmit(message);
      }
    },
    [currentRoomId, username, sendRoomMessage, handleDirectMessageSubmit]
  );

  const handleNudgeClick = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400);
    handleNudge();
  }, [handleNudge]);

  if (!isWindowOpen) return null;

  const currentMessagesToDisplay = currentRoomId
    ? currentRoomMessages.map((msg: ChatMessage) => ({
        id: msg.id,
        role: msg.username === username ? 'user' : 'human',
        content: msg.content,
        createdAt: new Date(msg.timestamp),
        username: msg.username,
      }))
    : messages.map((msg: UIMessage) => ({
        ...msg,
        username: msg.role === 'user' ? (username || 'You') : 'Ryo'
      }));

  // Ensure isSidebarVisible is always boolean for child components
  const sidebarVisibleBool = isSidebarVisible ?? false;

  return (
    <>
      <ChatsMenuBar
        onClose={onClose}
        onShowHelp={() => setIsHelpDialogOpen(true)}
        onShowAbout={() => setIsAboutDialogOpen(true)}
        onClearChats={() => setIsClearDialogOpen(true)}
        onSaveTranscript={handleSaveTranscript}
        onSetUsername={promptSetUsername}
        onToggleSidebar={toggleSidebarVisibility}
        isSidebarVisible={sidebarVisibleBool} // Pass boolean
        onAddRoom={promptAddRoom}
        rooms={rooms}
        currentRoom={currentRoom ?? null}
        onRoomSelect={(room) => handleRoomSelect(room ? room.id : null)}
        isAdmin={isAdmin}
      />
      <WindowFrame
        title={currentRoom ? `#${currentRoom.name}` : "@ryo"}
        onClose={onClose}
        isForeground={isForeground}
        appId="chats"
        skipInitialSound={skipInitialSound}
        isShaking={isShaking}
      >
        <div className="flex flex-col md:flex-row h-full bg-[#c0c0c0] w-full">
          <ChatRoomSidebar
            rooms={rooms}
            currentRoom={currentRoom ?? null}
            onRoomSelect={(room) => handleRoomSelect(room ? room.id : null)}
            onAddRoom={promptAddRoom}
            onDeleteRoom={(room) => promptDeleteRoom(room)}
            isVisible={sidebarVisibleBool} // Pass boolean
            isAdmin={isAdmin}
          />
          <div className="flex flex-col flex-1 p-2 overflow-hidden">
            <ChatMessages
              key={currentRoomId || 'ryo'}
              messages={currentMessagesToDisplay as any}
              isLoading={isLoading}
              error={error}
              onRetry={reload}
              onClear={() => setIsClearDialogOpen(true)}
              isRoomView={!!currentRoomId}
              roomId={currentRoomId ?? undefined}
              isAdmin={isAdmin}
              username={username || undefined}
            />

            {(() => {
               const userMessages = aiMessages.filter((msg: UIMessage) => msg.role === "user");
               const prevMessagesContent = Array.from(new Set(userMessages.map((msg) => msg.content))).reverse() as string[];

              return (
                <ChatInput
                  input={input}
                  isLoading={isLoading}
                  isForeground={isForeground}
                  onInputChange={handleInputChange}
                  onSubmit={handleSubmit}
                  onStop={stop}
                  onDirectMessageSubmit={handleDirectSubmit}
                  onNudge={handleNudgeClick}
                  previousMessages={prevMessagesContent}
                  showNudgeButton={!currentRoomId}
                />
              );
            })()}
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
        <ConfirmDialog
          isOpen={isClearDialogOpen}
          onOpenChange={setIsClearDialogOpen}
          onConfirm={confirmClearChats}
          title="Clear Chats"
          description="Are you sure you want to clear all AI chats? This action cannot be undone."
        />
        <InputDialog
          isOpen={isSaveDialogOpen}
          onOpenChange={setIsSaveDialogOpen}
          onSubmit={handleSaveSubmit}
          title="Save Transcript"
          description="Enter a name for your AI chat transcript file"
          value={saveFileName}
          onChange={setSaveFileName}
        />
        <InputDialog
          isOpen={isUsernameDialogOpen}
          onOpenChange={setIsUsernameDialogOpen}
          onSubmit={submitUsernameDialog}
          title="Set Username"
          description="Enter the username you want to use in chat rooms"
          value={newUsername}
          onChange={(value) => { setNewUsername(value); }}
          isLoading={isSettingUsername}
          errorMessage={usernameError}
        />
        <InputDialog
          isOpen={isNewRoomDialogOpen}
          onOpenChange={setIsNewRoomDialogOpen}
          onSubmit={submitNewRoomDialog}
          title="Create New Room"
          description="Enter a name for the new chat room"
          value={newRoomName}
          onChange={(value) => { setNewRoomName(value); }}
          isLoading={isCreatingRoom}
          errorMessage={roomError}
        />
        <ConfirmDialog
          isOpen={isDeleteRoomDialogOpen}
          onOpenChange={setIsDeleteRoomDialogOpen}
          onConfirm={confirmDeleteRoom}
          title="Delete Chat Room"
          description={`Are you sure you want to delete the room \"${roomToDelete?.name}\"?. This action cannot be undone.`}
        />
      </WindowFrame>
    </>
  );
}
