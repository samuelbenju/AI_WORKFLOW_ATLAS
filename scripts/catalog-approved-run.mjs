// This step has the ephemeral GitHub token, never a database secret.
try {
  const id = process.env.CATALOG_DRY_RUN_ID;
  if (!/^[1-9][0-9]{0,19}$/.test(id ?? '')) throw Error();
  const base = 'https://api.github.com/repos/samuelbenju/AI_WORKFLOW_ATLAS/actions';
  const headers = { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' };
  const response = await fetch(`${base}/runs/${id}`, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error();
  const run = await response.json();
  const detail = await fetch(`${base}/workflows/${run.workflow_id}`, { headers, signal: AbortSignal.timeout(15000) });
  if (!detail.ok) throw Error();
  const workflow = await detail.json();
  if (run.head_sha !== process.env.GITHUB_SHA || run.head_branch !== 'main' || run.head_repository?.full_name !== 'samuelbenju/AI_WORKFLOW_ATLAS'
    || run.event !== 'workflow_dispatch' || run.status !== 'completed' || run.conclusion !== 'success' || workflow.path !== '.github/workflows/catalog-import.yml') throw Error();
  console.log('Verified successful manual run from the same main commit; the import step must also verify its dry-run artifact.');
} catch { console.error('Dry-run provenance not verified. No database access performed.'); process.exitCode = 1; }
