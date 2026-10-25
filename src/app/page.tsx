import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, Check, Compass, Layers3, Lightbulb, ListChecks, Route, Sparkles } from "lucide-react";
import { WorkflowMap } from "@/components/home/workflow-map";

const directions = [
  { number: "01", icon: Layers3, title: "Find the right tools", text: "Understand what a tool does, where it fits, and the trade-offs that matter.", label: "AI tools", className: "direction-indigo" },
  { number: "02", icon: Route, title: "Connect ideas to action", text: "Start with a real problem. Follow a practical workflow, one clear step at a time.", label: "Practical use cases", className: "direction-cyan" },
  { number: "03", icon: BookOpen, title: "Build your understanding", text: "Learn the reasoning behind a workflow, including its limitations and alternatives.", label: "Guides & tutorials", className: "direction-purple" },
];

export default function Home() {
  return (
    <>
      <section className="hero container" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow"><span className="status-dot" /> AN INDEPENDENT GUIDE TO APPLIED AI</div>
          <h1 id="hero-title">Less AI noise.<br />More <span className="gradient-text">possibility.</span></h1>
          <p className="hero-description">A clearer path from <em>“what if”</em> to <em>“here’s how.”</em> Discover the tools, workflows, and ideas that help you do meaningful work with AI.</p>
          <div className="hero-actions"><a className="button button-primary" href="#explore">Explore the atlas <ArrowUpRight size={18} aria-hidden="true" /></a><a className="button button-text" href="#approach">A practical approach <ArrowRight size={17} aria-hidden="true" /></a></div>
          <p className="hero-note"><Compass size={14} aria-hidden="true" /> Currently taking shape. Built for the curious.</p>
        </div>
        <WorkflowMap />
        <div className="hero-bottom"><span className="mono">A BETTER WAY TO NAVIGATE WHAT’S NEXT</span><ArrowDownRight size={20} aria-hidden="true" /></div>
      </section>

      <section className="explore-section" id="explore" aria-labelledby="explore-title">
        <div className="container">
          <div className="section-heading"><div><p className="eyebrow muted">YOUR NEXT DIRECTION</p><h2 id="explore-title">Start with what you want to do.</h2></div><p>Tools are only the beginning.<br />The real value is in how you use them.</p></div>
          <div className="direction-grid">
            {directions.map(({ number, icon: Icon, title, text, label, className }) => (
              <article className={`direction-card ${className}`} key={number}>
                <div className="card-top"><span className="direction-icon"><Icon size={23} strokeWidth={1.6} aria-hidden="true" /></span><span className="mono card-number">/{number}</span></div>
                <h3>{title}</h3><p>{text}</p>
                <div className="card-bottom"><span>{label}</span><span className="upcoming-label">In development</span></div>
              </article>
            ))}
          </div>
          <p className="section-note">The directories are being built. No tool listings or editorial reviews have been published yet.</p>
        </div>
      </section>

      <section className="approach-section container" id="approach" aria-labelledby="approach-title">
        <div className="approach-intro"><p className="eyebrow muted">A LITTLE MORE INTENTION</p><h2 id="approach-title">Useful comes<br />before impressive.</h2><p>AI should make work better. Our editorial approach starts with that simple idea.</p><span className="approach-symbol" aria-hidden="true"><Lightbulb size={46} strokeWidth={1} /></span></div>
        <div className="principles">
          <article><span className="principle-number">01</span><div><h3>A problem before a product</h3><p>Start with the work. Choose tools for the problem they solve, rather than the attention they attract.</p></div></article>
          <article><span className="principle-number">02</span><div><h3>Sources, steps, and limitations</h3><p>Useful guidance should explain where information comes from, how to apply it, and when it falls short.</p></div></article>
          <article><span className="principle-number">03</span><div><h3>Clarity about commercial relationships</h3><p>Future sponsorships and affiliate links will be clearly labeled. Paid placement should never be a hidden recommendation.</p></div></article>
        </div>
      </section>

      <section className="container status-section" id="project-status" aria-labelledby="status-title">
        <div className="status-panel">
          <div className="status-copy"><span className="status-pill"><span className="status-dot" /> FOUNDATION RELEASE</span><h2 id="status-title">Good things start<br />with a solid foundation.</h2><p>This is the first step of AI Workflow Atlas. The application shell is here; the directories, editorial content, and business features will follow in separate releases.</p><div className="status-caption"><Sparkles size={15} aria-hidden="true" /> No sign-ups, payments, or automated agents are active.</div></div>
          <div className="release-checklist"><div className="release-heading"><ListChecks size={19} aria-hidden="true" /><span>Building with intention</span></div><div className="release-item"><span className="check-icon"><Check size={14} aria-hidden="true" /></span><span>Application foundation</span><span className="release-state">Available</span></div><div className="release-item"><span className="pending-icon" /><span>Persistent data & directories</span><span className="release-state">Planned</span></div><div className="release-item"><span className="pending-icon" /><span>Editorial & business features</span><span className="release-state">Planned</span></div><div className="release-item"><span className="pending-icon" /><span>Agents & automation</span><span className="release-state">Planned</span></div><p>Quality over shortcuts. One verified release at a time.</p></div>
        </div>
      </section>
    </>
  );
}
