import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface SetUsernameDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => Promise<void>;
  username: string;
  onUsernameChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  onErrorChange: (error: string | null) => void;
  onSwitchToLogin?: () => void;
}

export function SetUsernameDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  isLoading,
  error,
  onErrorChange,
  onSwitchToLogin,
}: SetUsernameDialogProps) {
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isLoading) {
      await onSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-system7-window-bg border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] max-w-[400px]"
        onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="font-normal text-[16px]">
            Create ryOS Account
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create an account to access chat rooms and save your settings
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2 pb-6 px-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-gray-700 text-[12px] font-geneva-12">
                  Username
                </Label>
                <Input
                  autoFocus
                  value={username}
                  onChange={(e) => {
                    onUsernameChange(e.target.value);
                    onErrorChange(null);
                  }}
                  placeholder="Set a username"
                  className="shadow-none font-geneva-12 text-[12px] h-8"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 text-[12px] font-geneva-12">
                  Password (optional)
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    onPasswordChange(e.target.value);
                    onErrorChange(null);
                  }}
                  placeholder="Set a password"
                  className="shadow-none font-geneva-12 text-[12px] h-8"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-[12px] font-geneva-12 mt-3">
                {error}
              </p>
            )}

            <DialogFooter className="mt-4 gap-2 sm:justify-between">
              <div className="flex gap-2 w-full sm:w-auto">
                {onSwitchToLogin && (
                  <Button
                    type="button"
                    variant="link"
                    onClick={onSwitchToLogin}
                    disabled={isLoading}
                    className="w-full sm:w-auto font-geneva-12 text-[12px] p-0"
                  >
                    Login to an existing account
                  </Button>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 w-full sm:w-auto sm:flex-row">
                <Button
                  type="submit"
                  variant="retro"
                  disabled={isLoading || !username.trim()}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? "Creating..." : "Create"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
