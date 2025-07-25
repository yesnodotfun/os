export type ChatMessage = {
  id: string; // Server message ID
  clientId?: string; // Stable client-side ID used for optimistic rendering
  roomId: string;
  username: string;
  content: string;
  timestamp: number;
};

export type ChatRoom = {
  id: string;
  name: string;
  type?: "public" | "private"; // optional for backward compatibility
  createdAt: number;
  userCount: number;
  users?: string[];
  members?: string[]; // for private rooms - list of usernames who can access
};

export type User = {
  username: string;
  lastActive: number;
};
