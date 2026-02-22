# Contributing to MDSpec

First off, thank you for considering contributing to MDSpec! It's people like you that make MDSpec a great tool for everyone.

## Where do I go from here?

If you've noticed a bug or have a feature request, please make sure to check if there is an existing issue. If not, feel free to open one.

## Setting up the development environment

### Prerequisites

- Node.js (v18 or higher recommended)
- npm, yarn, pnpm, or bun

### Local Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/mdspecdev.git
   cd mdspecdev
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up local environment variables:**
   Copy `.env.example` to `.env.local` and fill in necessary values (e.g., Supabase credentials).

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## Workflow

1. **Branching:** Create a new branch for your feature or bugfix from `main`.
2. **Making Changes:** Make your changes, following the existing code style.
3. **Commit Messages:** Write clear and concise commit messages.
4. **Pull Request:** Open a pull request against the `main` branch. Provide a clear description of the changes you've made.

## Guidelines

- Follow the established architecture and components.
- Make sure all new features are accompanied by appropriate test cases (if applicable).
- Adhere to the formatting and linting rules defined in the project.

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.
