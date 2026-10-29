import Link from 'next/link';
import { blueprintKey } from '@/lib/blueprints';
import { legalConfiguration } from '@/lib/legal';
import { publicBlueprintsForGuide, publicBlueprintDescriptor } from '@/server/blueprints/service';
import { blueprintAvailability } from '@/server/blueprints/availability';
import { emailConfiguration } from '@/server/newsletter/config';
import { BlueprintDownloadBox } from './BlueprintDownloadBox';
import { BlueprintArchitecture } from './BlueprintArchitecture';
import { BlueprintRequirements } from './BlueprintRequirements';
import { ServiceInquiryCard } from './ServiceInquiryCard';

type Query = Record<string, string | string[] | undefined>;
function identity(value: string | string[] | undefined) {
  if (typeof value !== 'string') return undefined;
  const parts = value.split('@');
  if (parts.length !== 2) return undefined;
  const [blueprint, version] = parts;
  const result = blueprintKey.safeParse({ blueprint, version });
  return result.success ? result.data : undefined;
}

type SectionProps = { slug: string; query: Promise<Query>; conceptualSteps: string[] };
async function loadSection({ slug, query, conceptualSteps }: SectionProps) {
    const search = await query;
    const after = identity(search.blueprintAfter), selectedKey = identity(search.blueprintRelease);
    const page = await publicBlueprintsForGuide(slug, after);
    let selected = selectedKey ? await publicBlueprintDescriptor(selectedKey.blueprint, selectedKey.version) : null;
    if (selected?.useCaseSlug !== slug) selected = null;
    // A single unambiguous release can be shown directly. Multiple versions require an explicit choice.
    if (!search.blueprintRelease && page.items.length === 1 && !page.next && !after) selected = page.items[0]!;
    if (!page.items.length && !selected && !after && !page.next) return { empty: true as const };
    const options = selected && !page.items.some(r => r.id === selected.id && r.version === selected.version) ? [selected, ...page.items] : page.items;
    const path = `/use-cases/${slug}`;
    const availability = selected ? await blueprintAvailability(selected.files) : {};
    const presentation = selected?.presentation;
    const steps = presentation?.architecture?.steps ?? conceptualSteps.slice(0, 20).map((text, i) => ({ title: `Step ${i + 1}`, description: text }));
    const legal = legalConfiguration(), newsletter = emailConfiguration();
    return { empty: false as const, search, after, selected, page, options, path, availability, presentation, steps, legal, newsletter };
}

export async function BlueprintSection(props: SectionProps) {
  const data = await loadSection(props).catch(() => {
    console.error(JSON.stringify({ stage: 'blueprint.discovery', codes: ['BLUEPRINT_METADATA_UNAVAILABLE'] }));
    return { failed: true as const };
  });
  if ('failed' in data) return <section className="blueprint-section" aria-label="Blueprint availability"><p role="status">Blueprint information is temporarily unavailable. Please try again later.</p></section>;
  if (data.empty) return null;
  const { search, after, selected, page, options, path, availability, presentation, steps, legal, newsletter } = data;
  const { conceptualSteps } = props;
    return <section className="blueprint-section" id="blueprints" aria-labelledby="blueprints-title">
      <div className="section-heading"><div><p className="eyebrow muted">FROM GUIDE TO YOUR WORKSPACE</p><h2 id="blueprints-title">Downloadable blueprints</h2></div></div>
      <p>Choose a published release to inspect its requirements and files. Version numbers alone do not indicate suitability for your platform.</p>
      {options.length > 0 ? <form action={`${path}#blueprints`} method="get" className="blueprint-version-form">
        <label htmlFor="blueprint-release">Published blueprint and version</label>
        <select id="blueprint-release" name="blueprintRelease" defaultValue={selected ? `${selected.id}@${selected.version}` : ''} required>
          <option value="" disabled>Choose a published version</option>
          {options.map(release => <option key={`${release.id}@${release.version}`} value={`${release.id}@${release.version}`}>
            {release.title} · v{release.version} · {release.publishedAt.slice(0, 10)} · {[...new Set(release.files.map(f => `${f.platform}/${f.format}`))].join(', ')} · {release.files.length} file{release.files.length === 1 ? '' : 's'}
          </option>)}
        </select><button className="button button-outline" type="submit">View this version</button>
      </form> : <p className="blueprint-notice">No current releases on this page. Check further versions or return to the first page.</p>}
      {page.next && <Link prefetch={false} className="text-link" href={`${path}?blueprintAfter=${encodeURIComponent(`${page.next.blueprint}@${page.next.version}`)}#blueprints`}>More published versions →</Link>}
      {after && <Link prefetch={false} className="text-link" href={`${path}#blueprints`}>Back to first versions</Link>}
      {search.blueprintRelease && !selected && <p className="blueprint-notice">This version is not available for this guide. Choose an available published release.</p>}
      {selected && <>
        <BlueprintDownloadBox release={selected} availability={availability} updatesAvailable={newsletter.mode === 'resend' && newsletter.ready && legal.reviewed} />
        <BlueprintArchitecture steps={steps} />
        {!presentation?.architecture && conceptualSteps.length > 20 && <p className="blueprint-muted">Overview shows the first 20 editorial steps. The full guide remains above.</p>}
        <BlueprintRequirements requirements={presentation?.requirements} platforms={[...new Set(selected.files.map(f => f.platform))]} />
        <section className="blueprint-setup" id="blueprint-setup" aria-labelledby="blueprint-setup-title"><h3 id="blueprint-setup-title">Setup instructions</h3>
          {presentation?.setupInstructions ? <ol>{presentation.setupInstructions.map((instruction, i) => <li key={i}>{instruction}</li>)}</ol>
            : <p>Use the guide’s step-by-step instructions and the official platform documentation. Release-specific import instructions have not been provided. Check compatibility before importing.</p>}
          <a href="#workflow-toolkit">Review tools and their official documentation</a>
        </section>
        <ServiceInquiryCard email={legal.reviewed ? legal.email : null} />
      </>}
    </section>;
}
