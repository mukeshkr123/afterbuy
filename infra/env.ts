export const COMPATIBILITY_DATE = "2026-07-18";

export function resourceName(base: string): string {
  return `${$app.name}-${$app.stage}-${base}`;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required deploy-time environment variable: ${name}`
    );
  }
  return value;
}

export function optionalEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}
