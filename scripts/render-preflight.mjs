import {renderPreflight} from './ops/render-preflight.mjs';
try{
 if(process.env.GITHUB_REPOSITORY!=='samuelbenju/AI_WORKFLOW_ATLAS'||process.env.GITHUB_REF!=='refs/heads/main'||process.env.RENDER_PREFLIGHT_ENABLED!=='true')throw Error('RENDER_PREFLIGHT_DISABLED');
 const result=await renderPreflight(process.env.RENDER_API_KEY);console.log(JSON.stringify(result));if(!result.ready)process.exitCode=1;
}catch(e){console.error(JSON.stringify({stage:'render.preflight',code:/^RENDER_[A-Z_0-9]+$/.test(e.message)?e.message:'RENDER_READ_FAILED'}));process.exitCode=1;}
