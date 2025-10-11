# Contributing to Zet Pay

Thank you for your interest in contributing! Please follow these guidelines to help us maintain a healthy and productive project.

## Code of Conduct
By participating, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Getting Started
- Fork the repository and clone your fork.
- Create a topic branch from `main`: `git checkout -b feat/your-feature`.
- Install dependencies: `npm install` (root) and `cd backend && npm install`.
- Run the app: backend `npm run dev` (port 9003), frontend `npm run dev` (port 9002).

## Development Standards
- Language/Framework: Next.js, React, TypeScript (frontend); Node/Express (backend).
- Linting/Formatting: Use the existing project config (ESLint/Prettier via Next.js defaults).
- UI: Follow existing patterns (shadcn/ui, Tailwind). Reuse components.
- Security: Never commit secrets. Use environment variables.
- Tests: Add tests where feasible; ensure typecheck and lint pass.

## Commit Messages
- Use concise, descriptive messages (present tense).
- Prefix optional: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `perf:`, `test:`.

## Pull Requests
- Keep PRs focused; include screenshots for UI changes.
- Ensure CI passes (typecheck/lint/build locally before opening PR).
- Reference related issues (e.g., `Closes #123`).
- Fill out the PR template.

## Issue Reporting
- Use the issue templates to file bugs and feature requests.
- Provide steps to reproduce, expected vs. actual behavior, and environment details.

## Branching & Releases
- Create feature branches from `main`.
- Use squash merge unless history needs to be preserved.

## Licensing
By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
