import { useState, useCallback } from "react";
import { useChatsStore } from "@/stores/useChatsStore";
import { toast } from "sonner";

export function useAuth() {
  const { username, authToken, setAuthToken, createUser } = useChatsStore();

  // Set username dialog states
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isSettingUsername, setIsSettingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Token verification dialog states
  const [isVerifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyTokenInput, setVerifyTokenInput] = useState("");
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Username management
  const promptSetUsername = useCallback(() => {
    setNewUsername("");
    setUsernameError(null);
    setIsUsernameDialogOpen(true);
  }, []);

  const submitUsernameDialog = useCallback(async () => {
    setIsSettingUsername(true);
    setUsernameError(null);

    const trimmedUsername = newUsername.trim();
    if (!trimmedUsername) {
      setUsernameError("Username cannot be empty.");
      setIsSettingUsername(false);
      return;
    }

    const result = await createUser(trimmedUsername);

    if (result.ok) {
      setIsUsernameDialogOpen(false);
      setNewUsername("");
      toast.success("Username Set", {
        description: `Welcome, ${trimmedUsername}!`,
      });
    } else {
      setUsernameError(result.error || "Failed to set username");
    }

    setIsSettingUsername(false);
  }, [newUsername, createUser]);

  // Token verification management
  const promptVerifyToken = useCallback(() => {
    setVerifyTokenInput("");
    setVerifyError(null);
    setVerifyDialogOpen(true);
  }, []);

  const handleVerifyTokenSubmit = useCallback(
    async (token: string) => {
      if (!token.trim()) {
        setVerifyError("Token required");
        return;
      }

      setIsVerifyingToken(true);
      setVerifyError(null);

      try {
        // Test the token using the dedicated verification endpoint
        const testResponse = await fetch("/api/chat-rooms?action=verifyToken", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token.trim()}`,
            "X-Username": username || "test",
          },
          body: JSON.stringify({}),
        });

        if (!testResponse.ok) {
          if (testResponse.status === 401) {
            setVerifyError("Invalid token - authentication failed");
          } else {
            setVerifyError(`Token validation failed (${testResponse.status})`);
          }
          return;
        }

        // Parse the response to get validation details
        const result = await testResponse.json();
        console.log("[useAuth] Token validation successful:", result);

        // Token is valid, set it in the store
        setAuthToken(token.trim());

        toast.success("Success", {
          description: "Token verified and set successfully",
        });
        setVerifyDialogOpen(false);
        setVerifyTokenInput("");
      } catch (err) {
        console.error("[useAuth] Error verifying token", err);
        setVerifyError("Network error while verifying token");
      } finally {
        setIsVerifyingToken(false);
      }
    },
    [setAuthToken, username]
  );

  return {
    // State
    username,
    authToken,

    // Username management
    promptSetUsername,
    isUsernameDialogOpen,
    setIsUsernameDialogOpen,
    newUsername,
    setNewUsername,
    isSettingUsername,
    usernameError,
    submitUsernameDialog,
    setUsernameError,

    // Token verification
    promptVerifyToken,
    isVerifyDialogOpen,
    setVerifyDialogOpen,
    verifyTokenInput,
    setVerifyTokenInput,
    isVerifyingToken,
    verifyError,
    handleVerifyTokenSubmit,
  };
}
