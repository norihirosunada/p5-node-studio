# Code Style and Conventions

## Language
- **TypeScript**: Used for all logic. Strict mode seems enabled (implied by `strict` or similar in `tsconfig` usually, though `tsconfig.json` didn't explicitly show `strict: true` but `skipLibCheck: true` and `isolatedModules: true` are there. `allowJs: true` suggests some flexibility).
- **React**: Functional components with Hooks. React 19.

## Styling
- **Tailwind CSS**: Utility-first CSS framework.

## Naming Conventions
- **Files**: PascalCase for React components (e.g., `App.tsx`), camelCase for utilities/hooks (likely, though not fully verified).
- **Components**: PascalCase.

## Structure
- Flat structure in root for main files (`App.tsx`, `index.tsx`).
- `components/` for reusable UI parts.
- `utils/` for helper functions.
- `services/` for business logic/services.

## Imports
- Absolute imports using `@/` alias mapping to the project root.
