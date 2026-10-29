'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import type { PublicBlueprintDescriptor } from '@/lib/blueprints';
import { downloadFailure } from '@/lib/blueprint-display';

export function BlueprintDownloadButton({ file, updatesAvailable }: { file: PublicBlueprintDescriptor['files'][number]; updatesAvailable: boolean }) {
  const [state, setState] = useState<'ready' | 'pending' | 'started' | 'error' | 'gone'>('ready');
  const [error, setError] = useState('');
  async function download() {
    if (state === 'pending' || state === 'gone') return;
    setState('pending'); setError('');
    try {
      // No subscription, cookies or analytics required; this request itself is not persisted.
      const response = await fetch(file.href, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(20000) });
      if (!response.ok) { setError(downloadFailure(response.status)); setState(response.status === 404 ? 'gone' : 'error'); return; }
      if (response.headers.get('content-length') !== String(file.size) || !response.headers.get('content-disposition')?.startsWith('attachment;')) throw Error();
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength !== file.size) throw Error();
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
      if (digest !== file.sha256) throw Error();
      const objectUrl = URL.createObjectURL(new Blob([bytes], { type: file.format === 'json' ? 'application/json' : 'text/markdown' }));
      const link = document.createElement('a'); link.href = objectUrl; link.download = file.filename; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 20000);
      setState('started');
    } catch { setError(downloadFailure(0)); setState('error'); }
  }
  return <div className="blueprint-download-action">
    <button className="button button-primary" type="button" onClick={download} disabled={state === 'pending' || state === 'gone'} aria-busy={state === 'pending'}>
      <Download size={17} aria-hidden="true" />{state === 'pending' ? 'Preparing download…' : state === 'gone' ? 'Download unavailable' : `Download Blueprint (.${file.format === 'json' ? 'json' : 'md'})`}
      <span className="sr-only"> — {file.filename}</span>
    </button>
    <noscript><a href={file.href} download={file.filename}>Download {file.filename}</a><p>Your browser handles this attachment directly. Refresh the guide if it is unavailable.</p></noscript>
    <div role="status" aria-live="polite" className="blueprint-download-status">
      {state === 'started' && <><p>Your download has started.</p><p>Your browser controls where the file is saved.</p><div className="blueprint-followups">
        <a href="#blueprint-setup">View setup instructions</a><Link prefetch={false} href="/use-cases">Explore related workflows</Link>
        {updatesAvailable && <Link prefetch={false} href="/newsletter">Get notified about updates</Link>}
      </div></>}
      {error && <p>{error}</p>}
    </div>
  </div>;
}
