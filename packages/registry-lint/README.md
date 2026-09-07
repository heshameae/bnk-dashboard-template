# registry-lint (to build, phase 1; runs in CI on every PR)

Checks `catalog/kpi-registry.yaml`, `catalog/acceptance.yaml`, `security/rls-policies.yaml`, every `bi_model/*.sql` header and every `dashboards/*/spec.yaml`. Rules are the numbered lists in `docs/contracts/kpi-registry.md`, `docs/contracts/acceptance.md`, `docs/contracts/rls-policies.md`, `docs/contracts/spec.md` and the header format in `docs/CONVENTIONS.md`. Exit 1 on any failure, with the file, the rule number and the fix in one line each. Prints the `exemptions:` list in every run.
