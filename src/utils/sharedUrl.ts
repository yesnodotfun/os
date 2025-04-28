/**
 * Decodes a shared URL code from the /share/{code} path
 */
export async function decodeSharedUrl(code: string): Promise<{ url: string; year: string } | null> {
  try {
    const response = await fetch(`/api/share-link?action=decode&code=${encodeURIComponent(code)}`);
    
    if (!response.ok) {
      console.error('Failed to decode shared URL:', await response.text());
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error decoding shared URL:', error);
    return null;
  }
}

/**
 * Extracts the code from a shared URL path
 */
export function extractCodeFromPath(path: string): string | null {
  // Match /internet-explorer/{code} pattern
  const match = path.match(/^\/internet-explorer\/([^\/]+)$/);
  return match ? match[1] : null;
} 