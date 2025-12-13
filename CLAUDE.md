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

## CSS/Tailwind Rules

### Size Utility - Use `size-*` for Square Dimensions
**ALWAYS use `size-*` instead of `w-* h-*` when width and height are the same.** The `size-*` utility sets both dimensions in a single class:

```tsx
// ✅ CORRECT - Use size-* for square dimensions
<Icon className="size-4" />
<Avatar className="size-8" />
<Loader className="size-12" />

// ❌ WRONG - Do NOT use separate w-* h-* when they match
<Icon className="w-4 h-4" />
<Icon className="h-4 w-4" />
```

Common sizes: `size-3`, `size-4`, `size-5`, `size-6`, `size-8`, `size-12`

### Button Icons - No Margin Classes
**NEVER apply margin classes (`mr-*`, `ml-*`, `mx-*`, etc.) to icons inside Button components.** The Button component automatically handles icon spacing. Just add the icon without any margin:

```tsx
// ✅ CORRECT
<Button>
  <Plus className="size-4" />
  Add Item
</Button>

// ❌ WRONG - Do NOT add margin classes
<Button>
  <Plus className="size-4 mr-2" />
  Add Item
</Button>
```

### Spacing Classes - Use gap, Not space-x/space-y
**NEVER use `space-x-*` or `space-y-*` classes.** Always use `gap-*`, `gap-x-*`, or `gap-y-*` instead:

```tsx
// ✅ CORRECT - Use gap classes with flex
<div className="flex flex-col gap-4">
  <Item />
  <Item />
</div>

<div className="flex items-center gap-2">
  <Icon />
  <Text />
</div>

// ❌ WRONG - Do NOT use space-x or space-y
<div className="space-y-4">
  <Item />
  <Item />
</div>

<div className="flex items-center space-x-2">
  <Icon />
  <Text />
</div>
```

## UI Preferences

- **Do NOT wrap content in Card components** unless explicitly requested
- Tables and data lists should be rendered directly without Card wrappers
- Keep the UI clean and minimal - avoid unnecessary visual containers
- Use borders and spacing for visual separation instead of cards

## Design System

### Typography

**Page Headers:**
```tsx
<h1 className="text-2xl font-semibold text-foreground">Page Title</h1>
<p className="text-muted-foreground mt-1">Page description</p>
```

**Section Headers:**
```tsx
<h2 className="text-lg font-medium">Section Title</h2>
```

### Stat Cards

Use the `StatCard` component for displaying metrics consistently:

```tsx
import {
  StatCard,
  StatCardIcon,
  StatCardContent,
  StatCardLabel,
  StatCardValue,
} from '@/components/ui/stat-card';

<StatCard>
  <StatCardIcon variant="primary">
    <DollarSign className="size-5" />
  </StatCardIcon>
  <StatCardContent>
    <StatCardLabel>Total Revenue</StatCardLabel>
    <StatCardValue>$10,000</StatCardValue>
  </StatCardContent>
</StatCard>

// Icon variants: default, primary, success, warning, destructive, muted
// Value variants: default, positive, negative
```

### Empty States

Use the `Empty` component for empty states:

```tsx
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';

<Empty className="border border-border rounded-lg">
  <EmptyHeader>
    <EmptyMedia variant="icon">
      <TrendingUp />
    </EmptyMedia>
    <EmptyTitle>No data yet</EmptyTitle>
    <EmptyDescription>
      Add your first item to get started.
    </EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <Button onClick={handleAdd}>
      <Plus className="size-4" />
      Add Item
    </Button>
  </EmptyContent>
</Empty>
```

### Links as Buttons

When a link should look like a button, use the `Button` component with `asChild`:

```tsx
// ✅ CORRECT - Use Button with asChild for styled links
<Button asChild>
  <Link to="/destination">
    <Icon className="size-4" />
    Link Text
  </Link>
</Button>

// ❌ WRONG - Don't style links manually
<Link className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground...">
```

### Status Colors

The theme provides semantic color tokens. Use these for status indicators:

| Status | Background | Text Class |
|--------|------------|------------|
| Success/Positive | `bg-success/10` | `variance-positive` |
| Warning | `bg-warning/10` | `text-warning` |
| Error/Negative | `bg-destructive/10` | `variance-negative` or `text-destructive` |
| Info | `bg-info/10` | `text-info` |

### Icon Container Styling

Use `rounded-lg` for icon containers in stat cards and metrics:

```tsx
// ✅ CORRECT
<div className="p-2 bg-primary/10 rounded-lg">
  <Icon className="size-5 text-primary" />
</div>

// ❌ WRONG - Don't mix rounded-full and rounded-lg
<div className="p-2 bg-primary/10 rounded-full">
```

### Wide Tables

For tables with many columns (like monthly data), wrap in a scrollable container:

```tsx
<div className="overflow-x-auto scrollbar-thin">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="sticky left-0 bg-background z-10">Name</TableHead>
        {/* ... more columns */}
      </TableRow>
    </TableHeader>
    {/* ... */}
  </Table>
</div>
```

## shadcn/ui Components

**IMPORTANT: All components in `src/components/ui/` must be installed using the shadcn CLI. DO NOT manually write or edit these files.**

### Adding a new component

```bash
npx shadcn@latest add [component]
```

Example:
```bash
npx shadcn@latest add button
npx shadcn@latest add card dialog
```

### Overwriting/updating existing components

Use the `--overwrite` flag to update components to their latest version:

```bash
npx shadcn@latest add [component] --overwrite
```

### Common options

- `-y, --yes` - Skip confirmation prompt
- `-o, --overwrite` - Overwrite existing files
- `-a, --all` - Add all available components
- `-s, --silent` - Mute output

### Viewing available components

```bash
npx shadcn@latest search @shadcn
npx shadcn@latest view button card
```

### Why use the CLI?

- Ensures components are properly configured for the project
- Maintains consistency with shadcn/ui updates
- Automatically handles dependencies between components
- Preserves the intended component architecture
