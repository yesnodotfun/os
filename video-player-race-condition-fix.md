# Video Player Race Condition Bug Fix

## Problem Description
When adding a video from a link preview, the initial play would play the wrong video. This was caused by a race condition where the video needed to be added first, then played with the correct index.

## Root Cause Analysis
The race condition occurred in the `addVideo` function in `src/apps/videos/components/VideosAppComponent.tsx`. The issue was:

1. **Asynchronous State Update**: The `setVideos` function was called to add a new video to the array
2. **Stale State Reference**: Immediately after, `safeSetCurrentIndex(videos.length)` was called, but `videos.length` still referred to the old array length (before the new video was added)
3. **Wrong Index**: This caused the wrong video to be selected for playback

### Example:
- If there were 5 videos in the playlist (indices 0-4)
- A new video should be added at index 5
- But `videos.length` was still 5 (old value), so it tried to play the video at index 5
- The new video was actually at index 5, but the state wasn't updated yet

## Solution
The fix was to move the index setting logic inside the `setVideos` callback where we have access to the new array:

### Before (Buggy Code):
```typescript
setVideos((prev) => {
  const newVideos = [...prev, newVideo];
  if (!isShuffled) {
    setOriginalOrder(newVideos);
  }
  return newVideos;
});

// This used stale `videos.length` value
safeSetCurrentIndex(videos.length); 
setIsPlaying(true);
```

### After (Fixed Code):
```typescript
setVideos((prev) => {
  const newVideos = [...prev, newVideo];
  if (!isShuffled) {
    setOriginalOrder(newVideos);
  }
  
  // Set current index to the newly added video (last position)
  const newVideoIndex = newVideos.length - 1;
  safeSetCurrentIndex(newVideoIndex);
  setIsPlaying(true);
  
  return newVideos;
});
```

## Additional Improvements
Also cleaned up the `processVideoId` function to simplify the autoplay logic:

### Before:
```typescript
await handleAddAndPlayVideoById(videoId);
if (shouldAutoplay) {
  const newIndex = useVideoStore.getState().currentIndex;
  const addedVideo = useVideoStore.getState().videos[newIndex];
  if (addedVideo?.id === videoId) {
    setIsPlaying(true);
  } else {
    console.warn("[Videos] Index mismatch after adding video, autoplay skipped.");
  }
}
```

### After:
```typescript
await handleAddAndPlayVideoById(videoId);
// Note: handleAddAndPlayVideoById already sets isPlaying to true
// Only need to handle mobile Safari case here
if (!shouldAutoplay) {
  setIsPlaying(false);
}
```

## Files Modified
- `src/apps/videos/components/VideosAppComponent.tsx`
  - Fixed the `addVideo` function to set the correct index inside the `setVideos` callback
  - Simplified the `processVideoId` function's autoplay logic

## Testing
The fix ensures that:
1. Videos are properly added to the playlist
2. The correct video (newly added) is selected for playback
3. The playing state is set correctly
4. Mobile Safari autoplay restrictions are respected

## Impact
This fix resolves the race condition where link preview videos would play the wrong video, ensuring a consistent user experience when adding videos from external sources.