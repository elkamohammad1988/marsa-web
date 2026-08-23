# docs/

The working record. None of it is needed to run the project — start from the
[README](../README.md) for that, or [CASE-STUDY.md](../CASE-STUDY.md) for the
short version of what was built and why.

`AUDIT.md` and `PROJECT-PLAN.md` moved out of the repository root because two
enormous internal documents were the first thing a reader saw on opening it.
`RUNBOOK.md` and `DATA.md` are the two written to be read *during* an incident
or a subject request rather than after one: they are operational, not
historical.

The batch-by-batch build log that used to sit here is not published. It was a
working diary — one entry per batch, with the PR number and the verification
output — which is useful while the work is happening and noise to anyone
arriving afterwards. The reasoning that mattered is in the commit history and
in the comments above the code it explains.

| File | What it is |
|---|---|
| [`AUDIT.md`](AUDIT.md) | The original code-correctness audit — every finding, its severity, and how it was closed. Essentially finished; kept because several comments in the source cite its finding IDs. |
| [`PROJECT-PLAN.md`](PROJECT-PLAN.md) | The forward backlog, batch by batch, plus the `HUMAN ACTIONS` list of things that cannot be done from code (Supabase dashboard settings, deployment-time configuration). |
| [`RUNBOOK.md`](RUNBOOK.md) | For whoever is on the other end of an alert: how to read `/api/health`, a playbook per failing dependency, how to recover submissions from the logs, migrations, rollback, and secret rotation. |
| [`DATA.md`](DATA.md) | Every piece of personal data the application can hold — what is collected, where it lives, who can read it, how long it is kept, and how to answer an erasure or access request. |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | The launch-day runbook: environment variables grouped by what they turn on, the deploy steps, and a post-deploy smoke checklist, plus the record of the one credential-free deploy that has happened. |
| [`UPWORK-LISTING.md`](UPWORK-LISTING.md) | Listing copy for publishing this work as an Upwork Project Catalog entry: title, description, tiers, image captions, FAQ. Marketing asset, not documentation. |

The honesty programme — auditing the site's *claims* rather than its code — ran
alongside the code audit and is the more interesting half of this project's
history. It is visible in the git log and in the comments above the copy it
rewrote.
