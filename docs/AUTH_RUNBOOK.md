# Auth Production Hardening Runbook

Operational runbook for the Better Auth setup in `src/modules/auth/`. Read this before going to production or during an incident.

## Module layout

| File                               | Responsibility                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `src/modules/auth/config.ts`       | `createAuth()` Better Auth configuration, OTP sender injection, database hooks |
| `src/modules/auth/audit.ts`        | `recordAuthAuditEvent()` and the `AUTH_AUDIT_EVENTS` enum                      |
| `src/modules/auth/openapi-docs.ts` | Endpoint documentation: allowlist, per-path summaries, OpenAPI projection      |
| `src/modules/mailer/`              | Actual OTP email delivery (Resend + React Email)                               |
| `src/plugins/otp-rate-limit.ts`    | Redis-backed per-email/per-IP OTP buckets and resend cooldown                  |
| `src/plugins/rate-limit.ts`        | Elysia-level global/auth limits, proxy-aware client key                        |

`OtpSender` is injectable: tests replace it with `createOtpCapture()`, and a future change (SNS, another provider) only touches `defaultOtpSender`.

## Monitoring

### Audit log events

`auth_audit_logs` records: `auth.email.verified`, `auth.otp.requested`, `auth.otp.delivery_failed`, `auth.password.reset`, `auth.session.created`, `auth.session.revoked`.

Alert on:

1. **Delivery failures** — a spike of `auth.otp.delivery_failed` means Resend is rejecting emails (domain not verified, balance issue). Every failed OTP is also thrown back to Better Auth, so users see a hard error.
   ```sql
   SELECT COUNT(*) FROM auth_audit_logs
   WHERE event = 'auth.otp.delivery_failed'
     AND createdAt > NOW() - INTERVAL 1 HOUR;
   ```
   Suggested alert: > 5 in one hour.
2. **Audit write failures** — `recordAuthAuditEvent` propagates DB errors. If MySQL is degraded, `logger.error("request failed")` lines in the app log show the insert failure. Ship logs to the aggregator and alert on `event=="request failed" AND err.code~"ER_.*"`.
3. **Sustained OTP pressure** — a high volume of `auth.otp.requested` from one IP address hints at enumeration/bombing attempts:
   ```sql
   SELECT ipAddress, COUNT(*) c FROM auth_audit_logs
   WHERE event = 'auth.otp.requested' AND createdAt > NOW() - INTERVAL 24 HOUR
   GROUP BY ipAddress ORDER BY c DESC LIMIT 10;
   ```

### Deliberately not stored

Audit rows never contain the OTP value or new password (the e2e suite asserts this: `should audit password reset without storing the OTP or password`). Keep it that way when adding metadata.

## Secret rotation (`BETTER_AUTH_SECRET`)

The secret signs sessions and OTP-related cryptography. Rotation invalidates sessions tied to the old secret.

1. Generate a new 32+ char random secret.
2. Set it in the deployment environment, **keeping the old secret temporarily** if the provider version supports multiple secrets for graceful re-validation; otherwise treat step 3 as an immediate global log-out.
3. Restart the app container (`bun run docker:dev`, or the production equivalent). Redis-backed sessions remain, but cookie signature validation fails for sessions created under the old secret → users simply sign in again.
4. Revoke leftover sessions so audit shows a clean sweep:
   ```sql
   DELETE FROM sessions;
   -- and clear the Redis session store if Keep sessions is not desired:
   -- redis-cli --scan --pattern 'ecommerce:auth:session:*' | xargs redis-cli del
   ```
5. Notify users of the forced re-login. Do not rotate casually: with `storeSessionInDatabase: true`, old session rows survive in MySQL until expiry.

## Redis fail-open vs fail-closed (decided: fail-open)

Current behavior:

- **OTP limiter (`src/plugins/otp-rate-limit.ts`)** is **fail-open**: if `redis` is unreachable, `!redis` (no URL configured) or Redis errors return the request unchanged after logging `otp rate limit check failed`. Rationale: OTP endpoints are anonymous PRNG-heavy flows where losing the ability to sign in entirely (fail-closed) turns one Redis hiccup into a full authentication outage. Email OTP attempts are also individually capped by Better Auth's `allowedAttempts` and its own rate limiter (`customRules`), so a Redis outage degrades protection without removing it.
- **Better Auth `secondaryStorage`** also falls back when Redis is absent (`redis ? redisStorage(...) : undefined`), but it does _not_ fall back when Redis is configured and then dies at runtime — expect spikes in MySQL session lookups and latency while Redis is down.

If requirements change to fail-closed (e.g., money-moving account recovery flows), switch `checkOtpRateLimit` to return `limitedResponse()` in the catch branch and set a new env flag so the decision is explicit and reviewable.

## Reverse proxy: `x-forwarded-for` testing

Both Better Auth (`advanced.ipAddress.ipAddressHeaders`) and the rate limit plugins trust `x-forwarded-for` (first hop) then `x-real-ip`. Verified by:

- `test/modules/auth/http-smoke.test.ts` — `should rate limit OTP sign-in per proxy IP`: same spoofed `x-forwarded-for` IP exhausts its budget, a fresh proxy IP gets a fresh budget; `...x-real-ip...` proves the fallback header is honored.
- `test/modules/auth/auth-e2e.test.ts` — `should record the reverse proxy IP on session creation`: audit rows for `auth.session.created` carry the `192.0.2.*` spoofed proxy IP.
- `src/plugins/rate-limit.ts` — `trustedProxyKeyGenerator` keys limits off proxy headers, and a missing/direct connection falls back to the real socket IP with **no console warning** in `app.handle()`-style contexts.

When deploying behind Nginx/Cloudflare/LB:

1. Only set `x-forwarded-for` **at the proxy**; strip client-provided values (`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`).
2. Smoke test after deploy: `curl -H "x-forwarded-for: 203.0.113.9" .../api/auth/sign-in/email-otp` six times, expect 429 from the 4th (enumeration-protected path), then a different IP should be non-429.
3. Confirm `auth_audit_logs.ipAddress` shows the client IP, not the LB IP.

## Local verification checklist

```bash
bun test                              # unit suite (52 tests)
bun run docker:dev                    # app + mysql + redis, health on :3000
bun run docker:migrate && bun run docker:seed
bun run test:smoke:auth               # real HTTP suite (AUTH_HTTP_E2E=1)
bun run test:e2e:auth                 # full auth flow (AUTH_E2E=1)
```
