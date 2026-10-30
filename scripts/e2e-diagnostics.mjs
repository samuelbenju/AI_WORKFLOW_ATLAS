// Public annotations reveal only checked source locations and runner statuses, never failure payloads.
export function failedLocations(report){
 const result=[];
 function visit(suite){for(const spec of suite.specs??[]){
  const file=String(spec.file??'').replaceAll('\\','/').replace(/^.*\/tests\/e2e\//,'tests/e2e/');
  const normalized=file.startsWith('tests/e2e/')?file:'tests/e2e/'+file;
  if(!/^tests\/e2e\/[a-z0-9-]+\.spec\.ts$/.test(normalized)||!Number.isSafeInteger(spec.line)||spec.line<1)continue;
  for(const t of spec.tests??[])if(t.status==='unexpected')for(const r of t.results??[])if(['failed','timedOut','interrupted'].includes(r.status))result.push({file:normalized,line:spec.line,status:r.status});
 }for(const child of suite.suites??[])visit(child);}
 for(const suite of report.suites??[])visit(suite);
 return result.slice(0,10);
}
