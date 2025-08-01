// Shared CORS utilities for API routes

export const ALLOWED_ORIGINS = new Set<string>([
  "https://os.ryo.lu",
  "https://ryo.lu",
  "http://localhost:3000",
  "http://localhost:5173",
]);

export function getEffectiveOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (origin) return origin;
  const referer = req.headers.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function isAllowedOrigin(origin: string | null): boolean {
  return !!origin && ALLOWED_ORIGINS.has(origin);
}

export function preflightIfNeeded(req: Request, allowedMethods: string[], effectiveOrigin: string | null): Response | null {
  if (req.method !== "OPTIONS") return null;
  if (!isAllowedOrigin(effectiveOrigin)) return new Response("Unauthorized", { status: 403 });
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": effectiveOrigin!,
    "Access-Control-Allow-Methods": allowedMethods.join(", "),
    "Access-Control-Allow-Headers": "Content-Type",
  };
  return new Response(null, { headers });
}


