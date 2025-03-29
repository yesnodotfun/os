import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Set up Redis client
const redis = new Redis({
  url: 'https://obliging-albacore-48177.upstash.io',
  token: 'AbwxAAIjcDFjZTdjNjI3MGY0NmI0ZDYyYjg2NDBhMGI0NDdmOWI2N3AxMA',
});

// API runtime config
// export const runtime = "edge";
// export const edge = true;
// export const maxDuration = 60;

// Data models
export type ChatMessage = {
  id: string;
  roomId: string;
  username: string;
  content: string;
  timestamp: number;
};

export type ChatRoom = {
  id: string;
  name: string;
  createdAt: number;
  userCount: number;
};

type User = {
  username: string;
  lastActive: number;
};

// Redis key prefixes
const CHAT_ROOM_PREFIX = 'chat:room:';
const CHAT_MESSAGES_PREFIX = 'chat:messages:';
const CHAT_USERS_PREFIX = 'chat:users:';
const CHAT_ROOM_USERS_PREFIX = 'chat:room:users:';

// Helper functions
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

const getCurrentTimestamp = (): number => {
  return Date.now();
};

// API handler using VercelRequest and VercelResponse
export default async function handler(request: VercelRequest, response: VercelResponse) {
  // Access query parameters and method from VercelRequest
  const action = request.query.action as string;

  try {
    // Route API requests based on method and action query parameter
    if (request.method === 'GET') {
      switch (action) {
        case 'getRooms':
          return await getRooms(response);
        case 'getRoom':
          const getRoomId = request.query.roomId as string;
          if (!getRoomId) {
            return response.status(400).json({ error: 'roomId query parameter is required' });
          }
          return await getRoom(response, getRoomId);
        case 'getMessages':
          const getMessagesRoomId = request.query.roomId as string;
          if (!getMessagesRoomId) {
            return response.status(400).json({ error: 'roomId query parameter is required' });
          }
          return await getMessages(response, getMessagesRoomId);
        case 'getUsers':
          return await getUsers(response);
        default:
          return response.status(400).json({ error: 'Invalid action' });
      }
    } else if (request.method === 'POST') {
      // Access parsed JSON body directly from VercelRequest
      const body = request.body;
      switch (action) {
        case 'createRoom':
          return await createRoom(response, body);
        case 'joinRoom':
          return await joinRoom(response, body);
        case 'leaveRoom':
          return await leaveRoom(response, body);
        case 'sendMessage':
          return await sendMessage(response, body);
        case 'createUser':
          return await createUser(response, body);
        default:
          return response.status(400).json({ error: 'Invalid action' });
      }
    } else if (request.method === 'DELETE') {
      switch (action) {
        case 'deleteRoom':
          const deleteRoomId = request.query.roomId as string;
          if (!deleteRoomId) {
            return response.status(400).json({ error: 'roomId query parameter is required' });
          }
          return await deleteRoom(response, deleteRoomId);
        default:
          return response.status(400).json({ error: 'Invalid action' });
      }
    }

    // Fallback for unsupported methods
    response.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
  } catch (error) {
    console.error('Error handling request:', error);
    // Use VercelResponse for error handling
    return response.status(500).json({ error: 'Internal server error' });
  }
}

// Room functions - modified to accept VercelResponse
async function getRooms(response: VercelResponse) {
  const keys = await redis.keys(`${CHAT_ROOM_PREFIX}*`);
  if (keys.length === 0) {
    // Use VercelResponse
    return response.status(200).json({ rooms: [] });
  }

  const roomsData = await redis.mget<ChatRoom[]>(...keys);
  const rooms = roomsData.map(room => room); // mget already parses JSON if stored correctly

  // Use VercelResponse
  return response.status(200).json({ rooms: rooms.filter(Boolean) });
}

async function getRoom(response: VercelResponse, roomId: string) {
  const room = await redis.get<ChatRoom>(`${CHAT_ROOM_PREFIX}${roomId}`);

  if (!room) {
    // Use VercelResponse
    return response.status(404).json({ error: 'Room not found' });
  }

  // Use VercelResponse - redis.get<T> already parses
  return response.status(200).json({ room });
}

async function createRoom(response: VercelResponse, data: { name: string }) {
  const { name } = data;

  if (!name) {
    // Use VercelResponse
    return response.status(400).json({ error: 'Room name is required' });
  }

  const roomId = generateId();
  const room: ChatRoom = {
    id: roomId,
    name,
    createdAt: getCurrentTimestamp(),
    userCount: 0
  };

  await redis.set(`${CHAT_ROOM_PREFIX}${roomId}`, room); // Store object directly

  // Use VercelResponse
  return response.status(201).json({ room });
}

async function deleteRoom(response: VercelResponse, roomId: string) {
  const roomExists = await redis.exists(`${CHAT_ROOM_PREFIX}${roomId}`);

  if (!roomExists) {
    // Use VercelResponse
    return response.status(404).json({ error: 'Room not found' });
  }

  // Delete room and associated messages/users
  const pipeline = redis.pipeline();
  pipeline.del(`${CHAT_ROOM_PREFIX}${roomId}`);
  pipeline.del(`${CHAT_MESSAGES_PREFIX}${roomId}`);
  pipeline.del(`${CHAT_ROOM_USERS_PREFIX}${roomId}`);
  await pipeline.exec();

  // Use VercelResponse
  return response.status(200).json({ success: true });
}

// Message functions - modified to accept VercelResponse
async function getMessages(response: VercelResponse, roomId: string) {
  console.log(`[getMessages] Fetching messages for room: ${roomId}`); // Log Room ID

  const roomExists = await redis.exists(`${CHAT_ROOM_PREFIX}${roomId}`);

  if (!roomExists) {
    console.log(`[getMessages] Room not found: ${roomId}`);
    // Use VercelResponse
    return response.status(404).json({ error: 'Room not found' });
  }

  const messagesKey = `${CHAT_MESSAGES_PREFIX}${roomId}`;
  // Assuming messages are stored as stringified JSON in the list
  const messagesStrings = await redis.lrange(messagesKey, 0, -1);
  console.log(`[getMessages] Raw messages strings from Redis for ${roomId}:`, messagesStrings); // Log raw data

  // Parse each message string/object
  const messages = messagesStrings
    .map(item => {
      try {
        if (typeof item === 'object' && item !== null) {
          // Already an object, assume it's ChatMessage
          // console.log(`[getMessages] Item is already an object:`, item); // Optional log
          return item as ChatMessage; 
        } else if (typeof item === 'string') {
          // Item is a string, try parsing it
          // console.log(`[getMessages] Item is a string, parsing:`, item);
          const parsed = JSON.parse(item) as ChatMessage;
          return parsed;
        } else {
          // Unexpected type
          console.warn(`[getMessages] Unexpected item type in list for room ${roomId}:`, item);
          return null;
        }
      } catch (e) {
        console.error(`[getMessages] Failed to process or parse item for room ${roomId}:`, item, e); // Log processing/parsing errors
        return null;
      }
    })
    .filter((message): message is ChatMessage => message !== null); // Type guard in filter

  console.log(`[getMessages] Final processed messages for ${roomId}:`, messages); // Log final array

  // Use VercelResponse
  return response.status(200).json({ messages });
}

async function sendMessage(response: VercelResponse, data: { roomId: string, username: string, content: string }) {
  const { roomId, username, content } = data;

  if (!roomId || !username || !content) {
    // Use VercelResponse
    return response.status(400).json({
      error: 'Room ID, username, and content are required'
    });
  }

  // Check if room exists
  const roomExists = await redis.exists(`${CHAT_ROOM_PREFIX}${roomId}`);
  if (!roomExists) {
    // Use VercelResponse
    return response.status(404).json({ error: 'Room not found' });
  }

  // Check if user exists
  const userExists = await redis.exists(`${CHAT_USERS_PREFIX}${username}`);
  if (!userExists) {
    // Use VercelResponse
    return response.status(404).json({ error: 'User not found' });
  }

  // Create and save the message
  const message: ChatMessage = {
    id: generateId(),
    roomId,
    username,
    content,
    timestamp: getCurrentTimestamp()
  };

  // Store message as stringified JSON in the list
  await redis.lpush(`${CHAT_MESSAGES_PREFIX}${roomId}`, JSON.stringify(message));
  // Keep only the latest 100 messages per room
  await redis.ltrim(`${CHAT_MESSAGES_PREFIX}${roomId}`, 0, 99);

  // Update user's last active timestamp (assuming user data is stored as JSON string)
  const currentUserData = await redis.get<User>(`${CHAT_USERS_PREFIX}${username}`);
  if (currentUserData) {
    const updatedUser: User = { ...currentUserData, lastActive: getCurrentTimestamp() };
    await redis.set(`${CHAT_USERS_PREFIX}${username}`, updatedUser); // Store object directly
  }

  // Use VercelResponse
  return response.status(201).json({ message });
}

// User functions - modified to accept VercelResponse
async function getUsers(response: VercelResponse) {
  const keys = await redis.keys(`${CHAT_USERS_PREFIX}*`);
  if (keys.length === 0) {
    // Use VercelResponse
    return response.status(200).json({ users: [] });
  }

  const usersData = await redis.mget<User[]>(...keys);
  const users = usersData.map(user => user); // mget already parses JSON

  // Use VercelResponse
  return response.status(200).json({ users: users.filter(Boolean) });
}

async function createUser(response: VercelResponse, data: { username: string }) {
  const { username } = data;

  if (!username) {
    // Use VercelResponse
    return response.status(400).json({ error: 'Username is required' });
  }

  // Check if username already exists using setnx for atomicity
  const userKey = `${CHAT_USERS_PREFIX}${username}`;
  const user: User = {
    username,
    lastActive: getCurrentTimestamp()
  };

  const created = await redis.setnx(userKey, JSON.stringify(user)); // Use setnx

  if (!created) {
    // Use VercelResponse - User already exists
    return response.status(409).json({ error: 'Username already taken' });
  }

  // Use VercelResponse
  return response.status(201).json({ user });
}

// Room membership functions - modified to accept VercelResponse
async function joinRoom(response: VercelResponse, data: { roomId: string, username: string }) {
  const { roomId, username } = data;

  if (!roomId || !username) {
    // Use VercelResponse
    return response.status(400).json({
      error: 'Room ID and username are required'
    });
  }

  // Use Promise.all for concurrent checks
  const [roomData, userData] = await Promise.all([
    redis.get<ChatRoom>(`${CHAT_ROOM_PREFIX}${roomId}`),
    redis.get<User>(`${CHAT_USERS_PREFIX}${username}`)
  ]);

  if (!roomData) {
    // Use VercelResponse
    return response.status(404).json({ error: 'Room not found' });
  }

  if (!userData) {
    // Use VercelResponse
    return response.status(404).json({ error: 'User not found' });
  }

  // Add user to room set
  await redis.sadd(`${CHAT_ROOM_USERS_PREFIX}${roomId}`, username);

  // Update room user count - Fetch latest count after adding
  const userCount = await redis.scard(`${CHAT_ROOM_USERS_PREFIX}${roomId}`);
  const updatedRoom: ChatRoom = { ...roomData, userCount };
  await redis.set(`${CHAT_ROOM_PREFIX}${roomId}`, updatedRoom); // Store object directly

  // Update user's last active timestamp
  const updatedUser: User = { ...userData, lastActive: getCurrentTimestamp() };
  await redis.set(`${CHAT_USERS_PREFIX}${username}`, updatedUser); // Store object directly

  // Use VercelResponse
  return response.status(200).json({ success: true });
}

async function leaveRoom(response: VercelResponse, data: { roomId: string, username: string }) {
  const { roomId, username } = data;

  if (!roomId || !username) {
    // Use VercelResponse
    return response.status(400).json({
      error: 'Room ID and username are required'
    });
  }

  // Check if room exists first
  const roomData = await redis.get<ChatRoom>(`${CHAT_ROOM_PREFIX}${roomId}`);
  if (!roomData) {
    // Use VercelResponse - Room doesn't exist, so user can't be in it
    return response.status(404).json({ error: 'Room not found' });
  }

  // Remove user from room set
  const removed = await redis.srem(`${CHAT_ROOM_USERS_PREFIX}${roomId}`, username);

  // If user was actually removed, update the count
  if (removed) {
     // Fetch latest count after removing
    const userCount = await redis.scard(`${CHAT_ROOM_USERS_PREFIX}${roomId}`);
    const updatedRoom: ChatRoom = { ...roomData, userCount };
    await redis.set(`${CHAT_ROOM_PREFIX}${roomId}`, updatedRoom); // Store object directly
  }

  // Use VercelResponse
  return response.status(200).json({ success: true });
} 