import {z} from 'zod';
const emailSchema=z.email().max(320);
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

// The public contact is supplied only after the server's legal/contact review.
// This proposal is not a booking, a price or an operator availability promise.
export function leadImplementationInquiry(email:string|null,guideSlug:string){
  if(guideSlug!=='qualify-tally-leads-with-n8n-and-slack'||!email||!emailSchema.safeParse(email).success)return null;
  const body=['Company or project:','Country:','Tools currently used:','Required integrations:','Form platform:','Google Sheets availability:',
    'Slack availability:','Approximate monthly leads:','What needs to be automated:','',
    'Please do not include passwords, API keys, customer data or other credentials.'].join('\n');
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('[Piloto] Implementación Lead Flow')}&body=${encodeURIComponent(body)}`;
}
