# WESTROY: Catalog & Integrations Roadmap

## Goal
Build a reliable marketplace core where:
- buyers see актуальные цены и остатки;
- suppliers can массово обновлять каталог;
- business owner controls quality and sync SLA.

## Persona-Based Priorities

### 1) Owner (platform business)
- KPI: fill-rate catalog, freshness, conversion request->accepted offer.
- Need: quality dashboard, sync logs, role-safe integrations, moderation flow.
- Risk: stale prices and empty catalogs kill trust.

### 2) Supplier (producer)
- Need: fast onboarding, bulk import, low-friction updates, stock control.
- Pain: manual product-by-product entry.
- KPI: time-to-first-catalog < 30 min.

### 3) Buyer (client)
- Need: valid product cards, understandable units, reliable offer timing.
- KPI: search relevance and response SLA.

## Implemented in current iteration
- Producer CSV import endpoint: `POST /api/products/import`.
- Producer UI import block in dashboard products tab.
- Catalog quality endpoint: `GET /api/catalog/quality` (admin).
- 1C sync skeleton endpoint: `POST /api/integrations/onec/sync` with `x-integration-key`.
- Integration logs endpoint: `GET /api/integrations/onec/sync` (admin).
- Admin tabs: "Качество каталога", "Интеграции".

## Next Iteration (recommended)

1. Import hardening
- Add downloadable CSV template and strict per-column validation report.
- Add "dry-run" mode before commit.
- Add duplicate conflict strategy (keep latest/manual review).

2. 1C production adapter
- Add idempotency key and dedupe by external SKU.
- Support company mapping by external company code.
- Retry policy + alert on failed sync.

3. Catalog quality workflow
- Add tasks queue in admin: "companies without products", "stale prices > 14 days".
- Add reminders to producers (email/telegram) for stale catalog.

4. Buyer-facing trust
- Show "updated at" badge on product cards.
- Hide or demote stale offers in search ranking.
- Add delivery SLA and MOQ in product model (next DB migration wave).

## Deployment Checklist for integrations
- Set `INTEGRATION_API_KEY`.
- (Optional) Set `ONEC_COMPANY_MAP_JSON` like `{"one_c_code_001":"company_cuid"}`.
- Set `ADMIN_NOTIFICATION_EMAIL` (optional).
- Configure source system to call `/api/integrations/onec/sync`.
- Verify admin sees logs in Integrations tab.
- Verify quality metrics trend weekly.

## 1C API examples

### CSV import (producer)
- Download template: `GET /api/products/import`
- Validate without write: `POST /api/products/import` with `{ "csv": "...", "dryRun": true }`
- Apply import: `POST /api/products/import` with `{ "csv": "...", "dryRun": false }`

### 1C sync (integration)
```bash
curl -X POST "http://localhost:3000/api/integrations/onec/sync" \
  -H "Content-Type: application/json" \
  -H "x-integration-key: YOUR_KEY" \
  -H "x-idempotency-key: sync-2026-02-16-12-00-companyA" \
  -d '{
    "companyExternalCode": "one_c_code_001",
    "source": "1C-UT11",
    "products": [
      {
        "externalSku": "SKU-0001",
        "name": "Бетон М300",
        "category": "Бетон",
        "priceFrom": 28500,
        "unit": "м3",
        "inStock": true
      }
    ]
  }'
```

Notes:
- Repeat same `x-idempotency-key` to safely retry without double apply.
- `externalSku` is used as primary dedupe key per company.
- Fallback dedupe: `name + unit`.
