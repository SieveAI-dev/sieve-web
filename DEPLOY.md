# Deploying sieve-web to GitHub Pages

This site is plain static HTML — GitHub Pages serves the repository root
directly, no build step. Deployment is push-to-publish plus a one-time custom
domain + DNS setup.

> This file contains **no tokens or secrets** — only steps. Authenticate `git`
> / `gh` with your own credentials locally.

## 1. Create the repository

Create **`SieveAI-dev/sieve-web`** on GitHub (public).

## 2. Push the site

From this directory:

```bash
git init
git add .
git commit -m "chore: initial site"
git branch -M main
git remote add origin git@github.com:SieveAI-dev/sieve-web.git
git push -u origin main
```

(Use the HTTPS remote `https://github.com/SieveAI-dev/sieve-web.git` instead if
you authenticate over HTTPS.)

## 3. Enable GitHub Pages

In the repo: **Settings → Pages**.

- **Source:** "Deploy from a branch"
- **Branch:** `main`
- **Folder:** `/ (root)`
- Save.

The first build publishes at `https://sieveai-dev.github.io/sieve-web/` within a
minute or two.

## 4. Set the custom domain

Still under **Settings → Pages → Custom domain**, enter:

```
sieveai.dev
```

Save. The `CNAME` file is already committed in the repo root (single line
`sieveai.dev`), so GitHub keeps the domain bound across deploys — don't delete
it.

## 5. Configure DNS

`sieveai.dev` is an **apex (root) domain**. Pick one of the two supported
approaches.

### Option A — Cloudflare CNAME flattening (recommended)

If the domain's DNS is on Cloudflare, you can point the apex at GitHub via a
flattened CNAME (Cloudflare resolves it to A/AAAA records automatically):

| Type  | Name             | Target                  | Proxy        |
|-------|------------------|-------------------------|--------------|
| CNAME | `sieveai.dev` (`@`) | `sieveai-dev.github.io` | DNS only (grey cloud) |

- Cloudflare's "CNAME flattening at root" handles the apex automatically.
- Set proxy status to **DNS only** during initial verification so GitHub can
  validate the domain and issue the TLS certificate; you may re-enable the
  proxy afterward if desired.

Optionally also add the `www` subdomain:

| Type  | Name  | Target                  |
|-------|-------|-------------------------|
| CNAME | `www` | `sieveai-dev.github.io` |

### Option B — GitHub Pages apex A / AAAA records

If your DNS provider doesn't support CNAME flattening at the root, create these
records for the apex (`@`). These are GitHub Pages' published, stable IPs:

IPv4 (A records, all four):

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

IPv6 (AAAA records, all four):

```
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

Optionally add a `www` CNAME pointing at `sieveai-dev.github.io` and let GitHub
redirect it to the apex.

## 6. Wait for DNS + verify

- DNS propagation can take minutes to a few hours.
- Back in **Settings → Pages**, GitHub shows a green check once it verifies the
  domain and provisions the Let's Encrypt certificate.

## 7. Enforce HTTPS

Once the certificate is issued, tick **Settings → Pages → Enforce HTTPS**. All
traffic is then redirected to `https://sieveai.dev`.

## Routine updates

After the one-time setup, publishing is just:

```bash
git add .
git commit -m "..."
git push
```

GitHub Pages rebuilds and redeploys automatically on every push to `main`.

## Troubleshooting

- **404 on assets:** ensure links use root-absolute paths (`/assets/...`) — they
  resolve at the apex domain root.
- **`CNAME` keeps reverting / domain unbinds:** confirm the `CNAME` file (single
  line, `sieveai.dev`, no scheme, no trailing slash) is committed and present
  after each deploy.
- **HTTPS checkbox greyed out:** the certificate isn't issued yet — DNS must
  resolve to GitHub first; wait and refresh the Pages settings.
- **Custom 404:** `404.html` at the repo root is served automatically by GitHub
  Pages for unknown paths.
