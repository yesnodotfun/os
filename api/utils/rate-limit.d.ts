export function checkAndIncrementAIMessageCount(
  identifier: string,
  isAuthenticated: boolean,
  authToken?: string | null
): Promise<{ allowed: boolean; count: number; limit: number }>;

export declare const AI_LIMIT_PER_5_HOURS: number;
export declare const AI_LIMIT_ANON_PER_5_HOURS: number;