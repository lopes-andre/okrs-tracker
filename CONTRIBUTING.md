# Contributing to OKRs Tracker

Thank you for your interest in contributing to OKRs Tracker! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Be kind, constructive, and patient with others.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/okrs-tracker.git
   cd okrs-tracker
   ```
3. **Set up development environment**:
   ```bash
   npm install
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```
4. **Create a branch** for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```

See [Getting Started Guide](./docs/getting-started.md) for detailed setup instructions.

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

| Prefix | Use Case | Example |
|--------|----------|---------|
| `feature/` | New functionality | `feature/task-recurrence` |
| `fix/` | Bug fixes | `fix/login-redirect` |
| `docs/` | Documentation | `docs/api-reference` |
| `refactor/` | Code improvements | `refactor/progress-engine` |
| `test/` | Test additions | `test/hook-coverage` |

### Making Changes

1. **Write code** following our conventions (see below)
2. **Add tests** for new functionality
3. **Run tests** to ensure nothing breaks:
   ```bash
   npm run test:run
   ```
4. **Run linting** to check code style:
   ```bash
   npm run lint
   ```
5. **Build** to verify no TypeScript errors:
   ```bash
   npm run build
   ```

### Commit Messages

Write clear, descriptive commit messages:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code change (no new feature or fix)
- `test`: Adding tests
- `chore`: Maintenance

**Examples**:
```
feat(tasks): add recurring task support

fix(auth): handle expired session redirect

docs(readme): update installation instructions

refactor(progress-engine): simplify pace calculation
```

### Pull Requests

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub with:
   - Clear title describing the change
   - Description of what and why
   - Link to related issues (if any)
   - Screenshots for UI changes

3. **Respond to feedback** and make requested changes

4. **Squash commits** if requested before merge

## Code Conventions

### TypeScript

- **Strict mode** is enabled - all code must pass type checking
- Use **explicit types** for function parameters and return values
- Prefer **interfaces** over type aliases for object shapes
- Use **type imports** when only importing types:
  ```typescript
  import type { Task } from "@/lib/supabase/types";
  ```

### React Components

- Use **functional components** with hooks
- **"use client"** directive for client components
- **Props interfaces** defined inline or co-located:
  ```typescript
  interface TaskCardProps {
    task: Task;
    onEdit?: () => void;
  }

  export function TaskCard({ task, onEdit }: TaskCardProps) {
    // ...
  }
  ```

### File Organization

- **Co-locate tests** with source files: `foo.ts` → `foo.test.ts`
- **Feature modules** in `src/features/` with `api.ts` and `hooks.ts`
- **Components** organized by domain in `src/components/`

### Styling

- Use **Tailwind CSS** classes
- Use **cn()** utility for conditional classes
- Use **design tokens** instead of arbitrary values:
  ```tsx
  // Good
  className="text-text-muted bg-bg-1"

  // Avoid
  className="text-gray-500 bg-gray-100"
  ```

### Testing

- Write tests for **new functionality**
- Use **factories** for test data (see `src/test/factories/`)
- Follow existing **test patterns** (see [Testing Guide](./docs/testing.md))
- Aim for **80%+ coverage** on new code

## What to Contribute

### Good First Issues

Look for issues labeled `good first issue` - these are suitable for newcomers.

### Feature Requests

Before implementing a major feature:
1. Check if there's an existing issue
2. Open a new issue to discuss the approach
3. Wait for feedback before starting work

### Bug Reports

When reporting bugs, include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/environment details
- Screenshots if relevant

### Documentation

Documentation improvements are always welcome:
- Fix typos
- Clarify confusing sections
- Add missing information
- Update outdated content

## Database Changes

If your contribution requires database changes:

1. **Create a new migration**:
   ```bash
   supabase migration new your_migration_name
   ```

2. **Follow conventions**:
   - Include RLS policies
   - Add indexes for queried columns
   - Add timestamp triggers
   - Document with comments

3. **Update TypeScript types** in `src/lib/supabase/types.ts`

4. **Test thoroughly** with `supabase db reset`

## Getting Help

- Check existing documentation in `docs/`
- Search existing issues
- Ask questions in your PR
- Open a discussion for general questions

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.

---

Thank you for contributing!
