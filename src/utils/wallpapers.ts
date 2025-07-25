// Utility for loading wallpaper manifest at /wallpapers/manifest.json
// Similar approach to icons.ts
export interface WallpaperManifest {
  version: number;
  generatedAt: string;
  tiles: string[];
  photos: Record<string, string[]>; // category -> relative paths (e.g. photos/foliage/rose.jpg)
  videos: string[]; // relative paths
}

let manifestCache: WallpaperManifest | null = null;
let manifestPromise: Promise<WallpaperManifest> | null = null;

export async function loadWallpaperManifest(): Promise<WallpaperManifest> {
  if (manifestCache) return manifestCache;
  if (!manifestPromise) {
    manifestPromise = fetch("/wallpapers/manifest.json")
      .then((r) => {
        if (!r.ok)
          throw new Error(`Failed to load wallpaper manifest: ${r.status}`);
        return r.json();
      })
      .then((data) => (manifestCache = data));
  }
  return manifestPromise;
}
