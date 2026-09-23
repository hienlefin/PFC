# CM-708 — Production config / secrets checklist

See also `apps/club/DEPLOY.md` and `.env.example`.

## Required secrets

| Variable | Purpose | Set in staging | Set in prod | Rotated |
|----------|---------|:--------------:|:-----------:|:-------:|
| `CLUB_SESSION_SECRET` | HMAC session cookie | ☐ | ☐ | ☐ |
| `STORAGE_SIGNING_SECRET` | Doc download tokens | ☐ | ☐ | ☐ |
| `TURSO_DATABASE_URL` | LibSQL (prod) | ☐ | ☐ | — |
| `TURSO_AUTH_TOKEN` | LibSQL auth | ☐ | ☐ | ☐ |

## Optional flags

| Variable | Default | Notes |
|----------|---------|-------|
| `CLUB_FLAG_JOBS` | on | `0` disables background jobs |
| `CLUB_FLAG_NOTIFY` | on | `0` disables in-app notify writes |
| `CLUB_FLAG_RATE_LIMIT` | on | `0` disables 429 gates |
| `CLUB_FLAG_SIGNED_DOWNLOAD` | on | `0` omits tokens from list (harder UX) |
| `CLUB_DB_PATH` | `.data/club.sqlite` | Local only |

## Review gates

- [ ] No secrets in git (`git log -p` spot-check `.env*`)
- [ ] Vercel Root Directory = `PFC-Management/apps/club`
- [ ] Demo passwords changed before real members
- [ ] Ready endpoint monitored
- [ ] CODEOWNERS aware of `apps/club` + `docs/adr`

**Reviewer:** ________ **Date:** ________
