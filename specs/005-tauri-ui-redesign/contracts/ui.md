# UI Contract

Components will expose standard props to maintain reusability.

```typescript
export interface BaseComponentProps {
  className?: string; // For Tailwind class merging using `cn()`
  children?: React.ReactNode;
}
```
