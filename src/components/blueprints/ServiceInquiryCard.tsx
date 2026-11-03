import {implementationInquiry} from '@/lib/implementation-contact';
import {leadImplementationInquiry} from '@/lib/blueprint-display';
export function ServiceInquiryCard({ email, guideSlug }: { email: string | null; guideSlug?: string }) {
  const generic=implementationInquiry(email);
  if (!generic) return null;
  const pilot=leadImplementationInquiry(email,guideSlug??'');
  return <section className="blueprint-service" aria-labelledby="blueprint-service-title">
    <h3 id="blueprint-service-title">{pilot?'Need this workflow implemented in your business?':'Need this workflow built for your business?'}</h3>
    <p>{pilot?'Ask about a Lead Automation Implementation Sprint for the standard lead qualification workflow in your own accounts, including configuration, synthetic validation and a handover session. Scope and availability must be confirmed separately.':'Request a quote for n8n configuration, lead automation, application integrations, workflow customization, administrative automation or implementation support. Scope and availability require confirmation.'}</p>
    <a className="button button-outline" href={pilot??generic}>{pilot?'Request an implementation quote':'Contact Atlas about implementation'}</a>
    <p className="blueprint-muted">This is a contact request, not a service booking or a sponsorship application. Availability and terms require a separate agreement.</p>
  </section>;
}
