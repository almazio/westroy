# SQLite -> PostgreSQL Migration (Supabase)

## 1) Set env vars

Required:
- `POSTGRES_PRISMA_URL` (pooled URL, usually 6543)
- `POSTGRES_URL_NON_POOLING` (non-pooling URL, usually 5432)
- `SQLITE_DATABASE_URL` (path to old sqlite db, example: `file:./prisma/dev.db`)

## 2) Generate Prisma clients

```bash
npm run prisma:generate
npm run prisma:generate:sqlite
```

## 3) Create schema in PostgreSQL

Use one option:

```bash
npx prisma db push
```

or, if migrations are in place:

```bash
npx prisma migrate deploy
```

## 4) Run data migration

```bash
npm run migrate:sqlite-to-postgres
```

This script migrates in order:
1. `Region`
2. `Category`
3. `User`
4. `Company`
5. `Product`
6. `Request`
7. `Offer`

It uses `upsert` and preserves IDs.

## 5) Verify

Check key endpoints in local/prod:
- `/api/categories`
- `/api/companies`
- `/api/products`
- `/admin`

## 6) Deploy

Add env vars in Vercel (`POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `AUTH_SECRET`, `APP_URL`, `NEXT_PUBLIC_APP_URL`) and redeploy.
