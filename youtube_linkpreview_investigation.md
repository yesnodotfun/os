# YouTube Link Preview Crash Investigation

## Issue Description
After opening a YouTube link via LinkPreview (which launches the videos app), the app crashes when tapped again. The crash appears to be related to data corruption or invalid video data when added via linkpreview.

## Root Cause Analysis

### 1. **Duplicate Processing Prevention Issue**
The `VideosAppComponent` uses `lastProcessedInitialDataRef` to prevent processing the same `initialData` twice:

```typescript
// Line 623 in VideosAppComponent.tsx
if (lastProcessedInitialDataRef.current === initialData) return;
```

**Problem**: This comparison uses object reference equality, but `initialData` objects from different app launches might be different objects with the same content. This could cause:
- Legitimate re-opens to be ignored
- State inconsistencies when the app is reopened

### 2. **Premature Data Clearing**
After processing a video, the component clears the initialData:

```typescript
// Line 635-642 in VideosAppComponent.tsx
if (instanceId) {
  clearInstanceInitialData(instanceId);
}
```

**Problem**: This clearing happens asynchronously after a 100ms timeout, which could interfere with:
- Component re-rendering
- State updates
- Subsequent app launches

### 3. **Store State Persistence Issues**
The video store uses Zustand with persistence, but excludes videos from persistence:

```typescript
// Line 180-187 in useVideoStore.ts
partialize: (state) => ({
  currentIndex: state.currentIndex,
  loopAll: state.loopAll,
  loopCurrent: state.loopCurrent,
  isShuffled: state.isShuffled,
  // videos are excluded from persistence
})
```

**Problem**: When the app restarts:
- `currentIndex` might point to a video that no longer exists
- This could cause array index out of bounds errors
- The app might try to play a non-existent video

### 4. **Async Race Conditions**
The `processVideoId` function has multiple async operations that could race:

```typescript
// Line 567-608 in VideosAppComponent.tsx
const processVideoId = useCallback(async (videoId: string) => {
  // ... checking existing videos
  if (existingVideoIndex !== -1) {
    setCurrentIndex(existingVideoIndex);
    if (shouldAutoplay) {
      setIsPlaying(true);
    }
  } else {
    await handleAddAndPlayVideoById(videoId);
    // ... more async operations
  }
}, []);
```

**Problem**: Multiple rapid calls to `processVideoId` could cause:
- Duplicate video additions
- Inconsistent state updates
- Race conditions between state setters

### 5. **Error Handling in addVideo**
The `addVideo` function has multiple API calls that could fail:

```typescript
// Line 463-550 in VideosAppComponent.tsx
const addVideo = async (url: string) => {
  // 1. oEmbed API call
  const oembedResponse = await fetch(...)
  
  // 2. AI parse title API call
  const parseResponse = await fetch("/api/parse-title", ...)
  
  // 3. Update state
  setVideos((prev) => {
    const newVideos = [...prev, newVideo];
    setCurrentIndex(newVideos.length - 1);
    setIsPlaying(true);
    return newVideos;
  });
}
```

**Problem**: If any of these steps fail partially:
- The video might be added with incomplete data
- State might be partially updated
- The app could be left in an inconsistent state

## Specific Crash Scenarios

### Scenario 1: Index Out of Bounds
1. User opens YouTube link via LinkPreview
2. Video is added to playlist and `currentIndex` is set
3. App is closed/reopened
4. Store loads persisted `currentIndex` but `videos` array is reset to defaults
5. App crashes trying to access `videos[currentIndex]` where `currentIndex` > `videos.length`

### Scenario 2: Duplicate Processing
1. User opens YouTube link via LinkPreview
2. Video is processed and added
3. User quickly taps the app again
4. Same `initialData` is processed again due to timing issues
5. Duplicate video addition or state corruption occurs

### Scenario 3: Memory Leaks
1. `lastProcessedInitialDataRef` holds references to old `initialData` objects
2. These objects are never garbage collected
3. Memory usage grows over time
4. Eventually causes performance issues or crashes

## Recommended Fixes

### 1. **Fix Duplicate Processing Logic**
```typescript
// Use a more robust comparison
const lastProcessedVideoIdRef = useRef<string | null>(null);

// In the effect:
if (lastProcessedVideoIdRef.current === initialData?.videoId) return;
lastProcessedVideoIdRef.current = initialData?.videoId;
```

### 2. **Persist Videos in Store**
```typescript
// In useVideoStore.ts - remove videos from partialize exclusion
partialize: (state) => ({
  videos: state.videos,
  currentIndex: state.currentIndex,
  loopAll: state.loopAll,
  loopCurrent: state.loopCurrent,
  isShuffled: state.isShuffled,
})
```

### 3. **Add Bounds Checking**
```typescript
// In VideosAppComponent.tsx
const safeSetCurrentIndex = (index: number) => {
  const maxIndex = videos.length - 1;
  const safeIndex = Math.max(0, Math.min(index, maxIndex));
  setCurrentIndex(safeIndex);
};
```

### 4. **Debounce processVideoId**
```typescript
// Add debouncing to prevent rapid successive calls
const debouncedProcessVideoId = useMemo(
  () => debounce(processVideoId, 300),
  [processVideoId]
);
```

### 5. **Improve Error Handling**
```typescript
// Wrap video operations in try-catch with proper cleanup
const addVideo = async (url: string) => {
  setIsAddingVideo(true);
  try {
    // ... existing logic
  } catch (error) {
    // Reset state on error
    setCurrentIndex(Math.max(0, videos.length - 1));
    setIsPlaying(false);
    throw error;
  } finally {
    setIsAddingVideo(false);
  }
};
```

## Testing Strategy

1. **Test rapid LinkPreview clicks**: Click YouTube links quickly to test duplicate processing
2. **Test app restart scenarios**: Open YouTube via LinkPreview, close app, reopen
3. **Test with network failures**: Simulate API failures during video addition
4. **Test with invalid URLs**: Try malformed YouTube URLs
5. **Test persistence**: Verify state is correctly restored after app restart

## Priority

**HIGH** - This affects core functionality and user experience. The crash prevents users from reliably using the YouTube integration feature.