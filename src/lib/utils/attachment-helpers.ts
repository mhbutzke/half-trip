// Supported file types for activity attachments
export const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

export const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Validates if a file type is allowed for attachments
 */
export function isValidAttachmentType(mimeType: string): boolean {
  return ALLOWED_ATTACHMENT_TYPES.includes(mimeType);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Check if a file type is an image
 */
export function isImageType(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('image/');
}

/**
 * Check if a file type is a PDF
 */
export function isPdfType(mimeType: string | null): boolean {
  return mimeType === 'application/pdf';
}

/**
 * Gets the file extension from a MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
  };
  return extensions[mimeType] || 'bin';
}
