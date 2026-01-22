// Supported file types for receipt uploads
export const ALLOWED_RECEIPT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

export const MAX_RECEIPT_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validates if a file type is allowed for receipts
 */
export function isValidReceiptType(mimeType: string): boolean {
  return ALLOWED_RECEIPT_TYPES.includes(mimeType);
}

/**
 * Format file size for display
 */
export function formatReceiptSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Check if a file type is an image
 */
export function isReceiptImage(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('image/');
}

/**
 * Check if a file type is a PDF
 */
export function isReceiptPdf(mimeType: string | null): boolean {
  return mimeType === 'application/pdf';
}

/**
 * Detects if the file type is an image based on file extension (for URLs)
 */
export function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some((ext) => lowerUrl.includes(ext));
}

/**
 * Detects if the file type is a PDF based on file extension (for URLs)
 */
export function isPdfUrl(url: string): boolean {
  return url.toLowerCase().includes('.pdf');
}
