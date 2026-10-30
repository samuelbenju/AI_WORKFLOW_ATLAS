// Read-only fixed-host transport. No environment values, bodies or credentials are logged.
export const targetSha='786ef4445b3b26e6dc242ae8a7ceb267c5d44580';
const expectedRepo='https://github.com/samuelbenju/AI_WORKFLOW_ATLAS';
const expectedBuild='npm ci --include=dev --ignore-scripts --no-audit --no-fund && npm run build';
const expectedStart='npm run start -- --port "$PORT"';
export async function renderPreflight(key,transport=fetch){
 if(!key)throw Error('RENDER_SECRET_MISSING');
 async function get(path){
  const r=await transport('https://api.render.com/v1'+path,{method:'GET',redirect:'error',headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error('RENDER_HTTP_'+r.status);
  const reader=r.body?.getReader();if(!reader)throw Error('RENDER_EMPTY');let size=0;const chunks=[];
  try{for(;;){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>1048576)throw Error('RENDER_RESPONSE_LIMIT');chunks.push(p.value);}}finally{await reader.cancel();}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
 }
 const services=[];let cursor='';
 for(let page=0;page<5;page++){
  const rows=await get('/services?limit=100'+(cursor?'&cursor='+encodeURIComponent(cursor):''));if(!Array.isArray(rows))throw Error('RENDER_SHAPE');
  services.push(...rows.map(r=>r.service));if(rows.length<100)break;cursor=rows.at(-1)?.cursor;if(!cursor||page===4)throw Error('RENDER_PAGINATION_LIMIT');
 }
 const matches=services.filter(s=>s?.serviceDetails?.url==='https://ai-workflow-atlas.onrender.com');
 if(matches.length!==1)throw Error('RENDER_SERVICE_AMBIGUOUS');const s=matches[0];
 if(!/^srv-[a-z0-9]+$/.test(s.id)||s.type!=='web_service'||s.repo?.replace(/\.git$/,'')!==expectedRepo||s.branch!=='main')throw Error('RENDER_TARGET_MISMATCH');
 const detail=await get('/services/'+s.id);if(detail.id!==s.id)throw Error('RENDER_TARGET_MISMATCH');
 const deployments=await get('/services/'+s.id+'/deploys?limit=20');if(!Array.isArray(deployments))throw Error('RENDER_SHAPE');
 const live=deployments.map(d=>d.deploy).find(d=>d?.status==='live');
 if(!/^[a-f0-9]{40}$/.test(live?.commit?.id??''))throw Error('RENDER_LIVE_NOT_FOUND');
 const cfg=detail.serviceDetails??{},runtime=cfg.envSpecificDetails??{};
 const checks={autoDeployOff:detail.autoDeploy==='no',build:runtime.buildCommand===expectedBuild,start:runtime.startCommand===expectedStart,health:cfg.healthCheckPath==='/api/health',notSuspended:detail.suspended==='not_suspended'};
 return {serviceId:s.id,repository:expectedRepo,branch:'main',liveSha:live.commit.id,targetSha,checks,ready:Object.values(checks).every(Boolean),deploymentStatuses:deployments.slice(0,10).map(d=>({status:String(d.deploy?.status??'unknown').replace(/[^a-z_]/g,'').slice(0,50)})),note:'GET only; no deploy, no secrets/config values or raw logs. Live deployment is not proof of catalog readiness.'};
}
