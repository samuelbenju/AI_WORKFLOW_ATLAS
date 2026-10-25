import { ArrowDown, ArrowRight, FileText, GitBranch, ScanLine, ShieldCheck, Sparkles } from "lucide-react";

export function WorkflowMap() {
  return (
    <div className="workflow-map" role="img" aria-label="Illustrative workflow: define a task, research and draft, review sources, then apply human judgment. This is a diagram, not an executed agent.">
      <div className="map-grid" aria-hidden="true" />
      <div className="map-topline"><span className="mono">THE WORKFLOW MINDSET</span><span className="map-label">Illustration</span></div>
      <div className="map-node map-input"><div className="node-icon node-indigo"><ScanLine size={19} aria-hidden="true" /></div><div><small>01 / START WITH A PURPOSE</small><strong>What needs to get done?</strong></div></div>
      <div className="map-connector"><span /><ArrowDown size={15} aria-hidden="true" /></div>
      <div className="map-split">
        <div className="map-node"><div className="node-icon node-cyan"><Sparkles size={18} aria-hidden="true" /></div><div><small>EXPLORE</small><strong>Research</strong></div></div>
        <div className="map-node"><div className="node-icon node-purple"><FileText size={18} aria-hidden="true" /></div><div><small>CREATE</small><strong>Draft</strong></div></div>
      </div>
      <div className="map-connector"><span /><ArrowDown size={15} aria-hidden="true" /></div>
      <div className="map-node map-review"><div className="node-icon node-green"><ShieldCheck size={19} aria-hidden="true" /></div><div><small>02 / KEEP THE HUMAN IN THE LOOP</small><strong>Check sources. Apply judgment.</strong></div></div>
      <div className="map-bottomline"><span><GitBranch size={14} aria-hidden="true" /> A process you can understand</span><ArrowRight size={16} aria-hidden="true" /></div>
      <div className="map-orbit orbit-one" aria-hidden="true" /><div className="map-orbit orbit-two" aria-hidden="true" />
    </div>
  );
}
