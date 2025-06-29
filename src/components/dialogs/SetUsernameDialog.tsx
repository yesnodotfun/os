import { InputDialog } from "./InputDialog";

interface SetUsernameDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => Promise<void>;
  username: string;
  onUsernameChange: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  onErrorChange: (error: string | null) => void;
}

export function SetUsernameDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  username,
  onUsernameChange,
  isLoading,
  error,
  onErrorChange,
}: SetUsernameDialogProps) {
  return (
    <InputDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      title="Set Username"
      description="Set your ryOS username to continue"
      value={username}
      onChange={(value) => {
        onUsernameChange(value);
        onErrorChange(null);
      }}
      isLoading={isLoading}
      errorMessage={error ?? undefined}
    />
  );
}
