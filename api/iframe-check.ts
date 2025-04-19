// No Next.js types needed – omit unused import to keep file framework‑agnostic.

export const config = {
  runtime: "edge",
};

/**
 * Edge function that checks if a remote website allows itself to be embedded in an iframe.
 * We look at two common headers:
 *   1. `X-Frame-Options` – if present with values like `deny` or `sameorigin` we treat it as blocked.
 *   2. `Content-Security-Policy` – if it contains a `frame-ancestors` directive that does **not**
 *      include `*` or our own origin, we treat it as blocked.
 *
 * The function returns a small JSON object:
 *   {
 *     allowed: boolean,
 *     reason?: string
 *   }
 *
 * On network or other unexpected errors we default to `allowed: true` so that navigation is not
 * blocked accidentally (the front‑end still has its own error handling for actual iframe errors).
 */

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const urlParam = searchParams.get("url");
  const mode = searchParams.get("mode") || "proxy"; // "check" | "proxy" (default)

  if (!urlParam) {
    return new Response(
      JSON.stringify({ error: "Missing 'url' query parameter" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Ensure the URL starts with a protocol for fetch()
  const normalizedUrl = urlParam.startsWith("http")
    ? urlParam
    : `https://${urlParam}`;

  // -------------------------------
  // Helper: perform header‑only check
  // -------------------------------
  const checkSiteEmbeddingAllowed = async () => {
    // Some servers reject HEAD, so we try HEAD first, then fall back to GET (headers‑only).
    let res = await fetch(normalizedUrl, {
      method: "HEAD",
      redirect: "follow",
    });

    if (!res.ok && res.status === 405) {
      res = await fetch(normalizedUrl, {
        method: "GET",
        redirect: "follow",
      });
    }

    const xFrameOptions = res.headers.get("x-frame-options") || "";
    const contentSecurityPolicy =
      res.headers.get("content-security-policy") || "";

    const isBlockedByCsp = (() => {
      if (!contentSecurityPolicy) return false;
      const directiveMatch = contentSecurityPolicy
        .toLowerCase()
        .split(";")
        .map((d) => d.trim())
        .find((d) => d.startsWith("frame-ancestors"));
      if (!directiveMatch) return false;
      const directiveValue = directiveMatch.replace("frame-ancestors", "").trim();
      const allowedTokens = ["*", "'self'", "data:"];
      const containsAllowedToken = allowedTokens.some((tok) =>
        directiveValue.includes(tok)
      );
      return !containsAllowedToken;
    })();

    const isBlockedByXfo = (() => {
      if (!xFrameOptions) return false;
      const value = xFrameOptions.toLowerCase();
      return value.includes("deny") || value.includes("sameorigin");
    })();

    const allowed = !(isBlockedByXfo || isBlockedByCsp);
    const reason = !allowed
      ? isBlockedByXfo
        ? `X-Frame-Options: ${xFrameOptions}`
        : `Content-Security-Policy: frame-ancestors restriction`
      : undefined;

    return { allowed, reason } as { allowed: boolean; reason?: string };
  };

  try {
    // 1. Pure header‑check mode
    if (mode === "check") {
      const result = await checkSiteEmbeddingAllowed();
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Proxy mode – stream the upstream resource, removing blocking headers
    const upstreamRes = await fetch(normalizedUrl, { method: "GET", redirect: "follow" });

    // Clone headers so we can edit them
    const headers = new Headers(upstreamRes.headers);
    const contentType = headers.get("content-type") || "";

    headers.delete("x-frame-options");
    headers.delete("content-security-policy");
    headers.set(
      "content-security-policy",
      "frame-ancestors *; sandbox allow-scripts allow-forms allow-same-origin allow-popups"
    );
    headers.set("access-control-allow-origin", "*");

    // If it's HTML, inject the <base> tag
    if (contentType.includes("text/html")) {
        let html = await upstreamRes.text();
        const baseTag = `<base href="${normalizedUrl}">`;

        // Inject <base> tag right after <head> (case‑insensitive)
        const headIndex = html.search(/<head[^>]*>/i);
        if (headIndex !== -1) {
            const insertPos = headIndex + html.match(/<head[^>]*>/i)![0].length;
            html = html.slice(0, insertPos) + baseTag + html.slice(insertPos);
        } else {
            // Fallback: Prepend to body or the whole document if no <head>
            html = baseTag + html;
        }

        return new Response(html, {
            status: upstreamRes.status,
            headers,
        });
    } else {
        // For non‑HTML content, stream the body directly
        return new Response(upstreamRes.body, {
            status: upstreamRes.status,
            headers,
        });
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 