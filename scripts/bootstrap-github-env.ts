const environment = process.argv[2] ?? "production";

const secrets = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_D1_DATABASE_ID",
];

const variables = ["PRODUCTION_D1_DB_NAME", "API_SMOKE_URL"];

console.log(`# GitHub Environment bootstrap for ${environment}`);
console.log("# Run these commands and provide values interactively.");

for (const secret of secrets) {
  console.log(`gh secret set ${secret} --env ${environment}`);
}

for (const variable of variables) {
  console.log(`gh variable set ${variable} --env ${environment}`);
}
