import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Set up Redis client
const redis = new Redis({
  url: 'https://obliging-albacore-48177.upstash.io',
  token: 'AbwxAAIjcDFjZTdjNjI3MGY0NmI0ZDYyYjg2NDBhMGI0NDdmOWI2N3AxMA',
});

// Logging utilities
const logRequest = (req: VercelRequest, id: string) => {
  console.log(`[${id}] ${req.method} ${req.url} - Action: ${req.query.action}`);
};

const logInfo = (id: string, message: string, data?: any) => {
  console.log(`[${id}] INFO: ${message}`, data ? data : '');
};

const logError = (id: string, message: string, error: any) => {
  console.error(`[${id}] ERROR: ${message}`, error);
};

const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 10);
};

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
  const requestId = generateRequestId();
  const startTime = performance.now();
  logRequest(request, requestId);
  
  // Access query parameters and method from VercelRequest
  const action = request.query.action as string;

  try {
    // Route API requests based on method and action query parameter
    if (request.method === 'GET') {
      switch (action) {
        case 'getRooms':
          return await getRooms(response, requestId);
        case 'getRoom':
          const getRoomId = request.query.roomId as string;
          if (!getRoomId) {
            logInfo(requestId, 'Missing roomId parameter');
            return response.status(400).json({ error: 'roomId query parameter is required' });
          }
          return await getRoom(response, getRoomId, requestId);
        case 'getMessages':
          const getMessagesRoomId = request.query.roomId as string;
          if (!getMessagesRoomId) {
            logInfo(requestId, 'Missing roomId parameter');
            return response.status(400).json({ error: 'roomId query parameter is required' });
          }
          return await getMessages(response, getMessagesRoomId, requestId);
        case 'getUsers':
          return await getUsers(response, requestId);
        default:
          logInfo(requestId, `Invalid action: ${action}`);
          return response.status(400).json({ error: 'Invalid action' });
      }
    } else if (request.method === 'POST') {
      // Access parsed JSON body directly from VercelRequest
      const body = request.body;
      switch (action) {
        case 'createRoom':
          return await createRoom(response, body, requestId);
        case 'joinRoom':
          return await joinRoom(response, body, requestId);
        case 'leaveRoom':
          return await leaveRoom(response, body, requestId);
        case 'sendMessage':
          return await sendMessage(response, body, requestId);
        case 'createUser':
          return await createUser(response, body, requestId);
        default:
          logInfo(requestId, `Invalid action: ${action}`);
          return response.status(400).json({ error: 'Invalid action' });
      }
    } else if (request.method === 'DELETE') {
      switch (action) {
        case 'deleteRoom':
          const deleteRoomId = request.query.roomId as string;
          if (!deleteRoomId) {
            logInfo(requestId, 'Missing roomId parameter');
            return response.status(400).json({ error: 'roomId query parameter is required' });
          }
          return await deleteRoom(response, deleteRoomId, requestId);
        default:
          logInfo(requestId, `Invalid action: ${action}`);
          return response.status(400).json({ error: 'Invalid action' });
      }
    }

    // Fallback for unsupported methods
    logInfo(requestId, `Method not allowed: ${request.method}`);
    response.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
  } catch (error) {
    logError(requestId, 'Error handling request:', error);
    // Use VercelResponse for error handling
    return response.status(500).json({ error: 'Internal server error' });
  } finally {
    const duration = performance.now() - startTime;
    logInfo(requestId, `Request completed in ${duration.toFixed(2)}ms`);
  }
}

// Room functions - modified to accept VercelResponse
async function getRooms(response: VercelResponse, requestId: string) {
  logInfo(requestId, 'Fetching all rooms');
  try {
    const keys = await redis.keys(`${CHAT_ROOM_PREFIX}*`);
    logInfo(requestId, `Found ${keys.length} rooms`);
    
    if (keys.length === 0) {
      // Use VercelResponse
      return response.status(200).json({ rooms: [] });
    }

    const roomsData = await redis.mget<ChatRoom[]>(...keys);
    const rooms = roomsData.map(room => room); // mget already parses JSON if stored correctly

    // Use VercelResponse
    return response.status(200).json({ rooms: rooms.filter(Boolean) });
  } catch (error) {
    logError(requestId, 'Error fetching rooms:', error);
    return response.status(500).json({ error: 'Failed to fetch rooms' });
  }
}

async function getRoom(response: VercelResponse, roomId: string, requestId: string) {
  logInfo(requestId, `Fetching room: ${roomId}`);
  try {
    const room = await redis.get<ChatRoom>(`${CHAT_ROOM_PREFIX}${roomId}`);

    if (!room) {
      logInfo(requestId, `Room not found: ${roomId}`);
      // Use VercelResponse
      return response.status(404).json({ error: 'Room not found' });
    }

    // Use VercelResponse - redis.get<T> already parses
    return response.status(200).json({ room });
  } catch (error) {
    logError(requestId, `Error fetching room ${roomId}:`, error);
    return response.status(500).json({ error: 'Failed to fetch room' });
  }
}

async function createRoom(response: VercelResponse, data: { name: string }, requestId: string) {
  const { name } = data;

  if (!name) {
    logInfo(requestId, 'Room creation failed: Name is required');
    // Use VercelResponse
    return response.status(400).json({ error: 'Room name is required' });
  }

  logInfo(requestId, `Creating room: ${name}`);
  try {
    const roomId = generateId();
    const room: ChatRoom = {
      id: roomId,
      name,
      createdAt: getCurrentTimestamp(),
      userCount: 0
    };

    await redis.set(`${CHAT_ROOM_PREFIX}${roomId}`, room); // Store object directly
    logInfo(requestId, `Room created: ${roomId}`);

    // Use VercelResponse
    return response.status(201).json({ room });
  } catch (error) {
    logError(requestId, `Error creating room ${name}:`, error);
    return response.status(500).json({ error: 'Failed to create room' });
  }
}

async function deleteRoom(response: VercelResponse, roomId: string, requestId: string) {
  logInfo(requestId, `Deleting room: ${roomId}`);
  try {
    const roomExists = await redis.exists(`${CHAT_ROOM_PREFIX}${roomId}`);

    if (!roomExists) {
      logInfo(requestId, `Room not found for deletion: ${roomId}`);
      // Use VercelResponse
      return response.status(404).json({ error: 'Room not found' });
    }

    // Delete room and associated messages/users
    const pipeline = redis.pipeline();
    pipeline.del(`${CHAT_ROOM_PREFIX}${roomId}`);
    pipeline.del(`${CHAT_MESSAGES_PREFIX}${roomId}`);
    pipeline.del(`${CHAT_ROOM_USERS_PREFIX}${roomId}`);
    await pipeline.exec();
    logInfo(requestId, `Room deleted: ${roomId}`);

    // Use VercelResponse
    return response.status(200).json({ success: true });
  } catch (error) {
    logError(requestId, `Error deleting room ${roomId}:`, error);
    return response.status(500).json({ error: 'Failed to delete room' });
  }
}

// Message functions - modified to accept VercelResponse
async function getMessages(response: VercelResponse, roomId: string, requestId: string) {
  logInfo(requestId, `Fetching messages for room: ${roomId}`);

  try {
    const roomExists = await redis.exists(`${CHAT_ROOM_PREFIX}${roomId}`);

    if (!roomExists) {
      logInfo(requestId, `Room not found: ${roomId}`);
      // Use VercelResponse
      return response.status(404).json({ error: 'Room not found' });
    }

    const messagesKey = `${CHAT_MESSAGES_PREFIX}${roomId}`;
    // Assuming messages are stored as stringified JSON in the list
    const messagesStrings = await redis.lrange(messagesKey, 0, -1);
    logInfo(requestId, `Retrieved ${messagesStrings.length} raw messages for room ${roomId}`);

    // Parse each message string/object
    const messages = messagesStrings
      .map(item => {
        try {
          if (typeof item === 'object' && item !== null) {
            // Already an object, assume it's ChatMessage
            return item as ChatMessage; 
          } else if (typeof item === 'string') {
            // Item is a string, try parsing it
            const parsed = JSON.parse(item) as ChatMessage;
            return parsed;
          } else {
            // Unexpected type
            logInfo(requestId, `Unexpected item type in list for room ${roomId}:`, item);
            return null;
          }
        } catch (e) {
          logError(requestId, `Failed to process or parse item for room ${roomId}:`, { item, error: e });
          return null;
        }
      })
      .filter((message): message is ChatMessage => message !== null); // Type guard in filter

    logInfo(requestId, `Processed ${messages.length} valid messages for room ${roomId}`);

    // Use VercelResponse
    return response.status(200).json({ messages });
  } catch (error) {
    logError(requestId, `Error fetching messages for room ${roomId}:`, error);
    return response.status(500).json({ error: 'Failed to fetch messages' });
  }
}

async function sendMessage(response: VercelResponse, data: { roomId: string, username: string, content: string }, requestId: string) {
  const { roomId, username, content } = data;

  if (!roomId || !username || !content) {
    logInfo(requestId, 'Message sending failed: Missing required fields', { roomId, username, hasContent: !!content });
    // Use VercelResponse
    return response.status(400).json({
      error: 'Room ID, username, and content are required'
    });
  }

  logInfo(requestId, `Sending message in room ${roomId} from user ${username}`);
  
  try {
    // Check if room exists
    const roomExists = await redis.exists(`${CHAT_ROOM_PREFIX}${roomId}`);
    if (!roomExists) {
      logInfo(requestId, `Room not found: ${roomId}`);
      // Use VercelResponse
      return response.status(404).json({ error: 'Room not found' });
    }

    // Check if user exists
    const userExists = await redis.exists(`${CHAT_USERS_PREFIX}${username}`);
    if (!userExists) {
      logInfo(requestId, `User not found: ${username}`);
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
    logInfo(requestId, `Message saved with ID: ${message.id}`);

    // Update user's last active timestamp (assuming user data is stored as JSON string)
    const currentUserData = await redis.get<User>(`${CHAT_USERS_PREFIX}${username}`);
    if (currentUserData) {
      const updatedUser: User = { ...currentUserData, lastActive: getCurrentTimestamp() };
      await redis.set(`${CHAT_USERS_PREFIX}${username}`, updatedUser); // Store object directly
      logInfo(requestId, `Updated user ${username} last active timestamp`);
    }

    // Use VercelResponse
    return response.status(201).json({ message });
  } catch (error) {
    logError(requestId, `Error sending message in room ${roomId} from user ${username}:`, error);
    return response.status(500).json({ error: 'Failed to send message' });
  }
}

// User functions - modified to accept VercelResponse
async function getUsers(response: VercelResponse, requestId: string) {
  logInfo(requestId, 'Fetching all users');
  try {
    const keys = await redis.keys(`${CHAT_USERS_PREFIX}*`);
    logInfo(requestId, `Found ${keys.length} users`);
    
    if (keys.length === 0) {
      // Use VercelResponse
      return response.status(200).json({ users: [] });
    }

    const usersData = await redis.mget<User[]>(...keys);
    const users = usersData.map(user => user); // mget already parses JSON

    // Use VercelResponse
    return response.status(200).json({ users: users.filter(Boolean) });
  } catch (error) {
    logError(requestId, 'Error fetching users:', error);
    return response.status(500).json({ error: 'Failed to fetch users' });
  }
}

async function createUser(response: VercelResponse, data: { username: string }, requestId: string) {
  const { username } = data;

  if (!username) {
    logInfo(requestId, 'User creation failed: Username is required');
    // Use VercelResponse
    return response.status(400).json({ error: 'Username is required' });
  }

  logInfo(requestId, `Creating user: ${username}`);
  try {
    // Check if username already exists using setnx for atomicity
    const userKey = `${CHAT_USERS_PREFIX}${username}`;
    const user: User = {
      username,
      lastActive: getCurrentTimestamp()
    };

    const created = await redis.setnx(userKey, JSON.stringify(user)); // Use setnx

    if (!created) {
      logInfo(requestId, `Username already taken: ${username}`);
      // Use VercelResponse - User already exists
      return response.status(409).json({ error: 'Username already taken' });
    }

    logInfo(requestId, `User created: ${username}`);
    // Use VercelResponse
    return response.status(201).json({ user });
  } catch (error) {
    logError(requestId, `Error creating user ${username}:`, error);
    return response.status(500).json({ error: 'Failed to create user' });
  }
}

// Room membership functions - modified to accept VercelResponse
async function joinRoom(response: VercelResponse, data: { roomId: string, username: string }, requestId: string) {
  const { roomId, username } = data;

  if (!roomId || !username) {
    logInfo(requestId, 'Room join failed: Missing required fields', { roomId, username });
    // Use VercelResponse
    return response.status(400).json({
      error: 'Room ID and username are required'
    });
  }

  logInfo(requestId, `User ${username} joining room ${roomId}`);
  try {
    // Use Promise.all for concurrent checks
    const [roomData, userData] = await Promise.all([
      redis.get<ChatRoom>(`${CHAT_ROOM_PREFIX}${roomId}`),
      redis.get<User>(`${CHAT_USERS_PREFIX}${username}`)
    ]);

    if (!roomData) {
      logInfo(requestId, `Room not found: ${roomId}`);
      // Use VercelResponse
      return response.status(404).json({ error: 'Room not found' });
    }

    if (!userData) {
      logInfo(requestId, `User not found: ${username}`);
      // Use VercelResponse
      return response.status(404).json({ error: 'User not found' });
    }

    // Add user to room set
    await redis.sadd(`${CHAT_ROOM_USERS_PREFIX}${roomId}`, username);

    // Update room user count - Fetch latest count after adding
    const userCount = await redis.scard(`${CHAT_ROOM_USERS_PREFIX}${roomId}`);
    const updatedRoom: ChatRoom = { ...roomData, userCount };
    await redis.set(`${CHAT_ROOM_PREFIX}${roomId}`, updatedRoom); // Store object directly
    logInfo(requestId, `User ${username} joined room ${roomId}, new user count: ${userCount}`);

    // Update user's last active timestamp
    const updatedUser: User = { ...userData, lastActive: getCurrentTimestamp() };
    await redis.set(`${CHAT_USERS_PREFIX}${username}`, updatedUser); // Store object directly

    // Use VercelResponse
    return response.status(200).json({ success: true });
  } catch (error) {
    logError(requestId, `Error joining room ${roomId} for user ${username}:`, error);
    return response.status(500).json({ error: 'Failed to join room' });
  }
}

async function leaveRoom(response: VercelResponse, data: { roomId: string, username: string }, requestId: string) {
  const { roomId, username } = data;

  if (!roomId || !username) {
    logInfo(requestId, 'Room leave failed: Missing required fields', { roomId, username });
    // Use VercelResponse
    return response.status(400).json({
      error: 'Room ID and username are required'
    });
  }

  logInfo(requestId, `User ${username} leaving room ${roomId}`);
  try {
    // Check if room exists first
    const roomData = await redis.get<ChatRoom>(`${CHAT_ROOM_PREFIX}${roomId}`);
    if (!roomData) {
      logInfo(requestId, `Room not found: ${roomId}`);
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
      logInfo(requestId, `User ${username} left room ${roomId}, new user count: ${userCount}`);
    } else {
      logInfo(requestId, `User ${username} was not in room ${roomId}`);
    }

    // Use VercelResponse
    return response.status(200).json({ success: true });
  } catch (error) {
    logError(requestId, `Error leaving room ${roomId} for user ${username}:`, error);
    return response.status(500).json({ error: 'Failed to leave room' });
  }
} 