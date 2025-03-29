import { Redis } from '@upstash/redis';

// Set up Redis client
const redis = new Redis({
  url: 'https://obliging-albacore-48177.upstash.io',
  token: 'AbwxAAIjcDFjZTdjNjI3MGY0NmI0ZDYyYjg2NDBhMGI0NDdmOWI2N3AxMA',
});

// API runtime config
export const runtime = "edge";
export const edge = true;
export const maxDuration = 60;

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

// API handler
export default async function handler(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  
  try {
    // Route API requests based on method and action query parameter
    if (req.method === 'GET') {
      switch (action) {
        case 'getRooms':
          return await getRooms();
        case 'getRoom':
          const getRoomId = url.searchParams.get('roomId');
          if (!getRoomId) {
            return new Response(JSON.stringify({ error: 'roomId query parameter is required' }), { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return await getRoom(getRoomId);
        case 'getMessages':
          const getMessagesRoomId = url.searchParams.get('roomId');
          if (!getMessagesRoomId) {
            return new Response(JSON.stringify({ error: 'roomId query parameter is required' }), { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return await getMessages(getMessagesRoomId);
        case 'getUsers':
          return await getUsers();
        default:
          return new Response(JSON.stringify({ error: 'Invalid action' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
      }
    } else if (req.method === 'POST') {
      const body = await req.json();
      switch (action) {
        case 'createRoom':
          return await createRoom(body);
        case 'joinRoom':
          return await joinRoom(body);
        case 'leaveRoom':
          return await leaveRoom(body);
        case 'sendMessage':
          return await sendMessage(body);
        case 'createUser':
          return await createUser(body);
        default:
          return new Response(JSON.stringify({ error: 'Invalid action' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
      }
    } else if (req.method === 'DELETE') {
      switch (action) {
        case 'deleteRoom':
          const deleteRoomId = url.searchParams.get('roomId');
          if (!deleteRoomId) {
            return new Response(JSON.stringify({ error: 'roomId query parameter is required' }), { 
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return await deleteRoom(deleteRoomId);
        default:
          return new Response(JSON.stringify({ error: 'Invalid action' }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
      }
    }
    
    // Fallback for unsupported methods
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error handling request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Room functions
async function getRooms() {
  const keys = await redis.keys(`${CHAT_ROOM_PREFIX}*`);
  if (keys.length === 0) {
    return new Response(JSON.stringify({ rooms: [] }), { 
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const rooms = await Promise.all(
    keys.map(async key => {
      const room = await redis.get(key);
      return room ? JSON.parse(room as string) : null;
    })
  );
  
  return new Response(JSON.stringify({ rooms: rooms.filter(Boolean) }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getRoom(roomId: string) {
  const room = await redis.get(`${CHAT_ROOM_PREFIX}${roomId}`);
  
  if (!room) {
    return new Response(JSON.stringify({ error: 'Room not found' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ room: JSON.parse(room as string) }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

async function createRoom(data: { name: string }) {
  const { name } = data;
  
  if (!name) {
    return new Response(JSON.stringify({ error: 'Room name is required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const roomId = generateId();
  const room: ChatRoom = {
    id: roomId,
    name,
    createdAt: getCurrentTimestamp(),
    userCount: 0
  };
  
  await redis.set(`${CHAT_ROOM_PREFIX}${roomId}`, JSON.stringify(room));
  
  return new Response(JSON.stringify({ room }), { 
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function deleteRoom(roomId: string) {
  const room = await redis.get(`${CHAT_ROOM_PREFIX}${roomId}`);
  
  if (!room) {
    return new Response(JSON.stringify({ error: 'Room not found' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Delete room and associated messages
  await redis.del(`${CHAT_ROOM_PREFIX}${roomId}`);
  await redis.del(`${CHAT_MESSAGES_PREFIX}${roomId}`);
  await redis.del(`${CHAT_ROOM_USERS_PREFIX}${roomId}`);
  
  return new Response(JSON.stringify({ success: true }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

// Message functions
async function getMessages(roomId: string) {
  const room = await redis.get(`${CHAT_ROOM_PREFIX}${roomId}`);
  
  if (!room) {
    return new Response(JSON.stringify({ error: 'Room not found' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const messagesKey = `${CHAT_MESSAGES_PREFIX}${roomId}`;
  const messages = await redis.lrange(messagesKey, 0, -1);
  
  return new Response(JSON.stringify({ 
    messages: messages.map(message => typeof message === 'string' ? JSON.parse(message) : null).filter(Boolean)
  }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

async function sendMessage(data: { roomId: string, username: string, content: string }) {
  const { roomId, username, content } = data;
  
  if (!roomId || !username || !content) {
    return new Response(JSON.stringify({ 
      error: 'Room ID, username, and content are required' 
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Check if room exists
  const room = await redis.get(`${CHAT_ROOM_PREFIX}${roomId}`);
  if (!room) {
    return new Response(JSON.stringify({ error: 'Room not found' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Check if user exists
  const user = await redis.get(`${CHAT_USERS_PREFIX}${username}`);
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Create and save the message
  const message: ChatMessage = {
    id: generateId(),
    roomId,
    username,
    content,
    timestamp: getCurrentTimestamp()
  };
  
  await redis.lpush(`${CHAT_MESSAGES_PREFIX}${roomId}`, JSON.stringify(message));
  // Keep only the latest 100 messages per room
  await redis.ltrim(`${CHAT_MESSAGES_PREFIX}${roomId}`, 0, 99);
  
  // Update user's last active timestamp
  await redis.set(`${CHAT_USERS_PREFIX}${username}`, JSON.stringify({
    username,
    lastActive: getCurrentTimestamp()
  }));
  
  return new Response(JSON.stringify({ message }), { 
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

// User functions
async function getUsers() {
  const keys = await redis.keys(`${CHAT_USERS_PREFIX}*`);
  if (keys.length === 0) {
    return new Response(JSON.stringify({ users: [] }), { 
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const users = await Promise.all(
    keys.map(async key => {
      const user = await redis.get(key);
      return user ? JSON.parse(user as string) : null;
    })
  );
  
  return new Response(JSON.stringify({ users: users.filter(Boolean) }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

async function createUser(data: { username: string }) {
  const { username } = data;
  
  if (!username) {
    return new Response(JSON.stringify({ error: 'Username is required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Check if username already exists
  const existingUser = await redis.get(`${CHAT_USERS_PREFIX}${username}`);
  if (existingUser) {
    return new Response(JSON.stringify({ error: 'Username already taken' }), { 
      status: 409,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const user: User = {
    username,
    lastActive: getCurrentTimestamp()
  };
  
  await redis.set(`${CHAT_USERS_PREFIX}${username}`, JSON.stringify(user));
  
  return new Response(JSON.stringify({ user }), { 
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Room membership functions
async function joinRoom(data: { roomId: string, username: string }) {
  const { roomId, username } = data;
  
  if (!roomId || !username) {
    return new Response(JSON.stringify({ 
      error: 'Room ID and username are required' 
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Check if room exists
  const roomData = await redis.get(`${CHAT_ROOM_PREFIX}${roomId}`);
  if (!roomData) {
    return new Response(JSON.stringify({ error: 'Room not found' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Check if user exists
  const userData = await redis.get(`${CHAT_USERS_PREFIX}${username}`);
  if (!userData) {
    return new Response(JSON.stringify({ error: 'User not found' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Add user to room
  await redis.sadd(`${CHAT_ROOM_USERS_PREFIX}${roomId}`, username);
  
  // Update room user count
  const room = JSON.parse(roomData as string) as ChatRoom;
  room.userCount += 1;
  await redis.set(`${CHAT_ROOM_PREFIX}${roomId}`, JSON.stringify(room));
  
  // Update user's last active timestamp
  const user = JSON.parse(userData as string) as User;
  user.lastActive = getCurrentTimestamp();
  await redis.set(`${CHAT_USERS_PREFIX}${username}`, JSON.stringify(user));
  
  return new Response(JSON.stringify({ success: true }), { 
    headers: { 'Content-Type': 'application/json' }
  });
}

async function leaveRoom(data: { roomId: string, username: string }) {
  const { roomId, username } = data;
  
  if (!roomId || !username) {
    return new Response(JSON.stringify({ 
      error: 'Room ID and username are required' 
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Check if room exists
  const roomData = await redis.get(`${CHAT_ROOM_PREFIX}${roomId}`);
  if (!roomData) {
    return new Response(JSON.stringify({ error: 'Room not found' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Remove user from room
  const removed = await redis.srem(`${CHAT_ROOM_USERS_PREFIX}${roomId}`, username);
  
  // If user was in the room, decrement the user count
  if (removed) {
    const room = JSON.parse(roomData as string) as ChatRoom;
    room.userCount = Math.max(0, room.userCount - 1);
    await redis.set(`${CHAT_ROOM_PREFIX}${roomId}`, JSON.stringify(room));
  }
  
  return new Response(JSON.stringify({ success: true }), { 
    headers: { 'Content-Type': 'application/json' }
  });
} 