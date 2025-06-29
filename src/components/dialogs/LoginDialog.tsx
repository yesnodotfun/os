import React, { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LoginDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: string, isPassword: boolean) => Promise<void>;
  tokenInput: string;
  onTokenInputChange: (value: string) => void;
  passwordInput: string;
  onPasswordInputChange: (value: string) => void;
  usernameInput: string;
  onUsernameInputChange: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  username?: string | null;
  debugMode?: boolean;
  onSwitchToSignUp?: () => void;
}

export function LoginDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  tokenInput,
  onTokenInputChange,
  passwordInput,
  onPasswordInputChange,
  usernameInput,
  onUsernameInputChange,
  isLoading,
  error,
  debugMode = false,
  onSwitchToSignUp,
}: LoginDialogProps) {
  const [activeTab, setActiveTab] = useState<"token" | "password">("password");

  // Reset to password tab when dialog opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("password");
    }
  }, [isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isLoading) {
      const input = activeTab === "token" ? tokenInput : passwordInput;
      await onSubmit(input, activeTab === "password");
    }
  };

  const renderPasswordForm = () => (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-gray-700 text-[12px] font-geneva-12">
          Username
        </Label>
        <Input
          value={usernameInput}
          onChange={(e) => onUsernameInputChange(e.target.value)}
          placeholder="Enter username"
          className="shadow-none font-geneva-12 text-[12px] h-8"
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-gray-700 text-[12px] font-geneva-12">
          Password
        </Label>
        <Input
          autoFocus={!debugMode || activeTab === "password"}
          type="password"
          value={passwordInput}
          onChange={(e) => onPasswordInputChange(e.target.value)}
          placeholder="Enter password"
          className="shadow-none font-geneva-12 text-[12px] h-8"
          disabled={isLoading}
        />
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-system7-window-bg border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] max-w-[400px]"
        onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="font-normal text-[16px]">
            Log In to ryOS
          </DialogTitle>
          <DialogDescription className="sr-only">
            Log in to your account
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2 pb-6 px-6">
          <form onSubmit={handleSubmit}>
            {debugMode ? (
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "token" | "password")}
              >
                <TabsList className="grid grid-cols-2 w-full h-fit mb-4 bg-transparent p-0.5 border border-black">
                  <TabsTrigger
                    value="password"
                    className="relative font-geneva-12 text-[12px] px-4 py-1.5 rounded-none bg-white data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:z-10 data-[state=inactive]:border-r-0"
                  >
                    Password
                  </TabsTrigger>
                  <TabsTrigger
                    value="token"
                    className="relative font-geneva-12 text-[12px] px-4 py-1.5 rounded-none bg-white data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:z-10"
                  >
                    Token
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="password" className="mt-0">
                  {renderPasswordForm()}
                </TabsContent>

                <TabsContent value="token" className="mt-0">
                  <div className="space-y-2">
                    <Label className="text-gray-700 text-[12px] font-geneva-12">
                      Authentication Token
                    </Label>
                    <Input
                      autoFocus={activeTab === "token"}
                      value={tokenInput}
                      onChange={(e) => onTokenInputChange(e.target.value)}
                      placeholder="Enter your authentication token"
                      className="shadow-none font-geneva-12 text-[12px] h-8"
                      disabled={isLoading}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              renderPasswordForm()
            )}

            {error && (
              <p className="text-red-600 text-[12px] font-geneva-12 mt-3">
                {error}
              </p>
            )}

            <DialogFooter className="mt-4 gap-2 sm:justify-between">
              <div className="flex gap-2 w-full sm:w-auto">
                {onSwitchToSignUp && (
                  <Button
                    type="button"
                    variant="link"
                    onClick={onSwitchToSignUp}
                    disabled={isLoading}
                    className="w-full sm:w-auto font-geneva-12 text-[12px] p-0"
                  >
                    Create a new account
                  </Button>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 w-full sm:w-auto sm:flex-row">
                <Button
                  type="submit"
                  variant="retro"
                  disabled={
                    isLoading ||
                    (activeTab === "token"
                      ? !tokenInput.trim()
                      : !passwordInput.trim() || !usernameInput.trim())
                  }
                  className="w-full sm:w-auto"
                >
                  {isLoading ? "Logging in..." : "Log In"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
