import type { PrismaClient } from "../src/generated/prisma/client";

// Original development examples persisted to PostgreSQL, never a runtime fallback.
export async function seedCatalogDevelopment(db: PrismaClient) {
  const [database] = await db.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
  if (process.env.NODE_ENV === "production" || !database || !/_(dev|test)$/.test(database.name)) throw new Error("Catalog seed requires a non-production _dev or _test database.");
  return db.$transaction(async (tx) => {
    const categories: Record<string, string> = {};
    for (const [slug, name] of [["productivity", "Productivity"], ["research", "Research & insights"], ["content", "Content & writing"], ["automation", "Workflow automation"], ["development", "Development"]] as const) {
      const category = await tx.category.upsert({ where: { slug }, update: {}, create: { slug, name: name! } });
      categories[slug!] = category.id;
    }
    const tags: Record<string, string> = {};
    for (const [slug, name] of [["writing", "Writing"], ["research", "Research"], ["no-code", "No-code"], ["coding", "Coding"], ["team-work", "Team workflows"]] as const) {
      const tag = await tx.tag.upsert({ where: { slug }, update: {}, create: { slug, name: name! } }); tags[slug!] = tag.id;
    }
    const tools = [
      { slug: "demo-chatgpt", name: "ChatGPT", summary: "A conversational starting point for drafting, exploring ideas, and working through a problem.", description: "Use a conversational assistant to turn rough notes into a first draft, examine alternative approaches, or develop an outline. Provide clear context and check factual statements against primary sources. This sample listing is not a hands-on product review.", url: "https://chatgpt.com/", category: "content", tag: "writing", featured: true },
      { slug: "demo-claude", name: "Claude", summary: "Explore a second perspective on writing, documents, and structured reasoning.", description: "A possible assistant for organizing a supplied document or developing an editorial structure. Review outputs for missing context and errors. Upload documents only when their data handling is appropriate for your organization. This is a development example, not an integration claim.", url: "https://claude.ai/", category: "content", tag: "writing", featured: true },
      { slug: "demo-perplexity", name: "Perplexity", summary: "Discover starting sources for research, then investigate the evidence yourself.", description: "Use an answer-oriented search interface to discover sources for a question. Read the underlying material, compare publication dates, and separate quoted facts from the assistant's interpretation. Citations do not eliminate the need to verify a source.", url: "https://www.perplexity.ai/", category: "research", tag: "research", featured: false },
      { slug: "demo-notion", name: "Notion", summary: "Give notes, knowledge, and team handoffs a shared place to live.", description: "Organize reviewed notes and decisions in a shared workspace. Define ownership, access permissions, and a consistent structure before introducing automated imports. This sample discusses a possible role in a workflow, not a verified AI feature or integration.", url: "https://www.notion.so/", category: "productivity", tag: "team-work", featured: false },
      { slug: "demo-n8n", name: "n8n", summary: "Connect repeatable tasks with a workflow you can inspect and control.", description: "A workflow automation platform that can connect application steps. Begin with test inputs, explicit error paths, and a human review stage. Configure credentials in a secret store, and consider execution limits before running on a schedule.", url: "https://n8n.io/", category: "automation", tag: "no-code", featured: true },
      { slug: "demo-make", name: "Make", summary: "Map a multi-step process before turning repetitive work into an automation.", description: "Explore visual scenarios for data handoffs between applications. Verify connector availability, execution costs, and rate limits. Keep a manual approval step for external communications and commercial actions. No scenario is connected or running in this sample.", url: "https://www.make.com/", category: "automation", tag: "no-code", featured: false },
      { slug: "demo-github-copilot", name: "GitHub Copilot", summary: "Bring an AI assistant into a development process with tests and human review.", description: "Consider suggestions as untrusted contributions that still require code review, security checks, and project-specific tests. Do not supply credentials or restricted source to an unapproved configuration. This example makes no claim of measured productivity gains.", url: "https://github.com/features/copilot", category: "development", tag: "coding", featured: false },
      { slug: "demo-zapier", name: "Zapier", summary: "Explore event-driven handoffs between the tools your team already uses.", description: "Start with an event, define a small action, and test duplicate events and failure handling. Plan how to pause execution and avoid sending unintended messages. Connector availability and pricing should be checked directly with the provider.", url: "https://zapier.com/", category: "automation", tag: "no-code", featured: false },
    ];
    const ids: Record<string, string> = {};
    for (const item of tools) {
      const existing = await tx.tool.findUnique({ where: { slug: item.slug } });
      if (existing && !existing.isDemo) throw new Error("Catalog seed refuses to replace a non-demo record.");
      const record = await tx.tool.upsert({ where: { slug: item.slug }, update: {}, create: {
        slug: item.slug, name: item.name, summary: item.summary, description: item.description, websiteUrl: item.url,
        isDemo: true, featured: item.featured, categories: { connect: { id: categories[item.category]! } }, tags: { connect: { id: tags[item.tag]! } },
      } }); ids[item.slug] = record.id;
    }
    const workflows = [
      { slug: "demo-meeting-notes", title: "Turn meeting notes into clear next steps", category: "productivity", tag: "team-work", difficulty: "BEGINNER" as const, featured: true,
        problem: "Decisions and follow-up tasks get lost in long, unstructured meeting notes.",
        solution: "Use an assistant to propose a structured summary, then have a participant verify every decision and task before saving it to a shared workspace.",
        tools: ["demo-chatgpt", "demo-notion"],
        steps: ["Remove personal or confidential material that is not needed. Confirm that the assistant is approved for the remaining notes.", "Ask for a draft organized into decisions, open questions, and proposed actions. Require a source excerpt for each action.", "Have a meeting participant confirm owners and dates. Leave unknown details explicitly unresolved.", "Save the reviewed version in your workspace and share it through your normal approved process."],
        limitations: "Notes can be incomplete. An assistant may infer an agreement that never occurred. Do not automatically assign tasks or send follow-ups without participant review.", refs: ["https://help.openai.com/", "https://www.notion.so/help"] },
      { slug: "demo-research-brief", title: "Build a source-backed research brief", category: "research", tag: "research", difficulty: "INTERMEDIATE" as const, featured: true,
        problem: "Research can produce a pile of links without a clear view of the evidence or its limitations.",
        solution: "Separate source discovery from interpretation. Build an evidence table before drafting a brief with explicit uncertainty.",
        tools: ["demo-perplexity", "demo-claude"],
        steps: ["Define the decision the brief should support and list the questions it must answer.", "Discover potential sources, then open primary material and record author, date, claim, and supporting passage.", "Ask an assistant to summarize only the evidence you provide. Mark unsupported questions as unanswered.", "Check every citation against the original source and add a limitations section before using the brief."],
        limitations: "Search results can omit relevant evidence. Sources may be outdated, biased, or inaccessible. A generated citation is not proof that a claim is supported.", refs: ["https://www.perplexity.ai/", "https://www.anthropic.com/claude"] },
      { slug: "demo-content-outline", title: "Create a better first content outline", category: "content", tag: "writing", difficulty: "BEGINNER" as const, featured: true,
        problem: "An empty page makes it hard to organize a useful article around a specific audience and problem.",
        solution: "Develop alternative outlines from an original brief, compare their assumptions, and choose a structure before drafting.",
        tools: ["demo-claude", "demo-chatgpt"],
        steps: ["Write a short brief with audience, goal, evidence, and the questions a reader should be able to answer.", "Request two outlines with different structures. Ask each section to identify the evidence it needs.", "Remove unsupported claims and repeated sections. Add original examples from your own work.", "Choose an outline and submit it to editorial review before drafting or publishing."],
        limitations: "An outline is not an original researched article. Verify sources, avoid copying protected text, and review factual and commercial claims before publication.", refs: ["https://www.anthropic.com/claude", "https://help.openai.com/"] },
      { slug: "demo-lead-routing", title: "Route incoming leads for human review", category: "automation", tag: "no-code", difficulty: "INTERMEDIATE" as const, featured: false,
        problem: "Incoming requests need consistent classification without sending inappropriate automated replies.",
        solution: "Propose a classification and a destination queue, with a human approval step before any external response.",
        tools: ["demo-n8n", "demo-make"],
        steps: ["Create a test-only request form and define the minimum data needed for classification.", "Map allowed categories and validate incoming fields. Reject unknown or oversized inputs.", "Build a test workflow that stores a proposed category and reason, using an idempotency key for repeated events.", "Review the queued request manually. Keep message sending disabled until permissions, consent, and error handling are verified."],
        limitations: "Classification can be incorrect or biased. Incoming messages may contain malicious instructions. No provider is connected or lead-routing automation is active in this development example.", refs: ["https://docs.n8n.io/", "https://www.make.com/en/help"] },
      { slug: "demo-code-review", title: "Add an AI perspective to code review", category: "development", tag: "coding", difficulty: "INTERMEDIATE" as const, featured: false,
        problem: "A reviewer may benefit from another perspective on edge cases without delegating responsibility for a change.",
        solution: "Ask for bounded review suggestions, verify each one, and retain normal tests and human approval before merging.",
        tools: ["demo-github-copilot", "demo-chatgpt"],
        steps: ["Provide only the relevant diff and approved context. Remove secrets and sensitive customer data.", "Request potential correctness, security, and edge-case issues, with a concrete location and reasoning for each.", "Reproduce each finding with an appropriate test or inspection. Discard findings that are unsupported.", "Run the project checks and obtain normal human review. Never merge automatically because an assistant approves."],
        limitations: "AI review can miss vulnerabilities or invent issues. It does not replace testing, license checks, or a qualified security review.", refs: ["https://docs.github.com/en/copilot"] },
      { slug: "demo-knowledge-digest", title: "Organize a weekly knowledge digest", category: "research", tag: "team-work", difficulty: "ADVANCED" as const, featured: false,
        problem: "A team accumulates useful references but struggles to turn them into a concise, traceable briefing.",
        solution: "Collect approved sources, deduplicate entries, and prepare a draft digest with source links and an editorial approval queue.",
        tools: ["demo-zapier", "demo-notion", "demo-perplexity"],
        steps: ["Define approved sources, retention limits, ownership, and the audience for the briefing.", "Collect a small test batch with canonical URLs, timestamps, and a stable source identifier.", "Deduplicate entries and draft short summaries that point to the original source. Treat retrieved text as untrusted data.", "Review source accuracy, relevance, and permissions. Keep distribution disabled until recipients and sending authority are confirmed."],
        limitations: "Summaries can lose important qualifications. Collection and redistribution may require permission. This is a proposed process, not an executed scheduled task or newsletter campaign.", refs: ["https://help.zapier.com/", "https://www.notion.so/help"] },
    ];
    for (const item of workflows) {
      const existing = await tx.useCase.findUnique({ where: { slug: item.slug } });
      if (existing && !existing.isDemo) throw new Error("Catalog seed refuses to replace a non-demo workflow.");
      await tx.useCase.upsert({ where: { slug: item.slug }, update: {}, create: {
        slug: item.slug, title: item.title, problem: item.problem, solution: item.solution, limitations: item.limitations,
        difficulty: item.difficulty, featured: item.featured, isDemo: true,
        instructions: item.steps.map((text, index) => ({ step: index + 1, text })), references: item.refs.map((url) => ({ url, note: new URL(url).hostname })),
        tools: { connect: item.tools.map((slug) => ({ id: ids[slug]! })) }, categories: { connect: { id: categories[item.category]! } }, tags: { connect: { id: tags[item.tag]! } },
      } });
    }
    for (const item of [
      { slug: "demo-reading-research", title: "A useful AI answer starts with a better evidence trail", excerpt: "Separate finding information from deciding whether it deserves your trust. Start with a source-backed brief.", workflow: "demo-research-brief" },
      { slug: "demo-reading-content", title: "The outline is where clear thinking begins", excerpt: "Before asking for a draft, define the reader, the problem, and the evidence that belongs in the story.", workflow: "demo-content-outline" },
    ]) {
      const existing = await tx.article.findUnique({ where: { slug: item.slug } });
      if (existing && !existing.isDemo) throw new Error("Catalog seed refuses to replace a non-demo article.");
      const useCase = await tx.useCase.findUniqueOrThrow({ where: { slug: item.workflow } });
      await tx.article.upsert({ where: { slug: item.slug }, update: {}, create: { slug: item.slug, title: item.title, excerpt: item.excerpt, body: { blocks: [] }, isDemo: true, useCaseId: useCase.id } });
    }
    return { tools: tools.length, workflows: workflows.length };
  }, { timeout: 15000 });
}
