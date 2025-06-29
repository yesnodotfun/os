import { ConfirmDialog } from "./ConfirmDialog";

interface LogoutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function LogoutDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: LogoutDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Log Out"
      description="Are you sure you want to log out? You will be signed out of your account."
    />
  );
}
