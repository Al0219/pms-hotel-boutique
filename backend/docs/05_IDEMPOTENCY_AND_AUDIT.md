# 05 — Idempotency and Audit

Idempotency:
same key + same payload -> original result.
same key + different payload -> conflict.

Audit:
actor, action, entity, before/after cuando aplica, reason, time, correlation.

Retry no duplica side effects.
