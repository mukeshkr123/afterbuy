import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

type ApplyMode = "print" | "apply";

const environment = process.argv[2] ?? "production";
const applyMode: ApplyMode = process.argv.includes("--apply")
  ? "apply"
  : "print";
const regenerate = process.argv.includes("--regenerate");

const repoRoot = process.cwd();
const mobileDir = join(repoRoot, "apps", "mobile");
const releaseTmpDir = join(repoRoot, "tmp", "mobile-release");
const androidKeystorePath = join(releaseTmpDir, "afterbuy-release.keystore");
const androidMetaPath = join(releaseTmpDir, "android-release.json");

const clerkPublishableKey =
  process.env.MOBILE_CLERK_PUBLISHABLE_KEY?.trim() || "";
const supportEmail =
  process.env.MOBILE_SUPPORT_EMAIL?.trim() || "support@afterbuy.app";
const iosTeamId = process.env.IOS_TEAM_ID?.trim() || "";
const iosProvisioningProfileName =
  process.env.IOS_PROVISIONING_PROFILE_NAME?.trim() || "";
const iosExportMethod = process.env.IOS_EXPORT_METHOD?.trim() || "app-store";
const iosDistCertPath = process.env.IOS_DIST_CERT_PATH?.trim() || "";
const iosDistCertPassword = process.env.IOS_DIST_CERT_PASSWORD?.trim() || "";
const iosProvisioningProfilePath =
  process.env.IOS_PROVISIONING_PROFILE_PATH?.trim() || "";

function parseEnvFile(path: string) {
  if (!existsSync(path)) return new Map<string, string>();
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const entries = new Map<string, string>();
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    entries.set(line.slice(0, separator), line.slice(separator + 1));
  }
  return entries;
}

function run(
  command: string,
  args: string[],
  options?: { input?: string; allowFailure?: boolean }
) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    input: options?.input,
  });

  if (result.status !== 0 && !options?.allowFailure) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(" ")}`,
        result.stdout.trim(),
        result.stderr.trim(),
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return result;
}

function randomSecret(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

function readProductionApiUrl() {
  const easJson = JSON.parse(
    readFileSync(join(mobileDir, "eas.json"), "utf8")
  ) as {
    build?: { production?: { env?: { EXPO_PUBLIC_API_BASE_URL?: string } } };
  };
  return (
    easJson.build?.production?.env?.EXPO_PUBLIC_API_BASE_URL?.trim() ||
    "https://api.afterbuy.app"
  );
}

function ensureAndroidReleaseMaterial() {
  mkdirSync(releaseTmpDir, { recursive: true });

  if (
    existsSync(androidMetaPath) &&
    existsSync(androidKeystorePath) &&
    !regenerate
  ) {
    return JSON.parse(readFileSync(androidMetaPath, "utf8")) as {
      alias: string;
      storePassword: string;
      keyPassword: string;
    };
  }

  const alias = `afterbuy-${randomSecret(8)}`;
  const storePassword = randomSecret();
  const keyPassword = randomSecret();
  const dname = [
    "CN=AfterBuy Release",
    "OU=Mobile",
    "O=AfterBuy",
    "L=Bengaluru",
    "ST=Karnataka",
    "C=IN",
  ].join(", ");

  run("keytool", [
    "-genkeypair",
    "-v",
    "-storetype",
    "JKS",
    "-keystore",
    androidKeystorePath,
    "-storepass",
    storePassword,
    "-keypass",
    keyPassword,
    "-alias",
    alias,
    "-keyalg",
    "RSA",
    "-keysize",
    "4096",
    "-validity",
    "10000",
    "-dname",
    dname,
  ]);

  const meta = { alias, storePassword, keyPassword };
  writeFileSync(androidMetaPath, `${JSON.stringify(meta, null, 2)}\n`);
  return meta;
}

function upsertMobileEnv(apiUrl: string) {
  const envPath = join(mobileDir, ".env");
  const currentEnv = parseEnvFile(envPath);
  const localClerkKey =
    clerkPublishableKey ||
    currentEnv.get("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY") ||
    "pk_live_replace_me";
  const lines = [
    `EXPO_PUBLIC_API_BASE_URL=${apiUrl}`,
    `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=${localClerkKey}`,
    "EXPO_PUBLIC_PUSH_ENABLED=false",
    `EXPO_PUBLIC_SUPPORT_EMAIL=${supportEmail}`,
  ];

  const passthrough = ["EXPO_PUBLIC_USE_MOCK_AUTH"]
    .map((key) => {
      const value = currentEnv.get(key);
      return value ? `${key}=${value}` : null;
    })
    .filter((value): value is string => Boolean(value));

  writeFileSync(envPath, `${[...lines, ...passthrough].join("\n")}\n`);
}

function base64File(path: string) {
  return readFileSync(path).toString("base64");
}

function ghSetSecret(name: string, value: string) {
  run("gh", ["secret", "set", name, "--env", environment, "--body", value]);
}

function ghSetVariable(name: string, value: string) {
  run("gh", ["variable", "set", name, "--env", environment, "--body", value]);
}

const apiUrl = readProductionApiUrl();
const android = ensureAndroidReleaseMaterial();
const androidKeystoreBase64 = base64File(androidKeystorePath);

upsertMobileEnv(apiUrl);

const knownVariables = new Map<string, string>([
  ["EXPO_PUBLIC_API_BASE_URL", apiUrl],
  ["EXPO_PUBLIC_PUSH_ENABLED", "false"],
  ["EXPO_PUBLIC_SUPPORT_EMAIL", supportEmail],
]);

if (clerkPublishableKey) {
  knownVariables.set("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY", clerkPublishableKey);
}

if (iosTeamId) {
  knownVariables.set("IOS_TEAM_ID", iosTeamId);
}

if (iosProvisioningProfileName) {
  knownVariables.set(
    "IOS_PROVISIONING_PROFILE_NAME",
    iosProvisioningProfileName
  );
  knownVariables.set("IOS_EXPORT_METHOD", iosExportMethod);
}

const knownSecrets = new Map<string, string>([
  ["ANDROID_KEYSTORE_BASE64", androidKeystoreBase64],
  ["ANDROID_KEYSTORE_PASSWORD", android.storePassword],
  ["ANDROID_KEY_ALIAS", android.alias],
  ["ANDROID_KEY_PASSWORD", android.keyPassword],
]);

if (iosDistCertPath && iosDistCertPassword && iosProvisioningProfilePath) {
  knownSecrets.set("IOS_DIST_CERT_BASE64", base64File(iosDistCertPath));
  knownSecrets.set("IOS_DIST_CERT_PASSWORD", iosDistCertPassword);
  knownSecrets.set(
    "IOS_PROVISIONING_PROFILE_BASE64",
    base64File(iosProvisioningProfilePath)
  );
}

if (applyMode === "apply") {
  for (const [name, value] of knownVariables) {
    ghSetVariable(name, value);
  }
  for (const [name, value] of knownSecrets) {
    ghSetSecret(name, value);
  }
}

const missingItems: string[] = [];
if (!clerkPublishableKey) {
  missingItems.push("MOBILE_CLERK_PUBLISHABLE_KEY");
}
if (!iosTeamId) {
  missingItems.push("IOS_TEAM_ID");
}
if (!iosProvisioningProfileName) {
  missingItems.push("IOS_PROVISIONING_PROFILE_NAME");
}
if (!iosDistCertPath) {
  missingItems.push("IOS_DIST_CERT_PATH");
}
if (!iosDistCertPassword) {
  missingItems.push("IOS_DIST_CERT_PASSWORD");
}
if (!iosProvisioningProfilePath) {
  missingItems.push("IOS_PROVISIONING_PROFILE_PATH");
}

console.log(`# Mobile release bootstrap (${applyMode}) for ${environment}`);
console.log(`Android keystore: ${androidKeystorePath}`);
console.log(`Android metadata: ${androidMetaPath}`);
console.log("Updated apps/mobile/.env with production runtime defaults.");
console.log("");
console.log("Configured GitHub variables:");
for (const [name, value] of knownVariables) {
  const rendered =
    name === "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY" && value
      ? `${value.slice(0, 12)}...`
      : value;
  console.log(`- ${name}=${rendered}`);
}
console.log("");
console.log("Configured GitHub secrets:");
for (const name of knownSecrets.keys()) {
  console.log(`- ${name}`);
}
if (missingItems.length > 0) {
  console.log("");
  console.log("Missing inputs before iOS + live auth can be fully configured:");
  for (const item of missingItems) {
    console.log(`- ${item}`);
  }
}
