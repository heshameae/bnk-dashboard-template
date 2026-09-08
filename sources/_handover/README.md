# Handovers from the data team

One export per handover, as received, never edited and never overwritten: `<YYYY-MM-DD>-<SYSTEM>-schema.xlsx`, or a folder `<YYYY-MM-DD>-<SYSTEM>-schema/` holding one `.csv` per sheet. A corrected export is a new dated file. `/import-schema` files it here, writes the `.yaml` files beside this folder plus `../_import-report.md`, and `npm run import-schema -- validate` re-checks the files against the newest one at any time. Contract: `docs/contracts/sources.md`. Parser: `packages/import-schema`.
