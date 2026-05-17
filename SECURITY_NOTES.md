# Security hardening notes

This is a static GitHub Pages site. The current hardening is designed for a static photography portfolio.

Implemented:

- Added a meta Content Security Policy that blocks remote scripts, frames, object embeds, media loads, and network requests.
- Added strict referrer policy.
- Added `robots.txt`, `sitemap.xml`, `security.txt`, `.well-known/security.txt`, `404.html`, and `CNAME`.
- Escaped gallery HTML output before writing it through `innerHTML`.
- Restricted gallery image paths to local `assets/*` image files.
- Added lazy image decoding/referrer controls.

Recommended GitHub Pages settings:

- Enable `Enforce HTTPS`.
- Keep the repository private unless the source is meant to be public.
- Enable branch protection for the publishing branch.
- Require pull request review before publishing if more people can edit the repository.

Limitations:

- GitHub Pages cannot set custom HTTP security headers such as `Strict-Transport-Security`, `X-Frame-Options`, or full `Permissions-Policy`.
- A meta CSP is useful but weaker than real HTTP headers. For stronger headers, put the site behind Cloudflare Pages/Workers, Netlify, Vercel, or another host that supports custom headers.
