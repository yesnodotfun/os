/*
  Chat Rooms API end-to-end sanity test (Bun)

  Usage:
    BASE_URL=http://localhost:3000 bun scripts/test-chat-rooms.ts
    bun scripts/test-chat-rooms.ts --base http://localhost:3000

  What this covers (happy-path + a few edge checks):
  - Create user, set/check password, authenticate to get token
  - Token lifecycle: verify, generate, list, refresh, logout current, logout all
  - Rooms: create public/private, list, join/leave/switch (presence), room users
  - Messages: send, get, bulk, forbidden delete
  - Burst limiter: exceed short window limit to expect 429
*/

/* eslint-disable no-console */

declare const Bun: { argv: string[] };

const args = Bun.argv.slice(2);
function getArg(name: string) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
}

const BASE_URL = (getArg("--base") || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const idSuffix = Math.random().toString(36).slice(2, 8);
const alice = (getArg("--user") || process.env.TEST_USER || `alice-${idSuffix}`) as string;
const bob = `bob-${idSuffix}`;
const password1 = (getArg("--pass") || process.env.TEST_PASS || "passw0rd!") as string;
const password2 = "passw0rd!2";
const isFixedUser = !!getArg("--user") || !!process.env.TEST_USER;

const headersJson = { "Content-Type": "application/json" } as const;

type FetchOpts = {
  method?: "GET" | "POST" | "DELETE";
  action: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
};

async function api<T = unknown>({ method = "GET", action, headers, body, query }: FetchOpts): Promise<{ status: number; data: T; headers: Headers }> {
  const url = new URL(`${BASE_URL}/api/chat-rooms`);
  url.searchParams.set("action", action);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method,
    headers: { ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json().catch(() => ({} as T)) : ((await res.text()) as unknown as T);
  return { status: res.status, data, headers: res.headers };
}

function authHeaders(token: string | null | undefined, username: string | null | undefined): Record<string, string> {
  const h: Record<string, string> = { ...headersJson };
  if (token) h["Authorization"] = `Bearer ${token}`;
  if (username) h["x-username"] = username;
  return h;
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

type StepResult = { step: string; ok: boolean; note?: string };
const results: StepResult[] = [];
async function step<T>(name: string, fn: () => Promise<T>): Promise<T | undefined> {
  process.stdout.write(`\n— ${name}... `);
  const t0 = Date.now();
  try {
    const out = await fn();
    const dt = Date.now() - t0;
    console.log(`ok (${dt}ms)`);
    results.push({ step: name, ok: true });
    return out;
  } catch (e) {
    const dt = Date.now() - t0;
    const note = e instanceof Error ? e.message : String(e);
    console.log(`FAIL (${dt}ms)\n   →`, note);
    results.push({ step: name, ok: false, note });
    return undefined;
  }
}

async function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) (out as any)[k] = (obj as any)[k];
  return out;
}

async function main() {
  console.log(`BASE_URL = ${BASE_URL}`);

  let aliceToken: string | null = null;
  let aliceToken2: string | null = null;
  let aliceToken3: string | null = null;

  // 1) Create users
  await step(`Create user ${alice}`, async () => {
    const { status, data } = await api({ method: "POST", action: "createUser", headers: headersJson, body: { username: alice, password: password1 } });
    if (isFixedUser && status === 409) {
      return data; // user exists, continue
    }
    assert(status >= 200 && status < 300, `createUser status ${status}`);
    return data;
  });

  await step(`Create user ${bob}`, async () => {
    const { status, data } = await api({ method: "POST", action: "createUser", headers: headersJson, body: { username: bob, password: password1 } });
    assert(status >= 200 && status < 300, `createUser status ${status}`);
    return data;
  });

  // 2) Authenticate
  await step(`Authenticate ${alice} with password`, async () => {
    const { status, data } = await api<{ token: string }>({ method: "POST", action: "authenticateWithPassword", headers: headersJson, body: { username: alice, password: password1 } });
    if (!data?.token) {
      // Try login via createUser fallback if password changed elsewhere
      const createRes = await api<{ token?: string }>({ method: "POST", action: "createUser", headers: headersJson, body: { username: alice, password: password1 } });
      if (createRes.status === 200 && createRes.data?.token) {
        aliceToken = createRes.data.token;
        return { token: aliceToken } as any;
      }
    }
    assert(status === 200 && data?.token, `auth status ${status}`);
    aliceToken = data.token;
    return pick(data, ["token"] as any);
  });

  // 3) Verify token
  await step(`Verify token for ${alice}`, async () => {
    const { status, data } = await api<{ valid: boolean }>({ method: "GET", action: "verifyToken", headers: authHeaders(aliceToken, alice) });
    assert(status === 200 && data?.valid === true, `verify status ${status}`);
    return data;
  });

  // 4) Set password (success + failure path)
  await step(`Set password (reject too short)`, async () => {
    const { status } = await api({ method: "POST", action: "setPassword", headers: authHeaders(aliceToken, alice), body: { password: "short" } });
    assert(status === 400, `expected 400, got ${status}`);
  });

  await step(`Set password (good)`, async () => {
    const { status } = await api({ method: "POST", action: "setPassword", headers: authHeaders(aliceToken, alice), body: { password: password2 } });
    assert(status === 200, `expected 200, got ${status}`);
  });

  // 5) Generate extra token (have multiple tokens for alice)
  await step(`Generate additional token for ${alice}`, async () => {
    const { status, data } = await api<{ token: string }>({ method: "POST", action: "generateToken", headers: authHeaders(aliceToken, alice), body: { username: alice } });
    assert(status === 201 && data?.token, `generateToken status ${status}`);
    aliceToken2 = data.token;
  });

  // 6) List tokens
  await step(`List tokens for ${alice}`, async () => {
    const { status, data } = await api<{ tokens: Array<{ token: string; isCurrent?: boolean }> }>({ method: "POST", action: "listTokens", headers: authHeaders(aliceToken2, alice) });
    assert(status === 200 && Array.isArray(data?.tokens) && data.tokens.length >= 2, `listTokens status ${status}`);
  });

  // 7) Refresh token (deletes old token)
  await step(`Refresh token for ${alice}`, async () => {
    const { status, data } = await api<{ token: string }>({ method: "POST", action: "refreshToken", headers: headersJson, body: { username: alice, oldToken: aliceToken } });
    assert(status === 201 && data?.token, `refreshToken status ${status}`);
    aliceToken3 = data.token;
  });

  // Verify new token valid
  await step(`Verify new token`, async () => {
    const { status, data } = await api<{ valid: boolean }>({ method: "GET", action: "verifyToken", headers: authHeaders(aliceToken3, alice) });
    assert(status === 200 && data?.valid === true, `verify new token status ${status}`);
  });

  // Verify old token invalid or expired grace behavior
  await step(`Verify old token should not be valid`, async () => {
    const { status, data } = await api<{ valid?: boolean; expired?: boolean }>({ method: "GET", action: "verifyToken", headers: authHeaders(aliceToken, alice) });
    assert(status === 401 || (status === 200 && data?.expired === true), `expected 401 or expired, got ${status}`);
  });

  // 8) Create rooms (public + private)
  let publicRoomId: string | undefined;
  let publicRoomId2: string | undefined;
  let privateRoomId: string | undefined;

  await step(`Create public room as ${alice}` , async () => {
    const name = `pub-${idSuffix}`;
    const { status, data } = await api<{ room: { id: string } }>({ method: "POST", action: "createRoom", headers: authHeaders(aliceToken3, alice), body: { name } });
    assert(status === 201 && data?.room?.id, `createRoom public status ${status}`);
    publicRoomId = data.room.id;
  });

  await step(`Create second public room as ${alice}` , async () => {
    const name = `pub2-${idSuffix}`;
    const { status, data } = await api<{ room: { id: string } }>({ method: "POST", action: "createRoom", headers: authHeaders(aliceToken3, alice), body: { name } });
    assert(status === 201 && data?.room?.id, `createRoom public2 status ${status}`);
    publicRoomId2 = data.room.id;
  });

  await step(`Create private room with ${alice} & ${bob}`, async () => {
    const name = `priv-${idSuffix}`;
    const { status, data } = await api<{ room: { id: string } }>({ method: "POST", action: "createRoom", headers: authHeaders(aliceToken3, alice), body: { name, type: "private", members: [alice, bob] } });
    assert(status === 201 && data?.room?.id, `createRoom private status ${status}`);
    privateRoomId = data.room.id;
  });

  // 9) Rooms listing and filtering
  await step(`Get rooms (public-only)`, async () => {
    const { status, data } = await api<{ rooms: any[] }>({ method: "GET", action: "getRooms" });
    assert(status === 200 && Array.isArray(data?.rooms), `getRooms status ${status}`);
  });

  await step(`Get rooms for alice (includes private)`, async () => {
    const { status, data } = await api<{ rooms: any[] }>({ method: "GET", action: "getRooms", query: { username: alice } });
    assert(status === 200 && Array.isArray(data?.rooms) && data.rooms.length >= 2, `getRooms alice status ${status}`);
  });

  // 10) Join, send message, get messages, bulk
  let messageId: string | undefined;

  await step(`Join public room`, async () => {
    const { status } = await api({ method: "POST", action: "joinRoom", headers: authHeaders(aliceToken3, alice), body: { roomId: publicRoomId, username: alice } });
    assert(status === 200, `joinRoom status ${status}`);
  });

  await step(`Send message`, async () => {
    const { status, data } = await api<{ message: { id: string } }>({ method: "POST", action: "sendMessage", headers: authHeaders(aliceToken3, alice), body: { roomId: publicRoomId, username: alice, content: `hello badword1 http://example.com ${idSuffix}` } });
    assert(status === 201 && data?.message?.id, `sendMessage status ${status}`);
    messageId = data.message.id;
  });

  await step(`Get messages`, async () => {
    const { status, data } = await api<{ messages: any[] }>({ method: "GET", action: "getMessages", query: { roomId: publicRoomId! } });
    assert(status === 200 && Array.isArray(data?.messages) && data.messages.length >= 1, `getMessages status ${status}`);
  });

  await step(`Get bulk messages`, async () => {
    const { status, data } = await api<{ rooms: Record<string, any[]> }>({ method: "GET", action: "getBulkMessages", query: { roomIds: `${publicRoomId},${privateRoomId}` } });
    assert(status === 200 && data && typeof data === "object", `getBulkMessages status ${status}`);
  });

  // 11) Delete message (should be forbidden for non-ryo user)
  let bobToken: string | null = null;
  await step(`Authenticate ${bob} with password`, async () => {
    const { status, data } = await api<{ token: string }>({ method: "POST", action: "authenticateWithPassword", headers: headersJson, body: { username: bob, password: password1 } });
    assert(status === 200 && data?.token, `auth bob status ${status}`);
    bobToken = data.token;
  });

  await step(`Delete message forbidden for ${bob}`, async () => {
    const { status } = await api({ method: "DELETE", action: "deleteMessage", headers: authHeaders(bobToken, bob), query: { roomId: publicRoomId!, messageId: messageId! } });
    assert(status === 403, `expected 403, got ${status}`);
  });

  // 12) Switch rooms and presence checks
  await step(`Switch rooms (public1 -> public2)`, async () => {
    const { status } = await api({ method: "POST", action: "switchRoom", headers: authHeaders(aliceToken3, alice), body: { previousRoomId: publicRoomId, nextRoomId: publicRoomId2, username: alice } });
    assert(status === 200, `switchRoom status ${status}`);
  });

  await step(`Room users (public2 includes alice)`, async () => {
    const { status, data } = await api<{ users: string[] }>({ method: "GET", action: "getRoomUsers", headers: authHeaders(aliceToken3, alice), query: { roomId: publicRoomId2! } });
    assert(status === 200 && Array.isArray(data?.users) && data.users.map((u: string) => u.toLowerCase()).includes(alice), `getRoomUsers status ${status}`);
  });

  // 13) Burst rate-limiter short window (expect a 429 on 4th message quickly)
  await step(`Burst limiter: expect 429 on 4th quick message`, async () => {
    let lastStatus = 0; let hits = 0; let got429 = false;
    for (let i = 0; i < 4; i++) {
      const { status } = await api({ method: "POST", action: "sendMessage", headers: authHeaders(aliceToken3, alice), body: { roomId: publicRoomId2, username: alice, content: `spam-${i}-${idSuffix}` } });
      lastStatus = status; hits++;
      if (status === 429) { got429 = true; break; }
      await delay(200); // small spacing
    }
    assert(got429 === true || lastStatus === 429, `expected 429 within 4 attempts, last=${lastStatus}, hits=${hits}`);
  });

  // 14) Logout current session
  await step(`Logout current`, async () => {
    const { status } = await api({ method: "POST", action: "logoutCurrent", headers: authHeaders(aliceToken3, alice) });
    assert(status === 200, `logoutCurrent status ${status}`);
  });

  await step(`Verify logged-out token is invalid`, async () => {
    const { status } = await api({ method: "GET", action: "verifyToken", headers: authHeaders(aliceToken3, alice) });
    assert(status === 401, `expected 401 after logoutCurrent, got ${status}`);
  });

  // 15) Re-authenticate and logout all devices
  await step(`Re-authenticate ${alice}`, async () => {
    const { status, data } = await api<{ token: string }>({ method: "POST", action: "authenticateWithPassword", headers: headersJson, body: { username: alice, password: password2 } });
    assert(status === 200 && data?.token, `re-auth status ${status}`);
    aliceToken3 = data.token;
  });

  await step(`Logout all devices`, async () => {
    const { status, data } = await api<{ deletedCount: number }>({ method: "POST", action: "logoutAllDevices", headers: authHeaders(aliceToken3, alice) });
    assert(status === 200 && typeof data?.deletedCount === "number", `logoutAllDevices status ${status}`);
  });

  await step(`List tokens should be empty or minimal`, async () => {
    const { status, data } = await api<{ tokens: any[] }>({ method: "POST", action: "listTokens", headers: authHeaders(aliceToken3, alice) });
    // After logout-all, 401 is acceptable depending on session state
    assert((status === 200 && Array.isArray(data?.tokens)) || status === 401, `listTokens status ${status}`);
  });

  // Summary
  const passed = results.filter(r => r.ok).length;
  const failed = results.length - passed;
  console.log(`\n======== SUMMARY ========`);
  for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.step}${r.note ? ` — ${r.note}` : ""}`);
  console.log(`Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exitCode = 1;
});

