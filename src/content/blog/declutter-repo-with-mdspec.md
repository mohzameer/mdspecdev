---
title: "De-cluttering Repositories: Using mdspec for Safe Markdown Lifecycle Management"
description: "Learn how to use mdspec to safely track, link, and remove ever-increasing Markdown files from your core code repositories, while perfectly integrating with modern project management tools."
date: "2026-03-03"
---

# Taming the Markdown Menace in Code Repositories

As development teams grow, so does their documentation. What starts as a simple `README.md` and `CONTRIBUTING.md` can rapidly evolve into hundreds of Markdown specifications, ADRs (Architecture Decision Records), API drafts, and product specs. Before long, these `.md` files clutter the core code repository, muddy search results, and make git history unwieldy.

But they serve a critical purpose. Technical specs need to exist close to the code, at least initially, so how do we balance visibility while de-cluttering the repo?

Enter **mdspec**.

## The Problem: The Ever-Increasing Payload

A modern repository doesn’t just hold code; it holds context. Developers naturally reach for Markdown because it renders well on GitHub or GitLab and works cleanly with local IDEs.

However, once a specification turns into a finalized, deeply complex system topology or a dense compliance requirement, storing it in the core development repository introduces several issues:
- **Git Bloat:** A huge number of revision histories for mere text documents.
- **Search Clutter:** IDE searches pulling up spec files instead of operational code lines.
- **Audience Mismatch:** Project managers and external stakeholders are forced to sift through source control tools to find specs.

## mdspec: Safe Storage, Smart Removal

The core philosophy of using **mdspec** is to give Markdown specifications a dedicated lifecycle workflow.

Instead of keeping `.md` files permanently entombed alongside your code, you can use mdspec to temporarily track draft files within the repo safely. Once finalized, you can officially "extract" or download them, host them in a centralized specification repository or document store via mdspec, and **remove them from the core codebase.**

Rather than permanently losing the context, mdspec provides a secure linkage. You simply leave behind a persistent `mdspec` link. When a developer needs the deeply technical context of an architecture decision, they follow the link directly to the tracked, centralized specification.

## Seamless Project Management Integrations

De-cluttering the repo doesn't just mean moving the files somewhere blind; it means moving them somewhere structured.

With mdspec, your specifications aren’t disconnected assets—they are active payloads capable of interacting with your company's broader operational stack. 

You can configure mdspec to push or request integrations with any project management tool. For instance:
- **Jira / Linear:** When an architecture spec is uploaded or modified, a new ticket update is automatically triggered via mdspec webhooks.
- **Confluence / Notion:** Seamlessly publish the isolated `.md` specs into internal wikis.
- **Custom Tools:** Using mdspec integrations, raw Markdown (including YAML frontmatter metadata) can route directly into whatever specialized compliance or task-tracking tool you prefer.

## Organizing Specs with Folders

As your centralized mdspec workspace grows, organizing specs becomes just as important as storing them. mdspec lets you create **folders** to group related documents together — by team, product area, release cycle, or any structure that fits your workflow.

To create and manage folders, simply navigate to your project:
- **From the Dashboard:** Click on the project name to open the project view, where you can create and manage folders directly.
- **From the Organization Page:** Go to your organization, find the project, and open it to access the same folder management interface.

This means your extracted specs don't just land in a flat list — they stay neatly organized, making it easy for any team member (or external stakeholder) to find exactly what they need without rummaging through hundreds of loose files.

## Conclusion

Managing the sheer mass of Markdown specifications doesn't have to ruin your code repository experience. Use your core repo as the sandbox, and use **mdspec** as your ultimate source of truth, archive, and dispatcher. Clean your codebases, protect your context, and power your project management all at once.
