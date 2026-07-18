import { resourceName } from "./env";

export function createStorage() {
  const databaseName = resourceName("d1");
  const database = new sst.cloudflare.D1("Database", {
    transform: {
      database(args) {
        args.name = databaseName;
      },
    },
  });

  const bucket = new sst.cloudflare.Bucket("StorageBucket", {
    transform: {
      bucket(args) {
        args.name = resourceName("storage");
      },
    },
  });

  const kv = new sst.cloudflare.Kv("AppKv", {
    transform: {
      namespace(args) {
        args.title = resourceName("kv");
      },
    },
  });

  return {
    database,
    databaseName,
    bucket,
    kv,
  };
}

export type StorageResources = ReturnType<typeof createStorage>;
