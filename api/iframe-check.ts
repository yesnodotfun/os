// No Next.js types needed – omit unused import to keep file framework‑agnostic.

export const config = {
  runtime: "edge",
};

/**
 * List of domains that should be automatically proxied.
 * Domains should be lowercase and without protocol.
 */
const AUTO_PROXY_DOMAINS = [
  "wikipedia.org",
  "wikimedia.org",
  "wikipedia.com",
  // Add more domains as needed
];

/**
 * Check if a URL's domain matches or is a subdomain of any auto-proxy domain
 */
const shouldAutoProxy = (url: string): boolean => {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return AUTO_PROXY_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch (e) {
    return false;
  }
};

/**
 * Check Wayback Machine CDX for a snapshot in the specified year/month
 */
const checkWaybackCdx = async (url: string, year: string, month: string): Promise<string | null> => {
  try {
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&from=${year}${month}01&to=${year}${month}31&output=json&limit=1`;
    const response = await fetch(cdxUrl);
    const data = await response.json();

    // CDX API returns an array where the first row is headers
    if (data && data.length > 1) {
      // Get the first snapshot (most recent in the specified month)
      const snapshot = data[1];
      if (snapshot) {
        const timestamp = snapshot[1]; // timestamp is in the second column
        return `https://web.archive.org/web/${timestamp}/${url}`;
      }
    }
    return null;
  } catch (error) {
    console.error("[iframe-check] Failed to check Wayback CDX:", error);
    return null;
  }
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
 *     title?: string
 *     waybackUrl?: string
 *   }
 *
 * On network or other unexpected errors we default to `allowed: true` so that navigation is not
 * blocked accidentally (the front‑end still has its own error handling for actual iframe errors).
 */

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const urlParam = searchParams.get("url");
  let mode = searchParams.get("mode") || "proxy"; // "check" | "proxy" (default)
  const year = searchParams.get("year");
  const month = searchParams.get("month");

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
    
  // Check if this is an auto-proxy domain
  const isAutoProxyDomain = shouldAutoProxy(normalizedUrl);
  
  // For auto-proxy domains in check mode, return JSON indicating embedding is not allowed
  if (isAutoProxyDomain && mode === "check") {
    return new Response(
      JSON.stringify({ 
        allowed: false, 
        reason: "Auto-proxied domain" 
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  
  // Force proxy mode for auto-proxy domains
  if (isAutoProxyDomain) {
    mode = "proxy";
  }

  // Check Wayback Machine if year and month are provided
  let waybackUrl: string | null = null;
  if (year && month) {
    waybackUrl = await checkWaybackCdx(normalizedUrl, year, month);
  }

  // -------------------------------
  // Helper: perform header‑only check
  // -------------------------------
  const checkSiteEmbeddingAllowed = async () => {
    try {
      let res = await fetch(normalizedUrl, {
        method: "GET",
        redirect: "follow",
      });

      if (!res.ok) {
          throw new Error(`Upstream fetch failed with status ${res.status}`);
      }

      const xFrameOptions = res.headers.get("x-frame-options") || "";
      const headerCsp = res.headers.get("content-security-policy") || "";
      const contentType = res.headers.get("content-type") || "";

      // Check meta tags and extract title only for HTML content
      let metaCsp = "";
      let pageTitle: string | undefined = undefined; // Initialize title

      if (contentType.includes("text/html")) {
          const html = await res.text();
          // Extract meta CSP
          const metaTagMatch = html.match(
              /<meta\s+http-equiv=['\"]Content-Security-Policy['\"]\s+content=['\"]([^\'\"]*)['\"][^>]*>/i
          );
          if (metaTagMatch && metaTagMatch[1]) {
              metaCsp = metaTagMatch[1];
          }
          // Extract title (case-insensitive)
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            // Basic sanitization: decode HTML entities and trim whitespace
            try {
              // Use a simple approach for common entities; full decoding might need a library
              pageTitle = titleMatch[1]
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .trim();
            } catch (e) {
              console.error("Error decoding title:", e);
              pageTitle = titleMatch[1].trim(); // Fallback to raw title
            }
          }
      }

      // Helper to check frame-ancestors directive
      const checkFrameAncestors = (cspString: string): boolean => {
          if (!cspString) return false; // No policy = no restriction
          const directiveMatch = cspString
              .toLowerCase()
              .split(";")
              .map((d) => d.trim())
              .find((d) => d.startsWith("frame-ancestors"));
          if (!directiveMatch) return false; // No frame-ancestors = no restriction from this policy

          const directiveValue = directiveMatch.replace("frame-ancestors", "").trim();
          // If the value is exactly 'none', it's definitely blocked.
          if (directiveValue === "'none'") return true; // Blocked

          // Simplified: if it doesn't contain '*', assume it blocks cross-origin.
          return !directiveValue.includes("*");
      };

      const isBlockedByCsp = (() => {
        // Blocked if *either* header OR meta tag CSP restricts frame-ancestors
        return checkFrameAncestors(headerCsp) || checkFrameAncestors(metaCsp);
      })();

      const isBlockedByXfo = (() => {
        if (!xFrameOptions) return false;
        const value = xFrameOptions.toLowerCase();
        return value.includes("deny") || value.includes("sameorigin");
      })();

      const allowed = !(isBlockedByXfo || isBlockedByCsp);
      // Add meta CSP to reason if relevant
      const finalReason = !allowed
        ? isBlockedByXfo
            ? `X-Frame-Options: ${xFrameOptions}`
            : metaCsp && checkFrameAncestors(metaCsp)
                ? `Content-Security-Policy (meta): ${metaCsp}`
                : `Content-Security-Policy (header): ${headerCsp}`
        : undefined;

      return { allowed, reason: finalReason, title: pageTitle, waybackUrl }; // Include waybackUrl in return

    } catch (error) {
        // If fetching upstream headers failed, assume embedding is blocked
        console.error(`[iframe-check] Failed to fetch upstream headers for ${normalizedUrl}:`, error);
        // No title available on error
        return { allowed: false, reason: `Proxy check failed: ${(error as Error).message}`, waybackUrl }; // Include waybackUrl in return
    }
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

    // If the upstream fetch failed (e.g., 403 Forbidden, 404 Not Found), return an error page
    if (!upstreamRes.ok) {
        // Classic IE-style error page
        const errorHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error ${upstreamRes.status}</title>
  <link rel="stylesheet" href="https://os.ryo.lu/fonts/fonts.css"> 
  <style>
    * {
      box-sizing: border-box;
    }
    html, body {
      font-family: "Geneva-12", "ArkPixel", system-ui, sans-serif;
      font-size: 12px;
      margin: 0;
      padding: 0;
      height: 100%;
    }
    body {
      background-color: #ffffff;
      color: #000000;
      padding: 24px;
      text-align: left;
    }
    h1 {
      font-size: 18px;
      color: #000000;
      font-weight: normal;
      margin: 0;
      padding: 0;
      display: flex;
      align-items: center;
    }
    p {
      margin: 12px 0;
      line-height: 1.4;
    }
    .divider {
      height: 1px;
      background-color: #ccc;
      margin: 20px 0;
    }
    ul {
      margin: 16px 0;
      padding-left: 20px;
    }
    li {
      margin-bottom: 8px;
      list-style-type: disc;
    }
    a {
      color: #f00;
      text-decoration: underline;
    }
    .footer {
      margin-top: 40px;
      color: #333;
    }
  </style>
</head>
<body>
  <h1>
    The page cannot be found
  </h1>
  
  <p>The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
  
  <div class="divider"></div>
  
  <p>Please try the following:</p>
  
  <ul>
    <li>If you typed the page address in the Address bar, make sure that it is spelled correctly.</li>
    <li>Open <a href="https://${new URL(normalizedUrl).hostname}" target="_blank" rel="noopener noreferrer">${new URL(normalizedUrl).hostname}</a> in a new tab, and then look for links to the information you want.</li>
    <li>Click the <a href="javascript:void(0)" onclick="window.parent.postMessage({type: 'goBack'}, '*')">Back</a> button to try another link.</li>
  </ul>
  
  <div class="footer">
    HTTP ${upstreamRes.status} - ${upstreamRes.statusText || "File not found"}<br>
    Internet Explorer
  </div>
</body>
</html>`;

        return new Response(errorHtml, {
            status: upstreamRes.status,
            headers: { 
                "Content-Type": "text/html",
                "Access-Control-Allow-Origin": "*",
                "Content-Security-Policy": "frame-ancestors *; sandbox allow-scripts allow-forms allow-same-origin allow-popups"
            }
        });
    }

    // Clone headers so we can edit them
    const headers = new Headers(upstreamRes.headers);
    const contentType = headers.get("content-type") || "";
    let pageTitle: string | undefined = undefined; // Initialize title for proxy mode

    headers.delete("x-frame-options");
    headers.delete("content-security-policy");
    headers.set(
      "content-security-policy",
      "frame-ancestors *; sandbox allow-scripts allow-forms allow-same-origin allow-popups"
    );
    headers.set("access-control-allow-origin", "*");

    // If it's HTML, inject the <base> tag and click interceptor script
    if (contentType.includes("text/html")) {
        let html = await upstreamRes.text();

        // Extract title before modifying HTML
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            try {
              pageTitle = titleMatch[1]
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .trim();
            } catch (e) {
              console.error("Error decoding title in proxy:", e);
              pageTitle = titleMatch[1].trim(); // Fallback
            }
        }

        // Inject <base> tag right after <head> (case‑insensitive)
        const baseTag = `<base href="${normalizedUrl}">`;
        // Inject title meta tag if title was extracted
        const titleMetaTag = pageTitle ? `<meta name="page-title" content="${encodeURIComponent(pageTitle)}">` : '';

        const clickInterceptorScript = `
<script>
  document.addEventListener('click', function(event) {
    var targetElement = event.target.closest('a');
    if (targetElement && targetElement.href) {
      event.preventDefault();
      event.stopPropagation();
      try {
        const absoluteUrl = new URL(targetElement.getAttribute('href'), document.baseURI || window.location.href).href;
        window.parent.postMessage({ type: 'iframeNavigation', url: absoluteUrl }, '*');
      } catch (e) { console.error("Error resolving/posting URL:", e); }
    }
  }, true);
</script>
`;
        const headIndex = html.search(/<head[^>]*>/i);
        if (headIndex !== -1) {
            const insertPos = headIndex + html.match(/<head[^>]*>/i)![0].length;
            html = html.slice(0, insertPos) + baseTag + titleMetaTag + html.slice(insertPos); // Inject base and title meta
        } else {
            // Fallback: Prepend if no <head>
            html = baseTag + titleMetaTag + html;
        }

        // Inject script right before </body> (case‑insensitive)
        const bodyEndIndex = html.search(/<\/body>/i);
        if (bodyEndIndex !== -1) {
          html = html.slice(0, bodyEndIndex) + clickInterceptorScript + html.slice(bodyEndIndex);
        } else {
          // Fallback: Append script if no </body>
          html += clickInterceptorScript;
        }

        // Add the extracted title to a custom header (URL-encoded)
        if (pageTitle) {
          headers.set("X-Proxied-Page-Title", encodeURIComponent(pageTitle));
        }

        return new Response(html, {
            status: upstreamRes.status,
            headers,
        });
    } else {
        // For non‑HTML content, stream the body directly
        // No title extraction or header needed for non-HTML
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