type Step = { title: string; description?: string };
export function BlueprintArchitecture({ steps }: { steps: Step[] }) {
  if (steps.length < 2) return null;
  const flow = <ol className="blueprint-flow" aria-label="Conceptual workflow steps">{steps.map((step, i) => <li key={i}>
    <span className="blueprint-flow-number" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
    <div><h4>{step.title}</h4>{step.description && <p>{step.description}</p>}</div>
    {i < steps.length - 1 && <span className="blueprint-flow-arrow" aria-hidden="true">→</span>}
  </li>)}</ol>;
  return <section className="blueprint-architecture" aria-labelledby="blueprint-architecture-title">
    <h3 id="blueprint-architecture-title">How the workflow fits together</h3>
    <p className="blueprint-muted">Conceptual overview based on reviewed editorial steps. This is not an execution trace or proof of a working integration.</p>
    {steps.length > 6 ? <details><summary>View all {steps.length} conceptual steps</summary>{flow}</details> : flow}
  </section>;
}
