# ADR 0001: SST Owns Cloudflare Resources

SST creates every D1 database, R2 bucket, KV namespace, Worker, queue, consumer,
and cron trigger from logical source configuration.

We do not commit account IDs, database IDs, queue IDs, or generated names. This
keeps the template portable across Cloudflare accounts and stages.
