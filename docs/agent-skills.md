# Agent Skills For This Template

This repository vendors a project-level agent skill pack in:

```sh
agent-skills/
```

Run the install script after cloning to copy those skills into a local agent
skills directory:

```sh
pnpm skills:install
```

By default this copies to `~/.agents/skills`. Override the destination with
`AGENT_SKILLS_DIR`:

```sh
AGENT_SKILLS_DIR="$HOME/.codex/skills" pnpm skills:install
```

Verify the vendored pack with:

```sh
pnpm verify:skills
```

## Recommended Skill Set

Use these skills when working on this Cloudflare full-stack template:

- `cloudflare`: Cloudflare platform guidance across Workers, D1, R2, KV,
  Queues, Durable Objects, and platform capabilities.
- `wrangler`: Wrangler CLI usage for local development, debugging, and
  Cloudflare resource operations.
- `workers-best-practices`: Worker code review, bindings, runtime constraints,
  and production Worker conventions.
- `web-perf`: Core Web Vitals and performance review for the React Worker SPA.
- `durable-objects`: Add this when introducing stateful coordination.
- `agents-sdk`: Add this when building AI agents on Workers.
- `turnstile-spin`: Add this when wiring Cloudflare Turnstile forms.
- `security-review`: Security review for API, Worker, and CI changes.
- `tdd`: Test-first feature work and regression fixes.
- `code-review`: Review changes against repo standards and request specs.
- `codebase-design`: Module boundary and interface design.
- `diagnosing-bugs`: Structured debugging for failing tests or runtime issues.
- `grill-me` / `grilling`: Stress-test PRDs, implementation plans, and
  architecture decisions before building.
- `to-spec`: Convert rough ideas into implementation-ready specs.
- `to-tickets`: Break a spec into small deliverable tickets.
- `request-refactor-plan`: Plan larger refactors before touching code.
- `git-guardrails-claude-code`: Add local hooks that block dangerous git
  commands in Claude Code environments when that agent is in use.
- `impeccable`: UI polish, interaction critique, copy clarity, and design
  tightening.
- `vercel-react-best-practices`: React performance and component guidance.
- `webapp-testing`: Playwright-driven testing for local web apps.

## Source Install Commands

The vendored skills were originally installed from these sources:

```sh
npx --yes skills add cloudflare/skills -g -y
npx --yes skills add mattpocock/skills -g -y
npx --yes skills add pbakaus/impeccable -g -y
npx --yes skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices -g -y
npx --yes skills add https://github.com/anthropics/skills --skill webapp-testing -g -y
npx --yes skills add https://github.com/getsentry/skills --skill security-review -g -y
```

For this template, prefer `pnpm skills:install` so teammates get the exact
skill versions committed to the repo. Use the source commands only when
refreshing the vendored pack.

## Agent Compatibility

These files use the common `SKILL.md` convention and are plain Markdown plus
optional supporting files. Agents that understand that convention can read them
directly from `agent-skills/`. Agents that expect a global skills directory can
use `pnpm skills:install` to copy the pack into their configured location.

Codex-compatible defaults use `~/.agents/skills`, but the repo itself does not
require Codex. Set `AGENT_SKILLS_DIR` for another agent layout.

## When To Use Which Skill

- Planning a new capability: `grill-me`, then `to-spec`, then `to-tickets`.
- Adding Cloudflare infrastructure: `cloudflare`, `workers-best-practices`,
  and `wrangler`.
- Adding a Worker route or queue consumer: `tdd`, `workers-best-practices`,
  and `security-review`.
- Adding stateful behavior: `durable-objects` or `agents-sdk`, depending on
  the product shape.
- Debugging failing CI or runtime behavior: `diagnosing-bugs`.
- Reviewing a branch before merge: `code-review` and `security-review`.
- Improving the SPA UI: `impeccable`, `vercel-react-best-practices`, and
  `webapp-testing`.
- Checking frontend behavior locally: `webapp-testing`; add `web-perf` for
  performance work.

## Safety Notes

Skills are advisory execution guides. Review instructions before following
high-impact or security-sensitive steps, especially for skills that call CLIs,
touch Cloudflare accounts, edit auth flows, or change git behavior.

Keep the base template vendor-neutral. Do not add auth, payments, analytics,
or UI kit skills to the default recommendation list unless the template itself
adopts those providers.
