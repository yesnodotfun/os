/**
 * Format a private room name by excluding the current user
 * @param roomName - The room name (e.g., "@user1, @user2, @user3")
 * @param currentUsername - The current user's username to exclude
 * @returns The formatted room name without the current user
 */
export function formatPrivateRoomName(
  roomName: string,
  currentUsername: string | null
): string {
  if (!currentUsername) return roomName;

  // Parse the room name to extract usernames
  const users = roomName
    .split(", ")
    .map((u) => u.trim())
    .filter((u) => u.startsWith("@"))
    .map((u) => u.substring(1)); // Remove @ prefix

  // Filter out the current user
  const otherUsers = users.filter(
    (u) => u.toLowerCase() !== currentUsername.toLowerCase()
  );

  // If no other users (shouldn't happen in a valid private room), return original
  if (otherUsers.length === 0) return roomName;

  // Return formatted name with @ prefixes
  return otherUsers.map((u) => `@${u}`).join(", ");
}
