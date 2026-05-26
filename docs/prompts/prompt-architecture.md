# Prompt Architecture

## Purpose

Define prompt patterns for internal copilots/assistants so responses stay consistent, safe, and task-oriented.

## Prompt Layers

1. System intent: role, safety, and constraints
2. Project context: product goals and technical stack
3. Task context: current objective and acceptance criteria
4. Output contract: required format and completion checks

## Design Rules

- Keep prompts explicit and versioned.
- Prefer short constraints over long prose.
- Include edge cases in task prompts.
- Require actionable outputs instead of generic advice.

## Maintenance

- Review prompt templates monthly.
- Track regressions and update prompts with examples.
