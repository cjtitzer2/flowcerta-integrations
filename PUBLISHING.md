# Publishing to the Marketplaces

How to ship the Flowcerta GitHub Action and the Azure DevOps task to their respective marketplaces. This is a release operator's checklist — assume nothing about prior state, work top to bottom.

Both marketplaces have one-time setup and per-release steps. The one-time setup is documented inline; bookmark it.

---

## GitHub Actions Marketplace

GitHub Actions runs the bundled JS straight from the repository — `dist/` must be committed (it is; see the note in `.gitignore`).

### One-time setup

1. The action lives in this monorepo at `github-actions/` rather than at the repo root. GitHub Marketplace can list any `action.yml` in a public repo regardless of path, but the `uses:` reference is awkward: consumers have to write
   `uses: cjtitzer2/flowcerta-integrations/github-actions@v1`
   instead of the cleaner `uses: flowcerta/validate-action@v1`.

   You have two options:

   - **Option A (faster)** — list from this repo as-is. The marketplace listing will work; the README is what matters for discoverability.
   - **Option B (recommended for a clean consumer story)** — create a dedicated public repo (e.g. `flowcerta/validate-action`) that mirrors only the `github-actions/` contents. Steps below assume Option A; the only difference for Option B is the repo path in `uses:`.

2. Make sure the repository is **public**. Marketplace will not list a private repo.

3. Confirm `action.yml` has a `branding` block. It does — `shield` icon, `blue` color. The marketplace card uses this.

### Per-release steps

1. **Rebuild `dist/`.** GitHub runs it directly — stale dist is the #1 cause of "the action errors with `Cannot find module …`" reports.

   ```powershell
   cd github-actions
   npm install
   npm run build
   npm test
   git status               # confirm dist/ changes are present
   ```

2. **Commit dist + bump version in `package.json`** if you changed code:

   ```powershell
   git add github-actions/dist github-actions/package.json
   git commit -m "release(github-actions): v1.0.0"
   git push
   ```

3. **Tag the release.** Use a semver tag *and* a floating major tag (`v1`) so consumers can pin loosely:

   ```powershell
   git tag -a v1.0.0 -m "Flowcerta Governance Gate v1.0.0"
   git tag -f v1                            # force-update the floating major
   git push origin v1.0.0
   git push origin v1 --force
   ```

4. **Create the GitHub Release** at <https://github.com/cjtitzer2/flowcerta-integrations/releases/new>:
   - **Choose a tag:** `v1.0.0` (the one you just pushed)
   - **Target:** `main` (or the branch the tag is on)
   - **Title:** `Flowcerta Governance Gate v1.0.0`
   - **Description:** copy from the latest `CHANGELOG.md` entry for the action
   - **Publish this Action to the GitHub Marketplace:** ✅ check this box
   - **Primary category:** Continuous integration
   - **Another category (optional):** Code quality
   - Click **Publish release**

5. **Verify the listing.** It typically appears within a minute at
   <https://github.com/marketplace/actions/flowcerta-governance-gate>
   (slug is auto-derived from the `name` field in `action.yml`). Open in incognito to confirm it's publicly listed.

6. **Smoke-test the published action** from a separate repo by referencing `cjtitzer2/flowcerta-integrations/github-actions@v1` and running it against a known-bad workflow file. Confirm the 422 path fails the job.

### Common issues

- **`Cannot find module './dist/index.js'`** — `dist/` wasn't committed for the tag. Rebuild, commit, retag.
- **Action card doesn't render branding icon** — typo in the `branding.icon` value; only Feather Icon names listed in [the docs](https://docs.github.com/en/actions/sharing-automations/creating-actions/metadata-syntax-for-github-actions#branding) are accepted.
- **"Action is not in a public repo"** — toggle repo visibility to public from Settings → General.

---

## Azure DevOps Marketplace (Visual Studio Marketplace)

Azure DevOps tasks ship as a **VSIX bundle** uploaded to the Visual Studio Marketplace. The flow is more involved than GitHub Actions because it requires a publisher account, a packaging step, and a separate upload UI.

### One-time setup

1. **Install `tfx-cli` globally:**

   ```powershell
   npm install -g tfx-cli
   tfx --version
   ```

2. **Create a Visual Studio Marketplace publisher account.** Sign in to <https://aka.ms/vsmarketplace-manage> with the Microsoft account that should own the publisher. Click **Create publisher**.

   - **Publisher ID** is the slug used in extension URLs. Pick something stable like `flowcerta`. The current `vss-extension.json` references `flowcerta` — if you choose a different ID, update the `publisher` field before packaging.
   - **Display name:** `Flowcerta`
   - **Verify the publisher domain** at <https://flowcerta.com> if you want the "verified publisher" badge. (Optional, recommended for sales credibility.)

3. **Create the extension icon.** Add `azure-devops/images/extension-icon.png` — a 128×128 PNG. Export from the marketing-site logo at `frontend/marketing-site/public/logo.svg`, or use any 128×128 PNG that matches the brand. The manifest already references this path.

   A 32×32 task icon is optional but recommended at `azure-devops/icon.png`; reference it from `task.json` via the `iconUrl` field if you want it.

### Per-release steps

1. **Rebuild `dist/`:**

   ```powershell
   cd azure-devops
   npm install
   npm run build
   npm test
   ```

2. **Bump versions.** Both `task.json` (`version.{Major,Minor,Patch}`) and `vss-extension.json` (`version`) need bumping. Use the same semver. Azure DevOps will reject an upload if the version isn't strictly greater than the latest published version.

3. **Package the VSIX:**

   ```powershell
   cd azure-devops
   tfx extension create --manifest-globs vss-extension.json --output-path .
   ```

   You should see `flowcerta.flowcerta-validate-1.0.0.vsix` (or similar) in the directory.

4. **Upload the VSIX** at <https://aka.ms/vsmarketplace-manage>:
   - Select your publisher (`flowcerta`)
   - Click **New extension → Azure DevOps**
   - Upload the `.vsix` file
   - Wait for validation (usually under a minute)
   - On the resulting extension page, click **... → Share** if you want to make it available to a specific organization for private testing before going public

5. **Make it public.** From the extension detail page in the management portal:
   - Click **... → Publish**
   - The extension will appear at <https://marketplace.visualstudio.com/items?itemName=flowcerta.flowcerta-validate>
   - Public listings can take a few hours to surface in search; the direct link works immediately.

6. **Smoke-test the published task** from a separate Azure DevOps pipeline by installing the extension into a test organization and running it.

### Common issues

- **`Manifest must include an icon at 128x128` or `Cannot resolve images/extension-icon.png`** — the icon file isn't in `azure-devops/images/`. Add the PNG.
- **`Version must be strictly greater than the published version`** — bump both `task.json` and `vss-extension.json`.
- **`Publisher doesn't exist`** — the `publisher` field in `vss-extension.json` doesn't match your registered publisher ID.
- **Task doesn't appear in pipeline picklist** — the extension has been uploaded but not yet shared to the target organization; share it from the management UI.

---

## After publishing — link from the marketing site

Once both listings are live, update `frontend/marketing-site/app/ci-integration/page.tsx` (or wherever the marketplace links live in the marketing repo) to point at the real marketplace URLs instead of the in-repo source paths. This is the consumer's discovery path; it should resolve to the marketplace card, not a GitHub directory.

Suggested copy:

> **Install from your marketplace:**
> [GitHub Actions Marketplace](https://github.com/marketplace/actions/flowcerta-governance-gate) ·
> [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=flowcerta.flowcerta-validate)

---

## Release checklist (copy-paste before every release)

```
[ ] Rebuild dist/ in both github-actions/ and azure-devops/
[ ] Run npm test in both — all green
[ ] Bump package.json version in each
[ ] Bump task.json + vss-extension.json version
[ ] Commit dist + version bumps
[ ] Update CHANGELOG.md
[ ] Tag vX.Y.Z + force-update vX major-tag
[ ] Push tags
[ ] Create GitHub Release with "Publish to Marketplace" checked
[ ] Package VSIX with `tfx extension create`
[ ] Upload VSIX at aka.ms/vsmarketplace-manage
[ ] Verify both listings are publicly visible
[ ] Smoke-test each from a separate repo / org
[ ] Update marketing-site ci-integration page with new marketplace URLs
```
