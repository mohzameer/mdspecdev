# MDSpec

MDSpec is an open-source project to manage, review, and collaborate on markdown-based specifications. It features a robust Next.js Web UI, seamless integrations, and a VS Code extension for developers.
Note that MDSpec tracks specifications in parallel to Git—it does not integrate directly with or replace your git repository.

**Hosted Version:** [https://mdspec.dev](https://mdspec.dev)

## Features

- **Document Management**: Create, view, and organize your specifications in projects.
- **Collaboration**: Comment and resolve feedback directly in your markdown specifications.
- **[VS Code Extension](https://github.com/mohzameer/mdspecvscode)**: Connect your editor to your specs for a native developer experience.
- **[CLI Tool](https://github.com/mohzameer/mdspecdevcli)**: Command-line interface for integrating specifications with your local development workflows.
- **Authentication & Security**: Robust role-based access control and user management.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Roadmap

We have exciting plans for the future of MDSpec! Our current roadmap includes:


- **Moved File Tracking**: Enhancing our tracking system to gracefully handle specification files that are moved or renamed across directories.
- **Identifying Integration Potentials**: Expanding the ecosystem by continuously identifying new, high-leverage integration opportunities.
- **Project Management Tools Integrations**: Integrate directly with popular project management tools (e.g. Jira, Linear, ClickUp).
- **CLI Testing**: Implementing comprehensive CLI testing tools to ensure robustness across all operations.
- **GitHub Integrations**: Connect seamlessly with GitHub for streamlined workflows.
- **Deep & Intuitive UX for VS Code Forks**: Enhancing the user experience for our VS Code forks, making interactions smoother and more powerful for developers.
- **Advanced Web UI Features**: Adding more advanced features on the Web UI for deeper specification management, viewing, and interaction.

## Contributing

We welcome contributions from the community! Whether it's adding a new feature, fixing a bug, or improving the documentation, please feel free to help out. 

Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Code of Conduct

This project has adopted the Contributor Covenant Code of Conduct. For participation in our community, read the full [Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT
