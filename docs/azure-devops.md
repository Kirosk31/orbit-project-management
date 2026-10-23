# Azure DevOps

Orbit ships with an Azure Pipelines definition, `azure-pipelines.yml`, that runs the same quality
gates as the GitHub Actions workflow. The repository can live in Azure Repos or stay on GitHub
with Azure Pipelines connected to it.

## Pipeline layout

| Stage        | What it proves                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Quality`    | Lint, typecheck, API/web/shared/site tests against real PostgreSQL 16 and Redis 7 service containers, production build, Prettier, `npm audit` |
| `Browser`    | Playwright journeys plus Axe checks for the app and the Next.js site, with traces uploaded on failure                                         |
| `Containers` | The production Compose file validates and every image builds                                                                                  |
| `Secrets`    | gitleaks scans the full history                                                                                                               |
| `Staging`    | Optional. Pushes `api`, `worker` and `web` images to Azure Container Registry, behind an approval gate                                        |

`Quality`, `Browser`, `Containers` and `Secrets` run in parallel. Test results from Vitest and
Playwright are published in JUnit format, so they appear in the run's **Tests** tab and in
Azure Test Plans analytics.

Shared setup (Node 22.22.0, pinned like `.nvmrc`; npm cache; Prisma client, shared package build,
migrations, role seed) lives in `.azure-pipelines/templates/setup-workspace.yml` and is reused by
every job that needs it.

## First-time setup

1. **Import or connect the repository.**
   - Azure Repos: _Repos → Import repository_ with the GitHub URL.
   - GitHub: install the Azure Pipelines GitHub App on the repository.
2. **Create the pipeline.** _Pipelines → New pipeline → Existing Azure Pipelines YAML file_ and
   choose `/azure-pipelines.yml`.
3. **Run it once on `main`** to register the stages and the `orbit-staging` environment.

No secrets are needed for CI: test credentials are non-production values defined in the pipeline
variables, the same ones the GitHub workflow uses.

## Optional staging publish

The `Staging` stage only exists when the run is queued with **Push images to the staging
registry** checked (the `deployStaging` parameter), and only proceeds on `main`.

1. Create an Azure Container Registry and a **Docker Registry service connection** to it.
2. Create a variable group named `orbit-staging` (Pipelines → Library) with:
   - `ACR_SERVICE_CONNECTION`: the service connection name
   - `ACR_LOGIN_SERVER`: for example `orbitstaging.azurecr.io`
3. Link the variable group to the pipeline (or add `- group: orbit-staging` under `variables`).
4. In _Pipelines → Environments → orbit-staging_, add an **Approvals** check so a person
   confirms every publish.

Images are tagged with the build ID (`orbit-api:<Build.BuildId>`) so each deployment is
traceable to a pipeline run.

## Branch policies for `main`

In _Repos → Branches → main → Branch policies_ (Azure Repos):

- **Build validation:** add this pipeline, trigger automatic, policy required, expiry
  immediately when `main` updates.
- **Minimum number of reviewers:** 1, and reset votes when new changes are pushed.
- **Check for linked work items:** optional; recommended when work is tracked in Azure Boards.
- **Check for comment resolution:** required.
- **Limit merge types:** squash merge, which keeps `main` readable alongside Conventional
  Commits (enforced locally by commitlint).

With GitHub as the host, the equivalent is a branch protection rule on `main` that requires the
`Quality`, `Browser`, `Containers` and `Secrets` checks reported by Azure Pipelines.

## Running the same gates locally

```bash
npm ci
npm run db:up
npm run prisma:generate -w @orbit/api && npm run build -w @orbit/shared
npm run prisma:deploy -w @orbit/api && npm exec -w @orbit/api prisma db seed
npm run lint && npm run typecheck && npm test && npm run build && npm run format:check
npm run test:e2e
```
