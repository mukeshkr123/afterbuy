const required = ["CLOUDFLARE_ACCOUNT_ID"];

const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  throw new Error(`Missing required config: ${missing.join(", ")}`);
}

console.log("Config validation passed");
