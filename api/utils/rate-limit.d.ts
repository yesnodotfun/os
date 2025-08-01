export function checkAndIncrementAIMessageCount(
  identifier: string,
  isAuthenticated: boolean,
  authToken?: string | null
): Promise<{ allowed: boolean; count: number; limit: number }>;

export declare const AI_LIMIT_PER_5_HOURS: number;
export declare const AI_LIMIT_ANON_PER_5_HOURS: number;

// Generic rate-limit utilities
export function checkCounterLimit(args: {
  key: string;
  windowSeconds: number;
  limit: number;
}): Promise<{
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  windowSeconds: number;
  resetSeconds: number;
}>;

export function getClientIp(req: any): string;
export function makeKey(parts: Array<string | null | undefined>): string;