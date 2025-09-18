# Migration Guide: Legacy to Modular Architecture

This guide helps migrate existing code to the new modular architecture.

## Phase 1: Types Migration

### Before
```typescript
// Scattered throughout components
interface CreatorProfileProps { ... }
interface UserData { ... }
interface ApiResponse<T> { ... }
```

### After
```typescript
// Centralized in shared/types/
import type { Creator, User, APIResponse } from '@/shared/types'

// Component props use shared types
interface CreatorProfileProps {
  creator: Creator
  user: User
}
```

### Action Items
1. Move all interfaces to `shared/types/`
2. Update imports across codebase
3. Remove duplicate type definitions

## Phase 2: API Layer Migration

### Before
```typescript
// Direct Supabase calls in components
const { data } = await supabase.from('creators').select('*')
```

### After
```typescript
// Centralized API with React Query
const { data, loading, error } = useCreatorSearch(filters)
```

### Action Items
1. Create query hooks in `features/*/hooks/`
2. Use `shared/api/client.ts` for Supabase access
3. Add validation with Zod schemas
4. Replace direct API calls with hooks

## Phase 3: Component Migration

### Before
```typescript
// Large, mixed-concern components
const CreatorDashboard = () => {
  const [state, setState] = useState(/* complex state */)
  const [data, setData] = useState([])
  
  // Fetch data
  useEffect(() => { /* manual API calls */ }, [])
  
  // Render everything
  return <div>{/* 200+ lines of JSX */}</div>
}
```

### After
```typescript
// Feature-focused, composed components
const CreatorDashboard = () => {
  return (
    <DashboardLayout>
      <DashboardHeader />
      <DashboardStats />
      <CreatorList />
    </DashboardLayout>
  )
}

// In features/creator/components/
const CreatorList = () => {
  const { data, loading } = useCreatorQuery()
  
  if (loading) return <LoadingSpinner />
  
  return (
    <div>
      {data.map(creator => (
        <CreatorCard key={creator.id} creator={creator} />
      ))}
    </div>
  )
}
```

### Action Items
1. Break large components into smaller ones
2. Move feature-specific components to `features/*/components/`
3. Extract reusable UI to `shared/ui/`
4. Use composition over props drilling

## Phase 4: State Management Migration

### Before
```typescript
// Mixed server/UI state
const [creators, setCreators] = useState([])
const [loading, setLoading] = useState(false)
const [modalOpen, setModalOpen] = useState(false)
const [searchQuery, setSearchQuery] = useState('')

useEffect(() => {
  // Manual data fetching
  fetchCreators()
}, [searchQuery])
```

### After
```typescript
// Separated concerns
// Server state (React Query)
const { data: creators, loading } = useCreatorSearch(debouncedQuery)

// UI state (local)
const [modalOpen, setModalOpen] = useState(false)

// Shared state (Context)
const { searchQuery, updateQuery } = useSearch()
```

### Action Items
1. Replace data fetching useState with React Query
2. Keep UI state local to components
3. Use Context only for cross-feature shared state
4. Add debouncing to search inputs

## Phase 5: Performance Optimization

### Before
```typescript
// No pagination, loads all data
const [allCreators, setAllCreators] = useState([])

// No debouncing
const handleSearch = (query) => {
  fetchCreators(query) // Fires on every keystroke
}

// No code splitting
import CreatorDashboard from './CreatorDashboard'
```

### After
```typescript
// Paginated loading
const { items, fetchNextPage, hasMore } = usePaginatedQuery({
  queryKey: queryKeys.creators(filters),
  queryFn: ({ pageParam }) => fetchCreators({ ...filters, page: pageParam })
})

// Debounced search
const { searchQuery } = useDebouncedSearch(query, 300)

// Lazy loading
const CreatorDashboard = lazy(() => import('@/features/creator/pages/Dashboard'))
```

### Action Items
1. Add pagination to all lists
2. Implement search debouncing
3. Add lazy loading to heavy routes
4. Use React.memo for expensive components

## Checklist per Component Migration

- [ ] Types moved to `shared/types/`
- [ ] API calls replaced with React Query hooks
- [ ] Component broken down (< 100 lines)
- [ ] Server state separated from UI state  
- [ ] Performance optimizations applied
- [ ] Tests added for critical logic
- [ ] Imports updated to new structure

## Common Patterns

### Search Implementation
```typescript
// In feature component
const SearchableCreatorList = () => {
  const { filters, updateQuery } = useSearch()
  const { searchQuery } = useDebouncedSearch(filters.query)
  const { items, loading } = useCreatorSearch({ ...filters, query: searchQuery })
  
  return (
    <div>
      <SearchInput value={filters.query} onChange={updateQuery} />
      <CreatorGrid items={items} loading={loading} />
    </div>
  )
}
```

### Modal Management
```typescript
// Local UI state for modals
const CreatorProfile = ({ creator }: { creator: Creator }) => {
  const [showEditModal, setShowEditModal] = useState(false)
  
  return (
    <div>
      <Button onClick={() => setShowEditModal(true)}>Edit</Button>
      <EditModal 
        open={showEditModal} 
        onClose={() => setShowEditModal(false)}
        creator={creator}
      />
    </div>
  )
}
```

### Form Handling with Validation
```typescript
const CreateCreatorForm = () => {
  const createCreator = useMutation({
    mutationFn: (data: CreatorInsert) => 
      validateInput(createCreatorSchema, data)
        .then(validData => supabase.from('creators').insert(validData))
  })
  
  const handleSubmit = (formData: unknown) => {
    createCreator.mutate(formData)
  }
  
  return <form onSubmit={handleSubmit}>...</form>
}
```