const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
// Walk up to find the workspace root (where pnpm-workspace.yaml lives).
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Metro defaults to watching only the project root; expand to the workspace
// so changes to @acme/shared / @acme/db trigger reload.
config.watchFolders = [workspaceRoot];

// pnpm's symlinked node_modules can confuse Metro. The default resolver
// already follows symlinks, but listing both roots makes resolution explicit.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// The repo's tsconfig uses path aliases (@acme/* → ./packages/*/src/index.ts).
// Metro can't read those, so mirror them here pointing at the built dist.
config.resolver.alias = {
  "@acme/shared": path.resolve(workspaceRoot, "packages/shared/dist/index.js"),
  "@acme/db": path.resolve(workspaceRoot, "packages/db/dist/index.js"),
};

module.exports = config;
