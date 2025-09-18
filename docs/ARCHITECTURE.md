# Architecture Guidelines

This document outlines the enforced architectural principles for the SkipAmerica codebase.

## Folder Discipline

### ✅ **Allowed Patterns**
- `src/shared/*` - Reusable code (types, UI, hooks, API, config)
- `src/features/*/` - Feature-specific code (components, hooks, types scoped to feature)
- `src/app/*` - Application shell (providers, routing, guards)

### ❌ **Prohibited Patterns**
- Feature-to-feature imports (use `shared/*` instead)
- App layer importing from features (use routing/providers)
- Shared code depending on features or app code

## Type System Single Source of Truth

### ✅ **Correct Usage**
```typescript
// Only in src/shared/types/
export interface User { ... }
export type UserFilters = { ... }

// In features, import and use:
import type { User } from '@/shared/types'
```

### ❌ **Prohibited**
```typescript
// DO NOT define types in feature components
interface UserProps { ... } // ❌ Use shared types

// DO NOT redefine existing entities
interface User { ... } // ❌ Already exists in shared/types
```

## State Management Strategy

### Server State (React Query)
- All API data fetching
- Automatic caching and background updates
- Optimistic updates for mutations
- Use centralized query keys from `shared/api/query-keys.ts`

### UI State (Local)
- Modal open/closed states
- Form input values
- Component-specific temporary state
- Scoped to component or feature level

### Global State (Context - Requires ADR)
- Only with architectural decision record (ADR)
- Examples: authentication, theme, search filters

## Validation Contracts

### API Boundaries
```typescript
// Define schemas in shared/types/validation.ts
export const createUserSchema = z.object({ ... })

// Use validators at API boundaries
const validatedInput = validateInput(createUserSchema, userInput)
```

### Query Keys
```typescript
// Centralized in shared/api/query-keys.ts
export const queryKeys = {
  users: (filters?: UserFilters) => ['users', filters] as const,
  user: (id: string) => ['user', id] as const,
}
```

## Performance Defaults

### Pagination
- All list endpoints must support pagination
- Use `usePaginatedQuery` for infinite scroll
- Default page size: 20 items

### Search Debouncing
- Use `useDebouncedSearch` for search inputs
- Default debounce: 300ms
- Minimum query length: 2 characters

### Code Splitting
- Lazy load all route components
- Heavy features should be code-split
- Use React.lazy() and Suspense

## Testing Requirements

### Unit Tests
- All new utility functions must have tests
- Critical business logic requires tests
- Minimum coverage: 70%

### E2E Tests (Playwright)
- User-critical flows require happy-path tests
- Authentication flows
- Payment flows
- Core user journeys

### Test Structure
```
src/
  shared/lib/__tests__/
  features/auth/__tests__/
  test/e2e/
```

## Quality Gates (CI)

The following checks must pass:

1. **TypeScript Compilation**: `tsc --noEmit`
2. **Linting**: `eslint . --max-warnings 0`
3. **Duplicates Check**: `npm run check-duplicates`
4. **Test Coverage**: `npm run test:coverage`
5. **E2E Tests**: `npm run test:e2e` (on main branch)

## Documentation

### ADRs (Architecture Decision Records)
- Location: `docs/adr/`
- Required for: global state additions, major architectural changes
- Format: 5-10 lines with context, decision, consequences

### Code Comments
- JSDoc for public APIs
- Inline comments for complex business logic
- Component prop documentation

## Enforcement

These guidelines are enforced through:
- ESLint rules (import restrictions, cycles)
- Custom scripts (`check-duplicates.js`)
- CI pipeline failures
- Code review checklist