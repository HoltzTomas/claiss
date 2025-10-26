export function generateSimpleVideoId(): string {
  const random = Math.random().toString(36).substring(2, 15);
  return `vid_${random}`;
}

export function isValidSimpleVideoId(id: string): boolean {
  return /^vid_[a-z0-9]+$/.test(id);
}

export function extractVideoIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url, 'http://localhost');
    const id = urlObj.searchParams.get('id');
    if (id && isValidSimpleVideoId(id)) {
      return id;
    }

    const pathMatch = url.match(/\/vid_[a-z0-9]+\.mp4/);
    if (pathMatch) {
      return pathMatch[0].replace(/^\/|\.mp4$/g, '');
    }

    return null;
  } catch (error) {
    return null;
  }
}
