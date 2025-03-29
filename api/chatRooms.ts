import { Redis } from '@upstash/redis';
import { ChatMessage, ChatRoom, User } from '../src/types/chat';

// Set up Redis client
const redis = new Redis({
  url: process.env.REDIS_KV_REST_API_URL,
  token: process.env.REDIS_KV_REST_API_TOKEN,
});

// Logging utilities
const logRequest = (method: string, url: string, action: string | null, id: string) => {
  console.log(`[${id}] ${method} ${url} - Action: ${action || 'none'}`);
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
export const runtime = "edge";
export const maxDuration = 60;

// Data models
// Removed type definitions here, now imported from src/types/chat.ts

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

// Error response helper
const createErrorResponse = (message: string, status: number) => {
  return Response.json({ error: message }, { status });
};

// GET handler
export async function GET(request: Request) {
  const requestId = generateRequestId();
  const startTime = performance.now();
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  logRequest('GET', request.url, action, requestId);

  try {
    switch (action) {
      case 'getRooms':
        return await handleGetRooms(requestId);
      case 'getRoom': {
        const roomId = url.searchParams.get('roomId');
        if (!roomId) {
          logInfo(requestId, 'Missing roomId parameter');
          return createErrorResponse('roomId query parameter is required', 400);
        }
        return await handleGetRoom(roomId, requestId);
      }
      case 'getMessages': {
        const roomId = url.searchParams.get('roomId');
        if (!roomId) {
          logInfo(requestId, 'Missing roomId parameter');
          return createErrorResponse('roomId query parameter is required', 400);
        }
        return await handleGetMessages(roomId, requestId);
      }
      case 'getUsers':
        return await handleGetUsers(requestId);
      default:
        logInfo(requestId, `Invalid action: ${action}`);
        return createErrorResponse('Invalid action', 400);
    }
  } catch (error) {
    logError(requestId, 'Error handling GET request:', error);
    return createErrorResponse('Internal server error', 500);
  } finally {
    const duration = performance.now() - startTime;
    logInfo(requestId, `Request completed in ${duration.toFixed(2)}ms`);
  }
}

// POST handler
export async function POST(request: Request) {
  const requestId = generateRequestId();
  const startTime = performance.now();
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  logRequest('POST', request.url, action, requestId);

  try {
    // Parse JSON body
    const body = await request.json();

    switch (action) {
      case 'createRoom':
        return await handleCreateRoom(body, requestId);
      case 'joinRoom':
        return await handleJoinRoom(body, requestId);
      case 'leaveRoom':
        return await handleLeaveRoom(body, requestId);
      case 'sendMessage':
        return await handleSendMessage(body, requestId);
      case 'createUser':
        return await handleCreateUser(body, requestId);
      default:
        logInfo(requestId, `Invalid action: ${action}`);
        return createErrorResponse('Invalid action', 400);
    }
  } catch (error) {
    logError(requestId, 'Error handling POST request:', error);
    return createErrorResponse('Internal server error', 500);
  } finally {
    const duration = performance.now() - startTime;
    logInfo(requestId, `Request completed in ${duration.toFixed(2)}ms`);
  }
}

// DELETE handler
export async function DELETE(request: Request) {
  const requestId = generateRequestId();
  const startTime = performance.now();
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  logRequest('DELETE', request.url, action, requestId);

  try {
    switch (action) {
      case 'deleteRoom': {
        const roomId = url.searchParams.get('roomId');
        if (!roomId) {
          logInfo(requestId, 'Missing roomId parameter');
          return createErrorResponse('roomId query parameter is required', 400);
        }
        return await handleDeleteRoom(roomId, requestId);
      }
      default:
        logInfo(requestId, `Invalid action: ${action}`);
        return createErrorResponse('Invalid action', 400);
    }
  } catch (error) {
    logError(requestId, 'Error handling DELETE request:', error);
    return createErrorResponse('Internal server error', 500);
  } finally {
    const duration = performance.now() - startTime;
    logInfo(requestId, `Request completed in ${duration.toFixed(2)}ms`);
  }
}

// Room functions
async function handleGetRooms(requestId: string) {
  logInfo(requestId, 'Fetching all rooms');
  try {
    const keys = await redis.keys(`${CHAT_ROOM_PREFIX}*`);
    logInfo(requestId, `Found ${keys.length} rooms`);
    
    if (keys.length === 0) {
      return Response.json({ rooms: [] });
    }

    const roomsData = await redis.mget<ChatRoom[]>(...keys);
    const rooms = roomsData.map(room => room).filter(Boolean);

    return Response.json({ rooms });
  } catch (error) {
    logError(requestId, 'Error fetching rooms:', error);
    return createErrorResponse('Failed to fetch rooms', 500);
  }
}

async function handleGetRoom(roomId: string, requestId: string) {
  logInfo(requestId, `Fetching room: ${roomId}`);
  try {
    const room = await redis.get<ChatRoom>(`${CHAT_ROOM_PREFIX}${roomId}`);

    if (!room) {
      logInfo(requestId, `Room not found: ${roomId}`);
      return createErrorResponse('Room not found', 404);
    }

    return Response.json({ room });
  } catch (error) {
    logError(requestId, `Error fetching room ${roomId}:`, error);
    return createErrorResponse('Failed to fetch room', 500);
  }
}

async function handleCreateRoom(data: { name: string }, requestId: string) {
  const { name } = data;

  if (!name) {
    logInfo(requestId, 'Room creation failed: Name is required');
    return createErrorResponse('Room name is required', 400);
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

    await redis.set(`${CHAT_ROOM_PREFIX}${roomId}`, room);
    logInfo(requestId, `Room created: ${roomId}`);

    return Response.json({ room }, { status: 201 });
  } catch (error) {
    logError(requestId, `Error creating room ${name}:`, error);
    return createErrorResponse('Failed to create room', 500);
  }
}

async function handleDeleteRoom(roomId: string, requestId: string) {
  logInfo(requestId, `Deleting room: ${roomId}`);
  try {
    const roomExists = await redis.exists(`${CHAT_ROOM_PREFIX}${roomId}`);

    if (!roomExists) {
      logInfo(requestId, `Room not found for deletion: ${roomId}`);
      return createErrorResponse('Room not found', 404);
    }

    // Delete room and associated messages/users
    const pipeline = redis.pipeline();
    pipeline.del(`${CHAT_ROOM_PREFIX}${roomId}`);
    pipeline.del(`${CHAT_MESSAGES_PREFIX}${roomId}`);
    pipeline.del(`${CHAT_ROOM_USERS_PREFIX}${roomId}`);
    await pipeline.exec();
    logInfo(requestId, `Room deleted: ${roomId}`);

    return Response.json({ success: true });
  } catch (error) {
    logError(requestId, `Error deleting room ${roomId}:`, error);
    return createErrorResponse('Failed to delete room', 500);
  }
}

// Message functions
async function handleGetMessages(roomId: string, requestId: string) {
  logInfo(requestId, `Fetching messages for room: ${roomId}`);

  try {
    const roomExists = await redis.exists(`${CHAT_ROOM_PREFIX}${roomId}`);

    if (!roomExists) {
      logInfo(requestId, `Room not found: ${roomId}`);
      return createErrorResponse('Room not found', 404);
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

    return Response.json({ messages });
  } catch (error) {
    logError(requestId, `Error fetching messages for room ${roomId}:`, error);
    return createErrorResponse('Failed to fetch messages', 500);
  }
}

async function handleSendMessage(data: { roomId: string, username: string, content: string }, requestId: string) {
  const { roomId, username, content } = data;

  if (!roomId || !username || !content) {
    logInfo(requestId, 'Message sending failed: Missing required fields', { roomId, username, hasContent: !!content });
    return createErrorResponse('Room ID, username, and content are required', 400);
  }

  logInfo(requestId, `Sending message in room ${roomId} from user ${username}`);
  
  try {
    // Check if room exists
    const roomExists = await redis.exists(`${CHAT_ROOM_PREFIX}${roomId}`);
    if (!roomExists) {
      logInfo(requestId, `Room not found: ${roomId}`);
      return createErrorResponse('Room not found', 404);
    }

    // Check if user exists
    const userExists = await redis.exists(`${CHAT_USERS_PREFIX}${username}`);
    if (!userExists) {
      logInfo(requestId, `User not found: ${username}`);
      return createErrorResponse('User not found', 404);
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
      await redis.set(`${CHAT_USERS_PREFIX}${username}`, updatedUser);
      logInfo(requestId, `Updated user ${username} last active timestamp`);
    }

    return Response.json({ message }, { status: 201 });
  } catch (error) {
    logError(requestId, `Error sending message in room ${roomId} from user ${username}:`, error);
    return createErrorResponse('Failed to send message', 500);
  }
}

// User functions
async function handleGetUsers(requestId: string) {
  logInfo(requestId, 'Fetching all users');
  try {
    const keys = await redis.keys(`${CHAT_USERS_PREFIX}*`);
    logInfo(requestId, `Found ${keys.length} users`);
    
    if (keys.length === 0) {
      return Response.json({ users: [] });
    }

    const usersData = await redis.mget<User[]>(...keys);
    const users = usersData.map(user => user).filter(Boolean);

    return Response.json({ users });
  } catch (error) {
    logError(requestId, 'Error fetching users:', error);
    return createErrorResponse('Failed to fetch users', 500);
  }
}

async function handleCreateUser(data: { username: string }, requestId: string) {
  const { username } = data;

  if (!username) {
    logInfo(requestId, 'User creation failed: Username is required');
    return createErrorResponse('Username is required', 400);
  }

  logInfo(requestId, `Creating user: ${username}`);
  try {
    // Check if username already exists using setnx for atomicity
    const userKey = `${CHAT_USERS_PREFIX}${username}`;
    const user: User = {
      username,
      lastActive: getCurrentTimestamp()
    };

    const created = await redis.setnx(userKey, JSON.stringify(user));

    if (!created) {
      logInfo(requestId, `Username already taken: ${username}`);
      return createErrorResponse('Username already taken', 409);
    }

    logInfo(requestId, `User created: ${username}`);
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    logError(requestId, `Error creating user ${username}:`, error);
    return createErrorResponse('Failed to create user', 500);
  }
}

// Room membership functions
async function handleJoinRoom(data: { roomId: string, username: string }, requestId: string) {
  const { roomId, username } = data;

  if (!roomId || !username) {
    logInfo(requestId, 'Room join failed: Missing required fields', { roomId, username });
    return createErrorResponse('Room ID and username are required', 400);
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
      return createErrorResponse('Room not found', 404);
    }

    if (!userData) {
      logInfo(requestId, `User not found: ${username}`);
      return createErrorResponse('User not found', 404);
    }

    // Add user to room set
    await redis.sadd(`${CHAT_ROOM_USERS_PREFIX}${roomId}`, username);

    // Update room user count - Fetch latest count after adding
    const userCount = await redis.scard(`${CHAT_ROOM_USERS_PREFIX}${roomId}`);
    const updatedRoom: ChatRoom = { ...roomData, userCount };
    await redis.set(`${CHAT_ROOM_PREFIX}${roomId}`, updatedRoom);
    logInfo(requestId, `User ${username} joined room ${roomId}, new user count: ${userCount}`);

    // Update user's last active timestamp
    const updatedUser: User = { ...userData, lastActive: getCurrentTimestamp() };
    await redis.set(`${CHAT_USERS_PREFIX}${username}`, updatedUser);

    return Response.json({ success: true });
  } catch (error) {
    logError(requestId, `Error joining room ${roomId} for user ${username}:`, error);
    return createErrorResponse('Failed to join room', 500);
  }
}

async function handleLeaveRoom(data: { roomId: string, username: string }, requestId: string) {
  const { roomId, username } = data;

  if (!roomId || !username) {
    logInfo(requestId, 'Room leave failed: Missing required fields', { roomId, username });
    return createErrorResponse('Room ID and username are required', 400);
  }

  logInfo(requestId, `User ${username} leaving room ${roomId}`);
  try {
    // Check if room exists first
    const roomData = await redis.get<ChatRoom>(`${CHAT_ROOM_PREFIX}${roomId}`);
    if (!roomData) {
      logInfo(requestId, `Room not found: ${roomId}`);
      return createErrorResponse('Room not found', 404);
    }

    // Remove user from room set
    const removed = await redis.srem(`${CHAT_ROOM_USERS_PREFIX}${roomId}`, username);

    // If user was actually removed, update the count
    if (removed) {
      // Fetch latest count after removing
      const userCount = await redis.scard(`${CHAT_ROOM_USERS_PREFIX}${roomId}`);
      const updatedRoom: ChatRoom = { ...roomData, userCount };
      await redis.set(`${CHAT_ROOM_PREFIX}${roomId}`, updatedRoom);
      logInfo(requestId, `User ${username} left room ${roomId}, new user count: ${userCount}`);
    } else {
      logInfo(requestId, `User ${username} was not in room ${roomId}`);
    }

    return Response.json({ success: true });
  } catch (error) {
    logError(requestId, `Error leaving room ${roomId} for user ${username}:`, error);
    return createErrorResponse('Failed to leave room', 500);
  }
} 