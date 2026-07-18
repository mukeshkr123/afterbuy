interface LegalPageProps {
  title: "Privacy" | "Terms";
}

export function LegalPage({ title }: LegalPageProps) {
  return (
    <main className="shell">
      <article className="panel legal">
        <p className="eyebrow">Acme</p>
        <h1>{title}</h1>
        <p>
          This placeholder page exists so OAuth consent screens and production
          reviews have stable URLs. Replace it before collecting user data.
        </p>
        <a href="/">Back home</a>
      </article>
    </main>
  );
}
