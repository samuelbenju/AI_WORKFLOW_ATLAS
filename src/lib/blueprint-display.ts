export function blueprintSize(size: number) {
  return size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KiB` : `${(size / 1024 / 1024).toFixed(1)} MiB`;
}
export function blueprintDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}
export function downloadFailure(status: number) {
  if (status === 404) return 'This download is no longer available. Refresh the guide to check its current versions.';
  if (status === 429) return 'Too many download requests. Wait a few seconds before trying again.';
  if (status === 503) return 'The download service is temporarily unavailable. Please try again later.';
  return 'The download could not start. Please try again shortly.';
}
