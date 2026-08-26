---
name: fe-architecture
description: Layered frontend architecture for web/ (React + Vite + MUI + React Query). MUST be followed for any new or modified FE code — where types, actions, hooks, components, and views live, and how to wire data fetching and mutations. Reference implementation - the status module.
---

# Frontend architecture (web/)

Every FE change MUST respect these layers and locations. The `status` module is the reference
implementation — when in doubt, imitate it.

## Layer map and dependency direction

```
view → hooks (facade) → actions → axios → API
  ↓         ↓              ↓
domain    types          types
components
```

Dependencies point one way only. Lower layers never import from upper layers.
Components never call axios or React Query directly — they consume facade hooks.

## Where every file goes

| What | Where | Rules |
|---|---|---|
| Types / contracts | `src/types/<domain>.ts` | Only types, zero logic. Every API response shape and UI entity lives here. Components may declare their own props types inline, nothing else. |
| Request functions (actions) | `src/actions/<domain>.ts` | Pure async functions using the shared axios instance: `getX(): Promise<IX>`. No React, no hooks, no state. Mappers/adapters (API DTO ⇄ UI type) also live here as `<domain>.mapper.ts`. |
| Query/mutation hooks (facade) | `src/sections/<domain>/hooks/use-<domain>.ts` | React Query wrapping actions. Defines the domain's query keys object (`<domain>Keys`) in the same file. This is the ONLY place that knows about React Query. |
| Domain components | `src/sections/<domain>/components/` | Presentational, receive props, no data fetching. Extract when JSX repeats or a block grows past ~50 lines. |
| Views | `src/sections/<domain>/view/<name>-view.tsx` | Pure composition: call facade hooks, pass props to components. No inline sub-components, no axios, no business logic. |
| Pages | `src/pages/<route>.tsx` | Thin wrappers: `<Helmet>` + view. Nothing else. |
| Generic components | `src/components/<name>/` | Domain-agnostic only (e.g. `info-row`). If it knows what a "product" is, it belongs in `sections/<domain>/components/`. |
| Generic hooks | `src/hooks/` | UI utilities only (`use-boolean`, `use-debounce`). Never data fetching. |
| Configured library clients | `src/lib/` | Singletons with project config: `axios.ts` (instance + `endpoints` map), `query-client.ts`. New third-party clients go here. |
| Pure helper functions | `src/utils/` | Stateless in/out functions (`format-time`, `format-number`). If it holds config or state, it is `lib/`, not `utils/`. |
| Routes | `src/routes/paths.ts` + `src/routes/sections/` | Every URL is declared in `paths.ts`; never hardcode route strings. |

## Data fetching pattern (React Query — SWR is legacy, do not use for new code)

Query keys — one object per domain, in the hooks file:

```ts
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ProductListParams) => [...productKeys.lists(), params] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
};
```

Query hook (facade):

```ts
export function useProducts(params: ProductListParams) {
  return useQuery({ queryKey: productKeys.list(params), queryFn: () => getProducts(params) });
}
```

Mutation hook — lives next to the queries, invalidates through the keys, toasts on result:

```ts
export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast.success('Product created');
    },
    onError: (error) => toast.error(error.message),
  });
}
```

API endpoints: always registered in the `endpoints` map in `src/lib/axios.ts` (real paths are
`/api/v1/...`). Never inline URL strings in actions.

## Recipe: adding a new domain feature

1. `src/types/<domain>.ts` — define contracts (API response + UI entity).
2. `src/lib/axios.ts` — add routes under `endpoints.<domain>`.
3. `src/actions/<domain>.ts` — pure request functions (+ mapper if API shape ≠ UI shape).
4. `src/sections/<domain>/hooks/use-<domain>.ts` — keys + query/mutation hooks.
5. `src/sections/<domain>/components/` — presentational pieces.
6. `src/sections/<domain>/view/` — compose hooks + components.
7. `src/pages/...` — Helmet wrapper; register route in `src/routes/sections/` and path in `paths.ts`; add nav entry if user-facing.

## Hard rules

- All code in English (identifiers, UI strings, logs). No code comments unless stating a non-obvious constraint.
- TypeScript strict — no `any`; type every API response.
- Client state (cart, UI toggles) stays in React context/local state — do NOT put server data in context.
- Do not import from `src/_mock` in new code (legacy template leftovers, being removed).
- Build gate: `npm run build` runs tsc strict + eslint (vite-plugin-checker). The `perfectionist/sort-imports` rule enforces import order — run `npx eslint --fix` if ordering errors appear.
- SWR is fully removed from the project — React Query is the only data-fetching layer. Both `status` and `product` hooks follow this pattern (`sections/<domain>/hooks/`).
