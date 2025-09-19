/**
 * Ultra-simple video ID generation for browser-session management
 * No timestamp, no complexity - just random IDs for latest video tracking
 */

/**
 * Generate a simple random video ID
 * Format: vid_randomstring (e.g., "vid_abc123def456")
 */
export function generateSimpleVideoId(): string {
  const random = Math.random().toString(36).substring(2, 15);
  return `vid_${random}`;
}

/**
 * Check if a string is a valid simple video ID format
 */
export function isValidSimpleVideoId(id: string): boolean {
  return /^vid_[a-z0-9]+$/.test(id);
}

/**
 * Extract video ID from a URL if present
 */
export function extractVideoIdFromUrl(url: string): string | null {
  try {
    // For /api/videos?id=vid_abc123 format
    const urlObj = new URL(url, 'http://localhost');
    const id = urlObj.searchParams.get('id');
    if (id && isValidSimpleVideoId(id)) {
      return id;
    }

    // For blob URLs with video ID in path: /videos/vid_abc123.mp4
    const pathMatch = url.match(/\/vid_[a-z0-9]+\.mp4/);
    if (pathMatch) {
      return pathMatch[0].replace(/^\/|\.mp4$/g, '');
    }

    return null;
  } catch (error) {
    return null;
  }
}
