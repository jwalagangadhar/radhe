# Scratch Directory Audit & Script Migration Report

**Date:** September 2026  
**Action:** Root & Scratch Cleanup and Relocation to Permanent Directories  

---

## 1. Scratch Review & Actions Taken

Prior to this refactoring, temporary and uncurated scripts existed in the root directory and `scratch/`. Each file was audited and assigned a permanent home:

| Original Path | Purpose / Description | Action Taken | Permanent Location |
|:---|:---|:---|:---|
| `scratch/test-auth-flows.ts` | Complete RBAC, route guard, and cookie integration test suite | Migrated & Promoted | `tests/test-auth-flows.ts` |
| `scratch/test-mobile-api.ts` | 20-point backend security & mobile API test suite | Migrated & Promoted | `tests/test-mobile-api.ts` |
| `scratch/test-admin-cash-counter.ts` | Admin cash counter billing & wholesale verification script | Migrated & Promoted | `tests/test-admin-billing.ts` |
| `scratch/check-db.js` | Database order inspection script | Converted to TypeScript & Promoted | `scripts/check-db.ts` |
| `test-pdf.ts` (Root) | PDF generation unit test | Migrated from root | `tests/test-pdf.ts` |
| `regenerate-pdf.ts` (Root) | Background task PDF regeneration trigger | Migrated from root | `scripts/regenerate-pdf.ts` |
| `src/lib/pdf-lib.ts` | Exact duplicate of `src/lib/pdf.ts` (unimported) | Archived safely | `archive/pdf-lib.ts` |

---

## 2. Archive Directory Preservation (`archive/`)

To guarantee zero accidental data loss, all original files have been backed up in `archive/` and excluded from `tsconfig.json` and ESLint checks.

---

## 3. Permanent Directory Standards

- **`tests/`:** Contains automated test suites runnable via `npm test`, `npm run test:auth`, `npm run test:mobile`, `npm run test:billing`, and `npm run test:pdf`.
- **`scripts/`:** Contains operational CLI tools runnable via `npm run db:check` or `tsx scripts/<script>.ts`.
