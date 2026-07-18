import { useEffect, useState } from "react";
import { getHealth } from "./api";
import { LegalPage } from "./routes/LegalPage";

type HealthState = "loading" | "ok" | "degraded" | "error";

export function App() {
  const [health, setHealth] = useState<HealthState>("loading");
  const path = window.location.pathname;

  useEffect(() => {
    if (path !== "/") {
      return;
    }

    getHealth()
      .then((result) => setHealth(result.status))
      .catch(() => setHealth("error"));
  }, [path]);

  if (path === "/privacy") {
    return <LegalPage title="Privacy" />;
  }

  if (path === "/terms") {
    return <LegalPage title="Terms" />;
  }

  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Acme Cloudflare Stack</p>
        <h1>Full-stack Worker template</h1>
        <p className="summary">
          React, Hono, D1, R2, Queues, Cron, Drizzle, SST, and CI guardrails in
          one reusable starting point.
        </p>
        <dl className="status-grid">
          <div>
            <dt>API</dt>
            <dd>{health}</dd>
          </div>
          <div>
            <dt>Stage</dt>
            <dd>{import.meta.env.MODE}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
