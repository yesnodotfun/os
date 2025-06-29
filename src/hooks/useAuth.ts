import { useState, useCallback } from "react";
import { useChatsStore } from "@/stores/useChatsStore";
import { toast } from "sonner";

export function useAuth() {
  const { username, authToken, setAuthToken, createUser } = useChatsStore();

  // Set username dialog states
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSettingUsername, setIsSettingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Token verification dialog states
  const [isVerifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyTokenInput, setVerifyTokenInput] = useState("");
  const [verifyPasswordInput, setVerifyPasswordInput] = useState("");
  const [verifyUsernameInput, setVerifyUsernameInput] = useState("");
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Password state
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  // Username management
  const promptSetUsername = useCallback(() => {
    setNewUsername("");
    setNewPassword("");
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

    const result = await createUser(trimmedUsername, newPassword || undefined);

    if (result.ok) {
      setIsUsernameDialogOpen(false);
      setNewUsername("");
      setNewPassword("");
      toast.success("Username Set", {
        description: `Welcome, ${trimmedUsername}!`,
      });
    } else {
      setUsernameError(result.error || "Failed to set username");
    }

    setIsSettingUsername(false);
  }, [newUsername, newPassword, createUser]);

  // Token verification management
  const promptVerifyToken = useCallback(() => {
    setVerifyTokenInput("");
    setVerifyPasswordInput("");
    setVerifyUsernameInput(username || "");
    setVerifyError(null);
    setVerifyDialogOpen(true);
  }, [username]);

  const handleVerifyTokenSubmit = useCallback(
    async (input: string, isPassword: boolean = false) => {
      if (!input.trim()) {
        setVerifyError(isPassword ? "Password required" : "Token required");
        return;
      }

      setIsVerifyingToken(true);
      setVerifyError(null);

      try {
        if (isPassword) {
          // Authenticate with password
          const response = await fetch(
            "/api/chat-rooms?action=authenticateWithPassword",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                username: verifyUsernameInput.trim() || username || "",
                password: input.trim(),
              }),
            }
          );

          if (!response.ok) {
            const data = await response.json();
            setVerifyError(data.error || "Invalid username or password");
            return;
          }

          const result = await response.json();
          if (result.token) {
            setAuthToken(result.token);
            toast.success("Success", {
              description: "Logged in successfully with password",
            });
            setVerifyDialogOpen(false);
            setVerifyPasswordInput("");
          }
        } else {
          // Test the token using the dedicated verification endpoint
          const testResponse = await fetch(
            "/api/chat-rooms?action=verifyToken",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${input.trim()}`,
                "X-Username": username || "test",
              },
              body: JSON.stringify({}),
            }
          );

          if (!testResponse.ok) {
            if (testResponse.status === 401) {
              setVerifyError("Invalid token - authentication failed");
            } else {
              setVerifyError(
                `Token validation failed (${testResponse.status})`
              );
            }
            return;
          }

          // Parse the response to get validation details
          const result = await testResponse.json();
          console.log("[useAuth] Token validation successful:", result);

          // Token is valid, set it in the store
          setAuthToken(input.trim());

          toast.success("Success", {
            description: "Token verified and set successfully",
          });
          setVerifyDialogOpen(false);
          setVerifyTokenInput("");
        }
      } catch (err) {
        console.error("[useAuth] Error verifying:", err);
        setVerifyError("Network error while verifying");
      } finally {
        setIsVerifyingToken(false);
      }
    },
    [setAuthToken, username, verifyUsernameInput]
  );

  // Check if user has a password set
  const checkHasPassword = useCallback(async () => {
    if (!username || !authToken) {
      console.log(
        "[useAuth] checkHasPassword: No username or token, setting null"
      );
      setHasPassword(null);
      return;
    }

    console.log("[useAuth] checkHasPassword: Checking for user", username);
    try {
      const response = await fetch("/api/chat-rooms?action=checkPassword", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Username": username,
        },
      });

      console.log(
        "[useAuth] checkHasPassword: Response status",
        response.status
      );
      if (response.ok) {
        const data = await response.json();
        console.log("[useAuth] checkHasPassword: Result", data);
        setHasPassword(data.hasPassword);
      } else {
        console.log(
          "[useAuth] checkHasPassword: Failed with status",
          response.status
        );
        setHasPassword(null);
      }
    } catch (error) {
      console.error("[useAuth] Error checking password status:", error);
      setHasPassword(null);
    }
  }, [username, authToken]);

  // Set password for existing user
  const setPassword = useCallback(
    async (password: string) => {
      if (!username || !authToken) {
        return { ok: false, error: "Authentication required" };
      }

      try {
        const response = await fetch("/api/chat-rooms?action=setPassword", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
            "X-Username": username,
          },
          body: JSON.stringify({ password }),
        });

        if (!response.ok) {
          const data = await response.json();
          return { ok: false, error: data.error || "Failed to set password" };
        }

        setHasPassword(true);
        return { ok: true };
      } catch (error) {
        console.error("[useAuth] Error setting password:", error);
        return { ok: false, error: "Network error while setting password" };
      }
    },
    [username, authToken]
  );

  return {
    // State
    username,
    authToken,
    hasPassword,

    // Username management
    promptSetUsername,
    isUsernameDialogOpen,
    setIsUsernameDialogOpen,
    newUsername,
    setNewUsername,
    newPassword,
    setNewPassword,
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
    verifyPasswordInput,
    setVerifyPasswordInput,
    verifyUsernameInput,
    setVerifyUsernameInput,
    isVerifyingToken,
    verifyError,
    handleVerifyTokenSubmit,

    // Password management
    checkHasPassword,
    setPassword,
  };
}
