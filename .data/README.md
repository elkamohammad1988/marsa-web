# `.data/` — local submission storage

**This directory holds personal data. It must never leave the machine it is on.**

Everything here is written by `FileSubmissionStore` and
`FileDemoAnalyticsStore` — the zero-configuration fallback that lets
`npm run dev` work with no credentials at all. The files are newline-delimited
JSON, one record per line:

| File | Holds |
|---|---|
| `lead.jsonl` | Account applications — name, email, country, account type |
| `contact.jsonl` | Contact form messages — name, email, topic, free text |
| `subscribe.jsonl` | Newsletter sign-ups — email |
| `demo-events.jsonl` | Demo funnel steps — a random per-visit id, a step name, a timestamp. No person in it. |

The first three are personal data under the GDPR. The fourth is not: the
session id is minted in the browser per visit and stored nowhere, which is why
the demo funnel needs no cookie banner.

## Why this file is the only tracked thing in here

`.gitignore` ignores `.data/*` and re-includes exactly this README. The rule is
written that way round on purpose — an ignored *directory* is one git never
descends into, so a negation inside it would never match, and the warning would
have had to live somewhere nobody about to zip up the folder would read it.

Nothing else in here is ever committed. If `git status --ignored` shows a
`.jsonl` file as tracked, that is an incident: the file contains real addresses
and the repository is public.

```
git status --ignored --short .data/
```

should show the `.jsonl` files as `!!` (ignored) and nothing as `A`, `M` or
`??`.

## This is not a production store

`createStore()` refuses to build a file store when `NODE_ENV=production`, and
`/api/health` reports storage as unconfigured rather than pretending. On a
serverless host these files would land on an ephemeral container that `/admin`
cannot read and a redeploy erases — which is how leads went missing before
audit B1. Production means `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## Deleting things

To honour an erasure request against local development data, delete the record
through `/admin` — the same path production uses, so it is the one that gets
exercised. Removing the whole directory is also safe; it is recreated on the
next write.

Retention for the durable store is set out in [`docs/DATA.md`](../docs/DATA.md).
