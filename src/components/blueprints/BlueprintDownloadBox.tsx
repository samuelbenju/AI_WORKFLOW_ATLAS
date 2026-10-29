import type { PublicBlueprintDescriptor } from '@/lib/blueprints';
import { blueprintDate, blueprintSize } from '@/lib/blueprint-display';
import type { FileAvailability } from '@/server/blueprints/availability';
import { BlueprintDownloadButton } from './BlueprintDownloadButton';

export function BlueprintDownloadBox({ release, availability, updatesAvailable }: { release: PublicBlueprintDescriptor;
  availability: Record<string, FileAvailability>; updatesAvailable: boolean }) {
  return <section className="blueprint-download-box" aria-labelledby="blueprint-release-title">
    <div className="blueprint-box-heading"><div><p className="eyebrow">FREE BLUEPRINT · VERSION {release.version}</p>
      <h3 id="blueprint-release-title">{release.title}</h3></div><span className="blueprint-badge">Published · reviewed</span></div>
    <p>{release.description}</p>
    <dl className="blueprint-release-meta"><div><dt>Published</dt><dd><time dateTime={release.publishedAt}>{blueprintDate(release.publishedAt)}</time></dd></div>
      <div><dt>Reviewed</dt><dd><time dateTime={release.verification.at}>{blueprintDate(release.verification.at)}</time></dd></div>
      <div><dt>Review method</dt><dd>{release.verification.method === 'static-review' ? 'Static review' : 'Isolated execution review'}</dd></div>
      <div><dt>License</dt><dd>{release.attribution.license}</dd></div></dl>
    {release.verification.method === 'static-review' && <p className="blueprint-notice">Static review checks the file; it does not certify that this automation has run successfully in your environment.</p>}
    <ul className="blueprint-files" aria-label="Files in this release">{release.files.map(file => <li key={file.id}>
      <div><h4>{file.filename}</h4><p className="blueprint-muted">{file.platform === 'generic' ? 'Platform-neutral' : file.platform} · {file.format === 'json' ? 'JSON' : 'Markdown'} · {blueprintSize(file.size)}</p>
        <details><summary>File integrity (SHA-256)</summary><code>{file.sha256}</code></details></div>
      {availability[file.id] === 'available' ? <BlueprintDownloadButton file={file} updatesAvailable={updatesAvailable} />
        : <p className="blueprint-notice">{availability[file.id] === 'missing' ? 'This file is not currently available. No download has started.' : 'The download service is temporarily unavailable. Please try again later.'}</p>}
    </li>)}</ul>
    <div className="blueprint-attribution"><p>Editorial attribution: {release.attribution.credit}</p>
      <ul aria-label="Blueprint sources">{release.attribution.sources.map((source, i) => <li key={source}><a href={source} target="_blank" rel="noopener noreferrer">Source {i + 1}<span className="sr-only"> (opens in a new tab)</span></a></li>)}</ul>
    </div><p className="blueprint-muted">Free download. No account, email address or subscription required.</p>
  </section>;
}
