import type { BlueprintManifest } from '@/lib/blueprints';
type Requirements = NonNullable<BlueprintManifest['presentation']>['requirements'];
export function BlueprintRequirements({ requirements, platforms }: { requirements?: Requirements; platforms: string[] }) {
  const groups = requirements ? [
    ['Before you begin', requirements.prerequisites], ['External accounts', requirements.accounts],
    ['Credentials to configure', requirements.credentialSetup], ['Limitations', requirements.limitations], ['Potential external costs', requirements.externalCosts],
  ] as const : [];
  return <section className="blueprint-requirements" aria-labelledby="blueprint-requirements-title">
    <h3 id="blueprint-requirements-title">Before you import</h3>
    <p>File platforms: {platforms.join(', ')}. Review the linked tools and setup instructions before importing.</p>
    <p>Configure your own credentials directly in the automation platform. Never paste private keys into Atlas. Inspect the file and use a test environment with non-sensitive data first.</p>
    {!requirements && <p className="blueprint-notice">Release-specific requirements and compatibility have not been documented. No platform version or setup time is guaranteed.</p>}
    {groups.map(([title, items]) => items.length > 0 && <div key={title}><h4>{title}</h4><ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul></div>)}
    {requirements?.compatibility && <p>Reviewed compatibility: {requirements.compatibility.description} <a href={requirements.compatibility.source} target="_blank" rel="noopener noreferrer">Compatibility source<span className="sr-only"> (opens in a new tab)</span></a></p>}
    {requirements && requirements.externalCosts.length === 0 && <p>External costs have not been specified. Free download does not imply that third-party services are free.</p>}
  </section>;
}
