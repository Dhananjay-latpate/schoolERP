# Environments & branch workflow — frontend

The School ERP frontend (`schoolERP`) deploys to **Vercel**; the backend
(`server`) deploys to **Railway**. This doc covers the frontend side.

## Branches

```
claude/<feature>  ──PR──▶  develop  ──PR──▶  main
```

| Branch | Purpose | Direct push? |
|---|---|---|
| `claude/<feature>` | one task / agent run | yes (the agent) |
| `develop` | integration + staging | no — PR only |
| `main` | production | no — PR only |

Always branch new work from `develop`.

## Vercel deployments

Vercel watches the GitHub repo directly — no deploy workflow in `.github/`:

| Branch | Vercel deployment | API it talks to |
|---|---|---|
| `main` | **Production** | production Railway backend |
| `develop` | staging deployment | staging Railway backend |
| `claude/*` | per-branch **preview** | staging Railway backend |

`NEXT_PUBLIC_API_BASE_URL` (read in `src/lib/principalApi.ts` / `authApi.ts`,
default `http://localhost:3001`) is set per-environment in **Vercel → Settings →
Environment Variables**:

- **Production** scope → production Railway URL
- **Preview** scope → staging Railway URL (covers `develop` and all feature previews)

Feature-branch previews get unique `*.vercel.app` URLs. The staging backend runs
with `APP_ENV=staging`, so it admits any `*.vercel.app` origin via CORS — previews
work without per-branch backend config.

## CI & E2E

- **`ci.yml`** — typecheck, lint, build. Runs on PRs to `main`/`develop` and on pushes to `main`/`develop`/`claude/**`.
- **`e2e.yml`** — Playwright against the live **staging** environment. Runs on PRs to `main`, nightly, and on manual dispatch. It reads the staging URL from the repo variable `STAGING_BASE_URL`; if that variable is unset the job is skipped (so it never blocks a PR).

`playwright.config.ts` only starts a local Next.js server when `E2E_BASE_URL`
is localhost; against a deployed URL it drives the remote stack directly.

## Steady-state workflow

1. Branch `claude/<feature>` from `develop`; code; push → CI runs, Vercel builds a preview.
2. PR `claude/<feature>` → `develop`; CI green → merge → the `develop` Vercel deployment updates.
3. Verify on staging.
4. PR `develop` → `main`; CI + E2E pass → merge → production deploys.

## One-time bootstrap (frontend)

1. Import the `schoolERP` repo into Vercel; set the **Production Branch** to `main`.
2. Set `NEXT_PUBLIC_API_BASE_URL` for the Production and Preview scopes (see above).
3. Set the GitHub repo variable `STAGING_BASE_URL` (Settings → Secrets and variables → Actions → Variables) to the staging frontend URL — the `develop` Vercel deployment.
4. Branch protection (Settings → Branches):
   - `main`: require a PR + the CI check (+ the E2E check once `STAGING_BASE_URL` is set), no direct pushes.
   - `develop`: require a PR + the CI check, no direct pushes.
