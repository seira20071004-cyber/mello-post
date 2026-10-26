<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## mellō: user-approved development and release policy

The user designated the current application as the first stable version on 2026-10-27. Treat `v1.0.0` as the immutable baseline and `main` as the approved stable branch. Read `docs/しくみと開発の進め方.md`, `CHANGELOG.md`, and the relevant release manifest before release or rollback work.

- Implement ordinary improvements on `develop` (or an isolated feature branch), never directly on `main`. If the checkout is on main, inspect and preserve existing work, then switch to a development branch before application edits.
- State the requested change and affected area. Preserve unrelated UI, modes, defaults, data formats and behavior. Do not bundle unsolicited redesigns, refactors or dependency upgrades.
- Complete implementation, relevant checks, and a local preview with clear steps for the user to try. Report what was tested and what remains unverified.
- Do not merge or push development changes to main until the user has approved that reviewed change. A specific user request to save an accepted stable version to main is sufficient authorization for that save.
- **Do not publish, deploy, invoke publish-on-push, update the production URL, or roll production back without explicit user authorization for the reviewed change or requested rollback.** An ordinary feature/fix request is not publication permission. This user instruction overrides any skill's default auto-publication workflow. Finish the concrete reviewable change before asking for the final publication decision.
- GitHub CI is verification only. Do not add automated production deployments or combine ordinary commits with production publication.
- Before an authorized release, record the previous stable Git tag and Sites saved version. Publish the same application behavior that was reviewed; material additional changes require another preview. Record the new source commit, hosted source commit, saved version and deployment in `docs/releases/` and update CHANGELOG after successful publication.
- Do not move or delete stable tags, rewrite main history, force-push, or use destructive resets to roll back. Prepare a reviewed revert or use a recorded saved Site version for an explicitly requested production rollback. Check stored-data compatibility first.
- Preserve browser-local drafts and existing data migration paths. Git tags restore application code, not IndexedDB data, secrets, or identical AI outputs. Never commit credentials.
- Creating a separate hosted test environment, changing production credentials, or enabling GitHub branch-protection rules requires its own appropriate authorization; do not claim these are already configured.

Baseline setup exception: the user explicitly requested the already accepted application be saved to main as v1.0.0. Documentation, CI triggers for develop, release records and this policy may be committed to main for that setup without publishing the Site.
