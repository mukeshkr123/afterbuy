# ADR 0004: D1 Restore Strategy

D1 exports can interleave schema and data. Restores reorder schema first and
then apply original INSERT statements in foreign-key dependency order.

The restore path does not reserialize rows through local SQLite dumps and strips
explicit transaction control because D1 remote execute rejects it.
