// Utility for resolving themed icon paths using a pre-generated manifest.
// Generated manifest: public/icons/manifest.json
// Initial implementation supports only the 'default' theme.

export interface IconManifest {
  version: number;
  generatedAt: string;
  themes: Record<string, string[]>;
}

let manifestCache: IconManifest | null = null;
let manifestPromise: Promise<IconManifest> | null = null;

async function loadManifest(): Promise<IconManifest> {
  if (manifestCache) return manifestCache;
  if (!manifestPromise) {
    manifestPromise = fetch("/icons/manifest.json")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load icon manifest: ${r.status}`);
        return r.json();
      })
      .then((data) => (manifestCache = data));
  }
  return manifestPromise;
}

export interface GetIconPathOptions {
  theme?: string | null;
  fallbackTheme?: string; // usually 'default'
  manifest?: IconManifest; // optional preloaded manifest
}

export function pickIconPath(
  name: string,
  { theme, fallbackTheme = "default", manifest }: GetIconPathOptions = {}
): string {
  // If no theme or same as fallback, short-circuit.
  if (!theme || theme === fallbackTheme) {
    return `/icons/${fallbackTheme}/${name}`;
  }
  const m = manifestCache || manifest; // allow pre-supplied
  if (m && m.themes[theme] && m.themes[theme].includes(name)) {
    return `/icons/${theme}/${name}`;
  }
  return `/icons/${fallbackTheme}/${name}`;
}

// React helper hook (lazy, no suspense) to resolve icon path.
// Usage: const path = useIconPath('videos.png', theme);
import { useEffect, useState } from "react";
// --- Legacy-aware resolver ---
// Accepts legacy stored values like /icons/file-text.png (no theme segment) or
// themed paths (/icons/default/file-text.png) or plain logical names (file-text.png).
export function resolveIconLegacyAware(
  iconOrName: string,
  theme?: string | null
): string {
  // If it's already a full /icons/... path, try to reduce to relative name & re-theme.
  if (iconOrName.startsWith("/icons/")) {
    const rest = iconOrName.slice("/icons/".length); // e.g. default/file.png OR file.png OR macpaint/brush.png
    const parts = rest.split("/");
    const maybeTheme = parts[0];
    // If manifest loaded and first segment is a known theme, strip it.
    const m = manifestCache;
    if (m && m.themes[maybeTheme]) {
      const relative = parts.slice(1).join("/");
      if (!relative) return iconOrName; // nothing after theme
      return pickIconPath(relative, { theme });
    }
    // Not a known theme: treat whole rest as relative logical name
    return pickIconPath(rest, { theme });
  }
  // Otherwise treat as relative logical name
  return pickIconPath(iconOrName, { theme });
}

export function useIconPath(name: string, theme?: string | null) {
  const [path, setPath] = useState(`/icons/default/${name}`);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await loadManifest();
        if (cancelled) return;
        setPath(pickIconPath(name, { theme, manifest: m }));
      } catch {
        // ignore; fallback already set
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [name, theme]);
  return path;
}
