---
title: "GitHub SpecKit vs OpenSpec vs mdspec: Which Spec Tool Is Right for You?"
description: "A clear-eyed comparison of three spec-driven tools — GitHub SpecKit, OpenSpec, and mdspec — covering what each does, who it's designed for, and how they fit together."
date: "2026-03-04"
---

# GitHub SpecKit vs OpenSpec vs mdspec

The shift toward **Spec-Driven Development (SDD)** has produced a new wave of tooling designed to help teams write better specifications before writing code. Three names that come up often are **GitHub SpecKit**, **OpenSpec**, and **mdspec**. They sound similar, but solve very different problems. Here's a breakdown.

---

## GitHub SpecKit

**What it is:** An open-source toolkit from GitHub designed to make software specifications *living, executable artifacts* that drive AI-assisted development. SpecKit's core premise is eliminating "vibe coding" — the ad-hoc back-and-forth where AI generates code from vague prompts.

**What it does:**
- Guides developers through a 4-step workflow: **Specify → Refine → Plan → Tasks**
- Generates structured spec documents that act as a single source of truth for AI coding assistants
- Works with multiple AI agents: GitHub Copilot, Claude Code, Gemini CLI, and others
- Introduces a **"constitution"** — a set of immutable project principles that keep the AI grounded across all phases
- Integrates directly with Git version control; specs evolve alongside the codebase

**Who it's for:** Development teams building software with AI coding assistants who want a disciplined, repeatable process for translating ideas into working code. SpecKit lives *inside the repository* and is used primarily by engineers.

---

## OpenSpec

**What it is:** A Node.js CLI tool that acts as an "engineering manual" for AI agents. OpenSpec maintains a central, unified specification document that both developers and AI assistants refer to before any code is written.

**What it does:**
- Enforces a structured 3-phase lifecycle: **Propose → Apply → Archive**
- On initialization, creates key configuration files (`project.md`, `AGENTS.md`) that give AI agents full project context — tech stack, architecture, coding style
- Archives completed specs and merges them back into a master `specs/` directory as an evolving source of truth
- Integrates with Cursor, Claude Code, GitHub Copilot and other editors via slash commands
- Installed globally via npm (`npm install -g @fission-ai/openspec@latest`)

**Who it's for:** Developers who want a structured, CLI-first workflow to keep AI agents consistently aligned with the project's technical constraints and coding patterns. Like SpecKit, OpenSpec lives close to the code and is built for engineers.

---

## mdspec

**What it is:** A platform for managing Markdown specification files as **standalone, shareable, and linkable assets** — independent of any code repository. Where SpecKit and OpenSpec are tools you use *within* your development workflow, mdspec is where your specifications *live and travel* beyond it.

**What it does:**
- Stores and versions Markdown spec files in a centralized, organized workspace
- Allows specs to be **removed from code repositories** while remaining permanently accessible via stable links
- Supports **folder-based organization** inside projects — accessible by clicking the project name on the dashboard or navigating from the organization page
- Enables sending specs directly to **security modeling teams**, **compliance teams**, or any external stakeholder — without giving them access to source code
- Integrates with project management tools (Jira, Linear, Confluence, Notion and more), so specs can trigger tickets, update wikis, or route into specialized compliance tools automatically
- Works alongside AI editors: agents can generate or update `.md` files, which are then published to mdspec for distribution and tracking

**Who it's for:** Teams who need specifications to *travel beyond the codebase* — to compliance reviewers, security auditors, product managers, and external partners. mdspec is the bridge between the technical world where specs are written and the organizational world where specs need to be consumed.

---

## Side-by-Side Comparison

| Feature | GitHub SpecKit | OpenSpec | mdspec |
|---|---|---|---|
| **Primary focus** | AI-assisted code generation | AI agent alignment & context | Spec lifecycle, storage & sharing |
| **Lives in** | Code repository | Code repository | Centralized platform (outside repo) |
| **Interface** | CLI + Git | CLI (npm) | Web platform + integrations |
| **AI coding support** | ✅ Core feature | ✅ Core feature | ✅ Complementary (AI writes specs) |
| **Cross-team sharing** | ❌ Engineer-focused | ❌ Engineer-focused | ✅ Core feature |
| **Compliance / security** | ❌ | ❌ | ✅ |
| **PM tool integrations** | ❌ | ❌ | ✅ Jira, Linear, Confluence, etc. |
| **Folder organization** | ❌ | ❌ | ✅ |
| **Repo de-cluttering** | ❌ | ❌ | ✅ |

---

## The Bottom Line

**GitHub SpecKit** and **OpenSpec** both solve the same foundational problem: keeping AI coding assistants focused and grounded within a well-defined technical specification during development. They are excellent tools for engineers who want structure in their AI-assisted code workflow.

**mdspec** solves a different, downstream problem: once those specs exist, *where do they go?* How do compliance and security teams access them? How do you prevent the repo from becoming a graveyard of obsolete `.md` files? How do you keep non-engineers in the loop?

In practice, the three tools are **complementary, not competing**. You might use SpecKit or OpenSpec to structure your development workflow with AI, and mdspec to manage, distribute, and track the resulting specifications across your entire organization.
