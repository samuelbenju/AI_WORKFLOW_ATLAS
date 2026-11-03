import {z} from 'zod';
export function implementationInquiry(email:string|null){
 if(!email||!z.email().max(320).safeParse(email).success)return null;
 const body=['Company or project:','Country:','Process to automate:','Current tools:','Main need:','','Do not include passwords, API keys or customer records.','This message requests a quote, not a booking.'].join('\n');
 return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent('Custom automation enquiry')}&body=${encodeURIComponent(body)}`;
}
