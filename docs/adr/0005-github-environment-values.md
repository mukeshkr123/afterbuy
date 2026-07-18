# ADR 0005: GitHub Environment Values

Deploy jobs use `environment: production`, so required vars and secrets must be
set on the GitHub Environment.

Repo-level values with the same names are ignored by those jobs, which can look
like a CI misconfiguration unless documented loudly.
