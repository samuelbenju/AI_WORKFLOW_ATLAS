import {leadImplementationInquiry} from '@/lib/blueprint-display';
export function ServiceInquiryCard({ email, guideSlug }: { email: string | null; guideSlug?: string }) {
  if (!email) return null;
  const pilot=leadImplementationInquiry(email,guideSlug??'');
  return <section className="blueprint-service" aria-labelledby="blueprint-service-title">
    <h3 id="blueprint-service-title">{pilot?'Need this workflow implemented in your business?':'Need this workflow built for your business?'}</h3>
    <p>{pilot?'Ask about an Implementation Sprint for the standard lead qualification workflow in your own accounts, including configuration, synthetic validation and a handover session. Scope and availability must be confirmed separately.':'Ask whether configuration, integration and maintenance support is available for your team.'}</p>
    <a className="button button-outline" href={pilot??`mailto:${encodeURIComponent(email)}?subject=Workflow%20implementation%20inquiry`}>Contact Atlas about implementation</a>
    <p className="blueprint-muted">This is a contact request, not a service booking or a sponsorship application. Availability and terms require a separate agreement.</p>
  </section>;
}
