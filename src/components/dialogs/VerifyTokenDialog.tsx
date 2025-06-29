import { InputDialog } from "./InputDialog";

interface VerifyTokenDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (token: string) => Promise<void>;
  tokenInput: string;
  onTokenInputChange: (value: string) => void;
  isLoading: boolean;
  error: string | null;
}

export function VerifyTokenDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  tokenInput,
  onTokenInputChange,
  isLoading,
  error,
}: VerifyTokenDialogProps) {
  return (
    <InputDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Verify Token"
      description="Enter your token to verify and set it for authentication."
      value={tokenInput}
      onChange={onTokenInputChange}
      onSubmit={onSubmit}
      isLoading={isLoading}
      errorMessage={error ?? undefined}
      submitLabel="Verify"
    />
  );
}
