# Project Guidelines for Claude

## Architecture Principles

### Separation of Concerns
- **Standalone logic and components should be in standalone files** - Extract reusable logic into separate files (hooks, utilities, components)
- Keep components focused on a single responsibility
- Business logic should live in hooks or utility functions, not in components
- Data fetching/mutations should be separate from UI rendering logic

### Composability (No Prop Drilling)
- **Components should access shared state directly from context/hooks** - Do not pass data through multiple component layers via props
- Use React Context or state management libraries for shared state
- Components should be self-contained and consume only what they need
- Pass only component-specific configuration as props (e.g., `dataType`, `salaryId`)

### Data Sharing with React Query (where applicable)
- Use React Query for server state management and caching
- Leverage query keys for data sharing across components
- Use mutations for data updates with optimistic updates where appropriate
- Consider React Query for any async data operations

## Component Guidelines

### Page Components
- Should be thin orchestrators
- Manage page-specific local state (e.g., modal open/close)
- Should NOT extract all data from context just to pass to children

### Feature Components
- Should use `useRevenue()` or other hooks directly to access needed data
- Accept minimal props - only what's truly component-specific
- Handle their own data requirements internally

### Presentational Components
- Pure components that receive all data via props
- No side effects or data fetching
- Use for truly reusable UI elements

## File Structure

```
src/
├── components/     # Feature and presentational components
├── hooks/          # Custom hooks for state and logic
├── context/        # React Context providers
├── pages/          # Route-level page components
├── store/          # Data persistence (IndexedDB)
├── types/          # TypeScript type definitions
└── utils/          # Pure utility functions
```

## Code Style

- Use TypeScript for all new code
- Prefer functional components with hooks
- Use `useCallback` for functions passed to child components
- Keep components under 200 lines when possible
- Extract complex logic into custom hooks
