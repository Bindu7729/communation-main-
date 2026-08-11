const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'application/pdf'
]);

export function validateAttachmentUpload(byteSize: number, mimeType: string, maxBytes: number = 25 * 1024 * 1024): { valid: boolean; error?: string } {
  if (byteSize <= 0) {
    return { valid: false, error: 'Empty file payload' };
  }
  if (byteSize > maxBytes) {
    return { valid: false, error: `File size exceeds ${Math.round(maxBytes / (1024 * 1024))}MB maximum threshold` };
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    return { valid: false, error: `Unsupported media type: ${mimeType}` };
  }
  return { valid: true };
}
