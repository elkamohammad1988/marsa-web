# docs/

The working record. None of it is needed to run the project — start from the
[README](../README.md) for that, or [CASE-STUDY.md](../CASE-STUDY.md) for the
short version of what was built and why.

These three moved out of the repository root because they had grown to 200 KB
between them, and three enormous internal documents are the first thing a
reader saw on opening the repo.

| File | What it is |
|---|---|
| [`AUDIT.md`](AUDIT.md) | The original code-correctness audit — every finding, its severity, and how it was closed. Essentially finished; kept because several comments in the source cite its finding IDs. |
| [`PROJECT-PLAN.md`](PROJECT-PLAN.md) | The forward backlog, batch by batch, plus the `HUMAN ACTIONS` list of things that cannot be done from code (Supabase dashboard settings, deployment-time configuration). |
| [`PROGRESS.md`](PROGRESS.md) | What actually happened, appended after each batch. The current baseline for any number quoted elsewhere — test counts, route counts, measurement dates — lives here. |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | The launch-day runbook: environment variables grouped by what they turn on, the deploy steps, and a post-deploy smoke checklist. Nothing is deployed yet — this is the order to do it in when that changes. |
| [`UPWORK-LISTING.md`](UPWORK-LISTING.md) | Listing copy for publishing this work as an Upwork Project Catalog entry: title, description, tiers, image captions, FAQ. Marketing asset, not documentation. |

The honesty programme — auditing the site's *claims* rather than its code — is
recorded in `PROGRESS.md` batch by batch, and is the more interesting half of
this project's history.
