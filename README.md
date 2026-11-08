# My Family Recipe Vault

A private, multi-user recipe and nutrition platform for families. Households share a recipe library, meal planner and shopping lists with role-based permissions (Owner/Editor/Viewer), while nutrition data is calculated honestly — unknown values stay unknown rather than being guessed.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript (strict) + Tailwind CSS v4
- **shadcn/ui** on **Base UI** primitives (not Radix — see note below)
- **Supabase** (Postgres, Auth, Storage), provisioned via the Vercel Marketplace
- Row Level Security + `SECURITY DEFINER` RPC functions for every privileged or multi-table write
- **Vitest** for unit tests

## Getting started

```bash
npm install
cp .env.example .env.local   # or: vercel env pull .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database

Schema lives in `supabase/migrations/`, applied in order. With the Supabase CLI and a `POSTGRES_URL_NON_POOLING` connection string in your environment:

```bash
npx supabase db push --remote="$POSTGRES_URL_NON_POOLING"
npx supabase gen types typescript --db-url "$POSTGRES_URL_NON_POOLING" > src/lib/types/database.ts
```

### Tests

```bash
npm run test        # one-off run
npm run test:watch  # watch mode
```

Unit tests cover the nutrition calculation engine (verifying it never fabricates a value — unknown ingredients leave a nutrient `null`/incomplete rather than contributing a guessed number), serving-scale formatting, and the schema.org recipe-import parser.

## Project structure

```
src/app/(app)/        Authenticated app routes (sidebar shell)
src/app/recipes/.../print   Standalone print/PDF view (no app shell)
src/lib/households/   Household context resolution (active household, roles)
src/lib/nutrition/    Never-fabricate nutrition calculator + formatting
src/lib/import/       schema.org/Recipe URL + JSON import parsing
supabase/migrations/  Ordered SQL migrations (schema, RLS, RPC functions)
```

## Architecture notes

- **Multi-tenancy**: `household_id` is the tenant boundary. Most content (recipes, tags, collections) also supports a `personal` visibility that bypasses households entirely.
- **RBAC enforced in Postgres, not just the UI**: RLS policies and `has_household_role()` checks gate every table; the server actions trust Postgres, not client-side role checks.
- **Transactional writes go through RPCs**: `create_recipe`/`update_recipe` etc. are `SECURITY DEFINER` functions that replace a recipe's ingredients/steps/tags atomically in one call, rather than multiple client-side inserts.
- **Recipe version history**: `update_recipe` snapshots the pre-edit state into `recipe_versions` before applying changes, so version N is always "the recipe as it looked before edit N." Restoring an old version just resubmits its snapshot through the same `update_recipe` path, which in turn snapshots the current state — restores are themselves undoable.
- **Nutrition never fabricates data**: `calculateRecipeNutrition()` sums only known contributions and marks a nutrient `complete: false` the moment any ingredient's contribution to it is unresolved, so the UI can show "320+ kcal" rather than a falsely precise number.

### shadcn/ui on Base UI

This project initialised shadcn/ui with `--base base-ui` instead of the Radix default. Component composition uses the `render` prop (`<DialogTrigger render={<Button />}>`) instead of `asChild`, and controlled `Select`/`SelectValue` components need an explicit `children` render function since Base UI shows the raw value rather than a matched item label by default.

## Deployment

The project is linked to Vercel (`vercel link`) with Supabase provisioned through the Vercel Marketplace integration, which keeps environment variables in sync automatically.

```bash
vercel deploy          # preview deployment
vercel deploy --prod   # promote to production
```
