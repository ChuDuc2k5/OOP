/**
 * Kiểm tra xem URL chuyển hướng có phải là đường dẫn nội bộ an toàn hay không (chống Open Redirect).
 * Chỉ chấp nhận chuỗi bắt đầu bằng 1 dấu '/' và không bắt đầu bằng '//' hoặc '/\'.
 */
export function isSafeLocalUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  // Không chấp nhận protocol (http:, https:, javascript:, data:, etc.)
  if (trimmed.includes(':')) return false;
  // Bắt đầu bằng 1 dấu '/' và không bắt đầu bằng '//' hoặc '/\'
  return trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\');
}

/**
 * Trả về URL an toàn hoặc fallback về homePath
 */
export function getSafeRedirectUrl(
  nextUrl: string | null | undefined,
  fallback: string = '/'
): string {
  if (isSafeLocalUrl(nextUrl)) {
    return nextUrl!.trim();
  }
  return fallback;
}
