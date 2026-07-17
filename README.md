# Schema & FAQ Generator — schema.seoryon.com

A free, **100% client-side** JSON-LD structured-data generator. Pick a schema type,
fill a simple form, and get valid, ready-to-paste JSON-LD. A sibling of
`score` / `roi` / `inspect` / `cite.seoryon.com` — same brand system, same static
deploy pattern.

## What it does

- **Type picker → form → live JSON-LD.** 10 core schema types (FAQ is the hero):
  `FAQPage`, `Article`/`BlogPosting`/`NewsArticle`, `Organization`, `LocalBusiness`,
  `Product`, `HowTo`, `BreadcrumbList`, `Person`, `WebSite` (Sitelinks SearchBox),
  `Event`.
- **Live output**, updating as you type. **Copy** the ready-to-paste
  `<script type="application/ld+json">…</script>` block or **download** the `.json`.
  Toggle between the script tag and raw JSON.
- **Light validation**: required fields are marked and missing ones are flagged; the
  output is always valid JSON.
- **XSS-safe**: user values are escaped so a value like `</script>`, quotes, or `<>`
  can never break the JSON-LD or inject markup. `<`, `>`, `&`, U+2028/U+2029 become
  `\uXXXX` escapes — still valid JSON.
- **i18n**: EN / DE / FR, natively localized. All UI chrome is translated; the JSON-LD
  field *keys* stay English (schema.org spec). User input values are untouched.

## Honesty

No "rich snippets in Google" promise anywhere — Google narrowed FAQ rich results to
government & health sites in 2024. The value is framed on the two things that are
actually true: (1) AI citation / GEO (structured data helps AI engines extract + cite
content, FAQ especially), and (2) clean, valid structured data. Field templates follow
schema.org type definitions and Google's Rich Results required/recommended fields.

## Privacy

Runs entirely in the browser. No backend, no API, no key, no network request for
generation. Nothing you type is uploaded, stored, or transmitted. The only persisted
state is your language + last-used type (localStorage).

## Provenance

The valuable, stack-agnostic part — *which fields each type needs and how to assemble
valid JSON-LD* — was reimplemented from scratch against schema.org and Google's Rich
Results docs. The originally-suggested reference repo (`mustafapiplodi/schema-generator`)
ships **no LICENSE file and no `license` field** (so not confirmed MIT) and is a heavy
React/Radix/Tailwind app; no code or brand from it was copied. This tool is vanilla
HTML/CSS/JS to match the static siblings.

## Structure

```
web/
  index.html      # single H1, hero, generator, why/how, upsell, FAQ, footer
  style.css       # brand system v4 (shared with score/roi/cite)
  app.js          # data-driven type/field templates, builder, i18n, copy/download
  schemahero.png  # hero image (drop in; layout is fine if briefly missing)
  logo.png, favicon*, apple-touch-icon.png, seoryon-mark.svg
  robots.txt, sitemap.xml
vercel.json       # static build + security headers (CSP etc.)
```

## Deploy

Static site on Vercel (org `amaury-8922s-projects` / `team_Jad7fcUDMMVfd3mSX6giu7ps`),
alongside roi/score/inspect/cite.

```
vercel --prod
```

Then point `schema.seoryon.com` at Vercel: **CNAME `schema` → `cname.vercel-dns.com`**
(DNS-only).
