# ADR 0003: No State Band-Aids

Do not use import, retain-on-delete, or ignore-changes controls to hide state
drift. Those controls make future deploys harder to reason about.

If state is unrecoverable, rename the SST app to create a fresh state namespace,
deploy clean resources, restore data, and cut traffic over deliberately.
