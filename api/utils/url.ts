export function normalizeUrlForCacheKey(url: string | undefined | null): string | null {
  if (!url) return null;

  let tempUrl = url.trim();
  // Ensure URL has a protocol for the URL constructor
  if (!tempUrl.startsWith('http://') && !tempUrl.startsWith('https://')) {
    tempUrl = `https://${tempUrl}`;
  }

  try {
    const parsed = new URL(tempUrl);
    // Key is based on origin + pathname.
    // Remove trailing slash only if it's the root path ('/').
    let keyPath = parsed.pathname;
    if (keyPath !== '/' && keyPath.endsWith('/')) {
      keyPath = keyPath.slice(0, -1); // Remove trailing slash for non-root paths
    } else if (keyPath === '/') {
        keyPath = ''; // Treat root '/' as an empty path for key generation consistency
    }

    // Reconstruct the normalized URL without query params or hash
    const keyBase = `${parsed.origin}${keyPath}`;
    return keyBase;

  } catch (e) {
    console.error(`[URL Normalization Error] Failed for URL: ${url}`, e);
    // Fallback to the https-prefixed version if URL parsing failed
    // This might happen with invalid URLs.
    return tempUrl;
  }
} 