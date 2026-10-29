export function ServiceInquiryCard({ email }: { email: string | null }) {
  if (!email) return null;
  return <section className="blueprint-service" aria-labelledby="blueprint-service-title">
    <h3 id="blueprint-service-title">Need this workflow built for your business?</h3>
    <p>Ask whether configuration, integration and maintenance support is available for your team.</p>
    <a className="button button-outline" href={`mailto:${encodeURIComponent(email)}?subject=Workflow%20implementation%20inquiry`}>Contact Atlas about implementation</a>
    <p className="blueprint-muted">This is a contact request, not a service booking or a sponsorship application. Availability and terms require a separate agreement.</p>
  </section>;
}
