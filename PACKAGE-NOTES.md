# Package contents and operating notes

- `START-HERE.md`: short execution checklist and human responsibilities.
- `WINDOWS-SETUP.md`: clean Windows installation, GitHub setup and Copilot launch.
- `AGENTS.md`: standing rules for all coding-agent work, including secure automatic commit/push.
- `.github/copilot-instructions.md`: Copilot entrypoint that points to `AGENTS.md`.
- `.github/prompts/p01...p11.prompt.md`: the 11 source prompts in Claude's specified order, with the commit policy adapted for this workflow.
- `MASTER-PROMPT.md`: paste once into Copilot Agent to orchestrate the 11 prompts sequentially.
- `RESUME-PROMPT.md`: resume after session/request limits without repeating completed work.
- `docs/design-brief.md`: the project brief embedded in the source Prompt 1.

## Important Copilot detail
VS Code has multiple agent harnesses. The `.prompt.md` files are kept in the standard `.github/prompts/` location and have prompt-file frontmatter, but prompt-file slash-command execution is currently documented for the Local harness. This package does **not** depend on slash commands: use `MASTER-PROMPT.md` by copying it into GitHub Copilot Agent Chat; it tells the agent to read each numbered file from the workspace.

## Source fidelity and deliberate adaptations

1. The implementation order, scope, technology pins, business rules, test expectations and 11 tasks come from the supplied 81-page Claude plan.
2. The original prompt working agreements said “Do not commit; I will”, which conflicts with the user's requested automation. Those lines are overridden by `AGENTS.md`: one commit per successful checkpoint and push to `origin/feature/copilot-build`.
3. P01 is adapted to preserve the supplied starter `AGENTS.md` rather than overwriting its safety policy.
4. P02's Prisma schema block is reflowed into valid, readable Prisma syntax because PDF extraction split tokens and lines. The fields and mappings follow the schema in Part 5.
5. P11 is adapted to clone the GitHub feature branch, never force-push or push main, and never delete Docker volumes.
6. The PDF text extraction split two `.env.example` URLs across lines; these are rejoined in P01 so the generated environment file contains valid PostgreSQL URLs. The PDF also has a malformed timestamp in P03 (`2026-1029`); this is corrected to `2026-10-29`, consistent with the rest of the plan. The brief has one truncated date-format label (`YYYY-MMDD`); actual API examples and date semantics in the same source use `YYYY-MM-DD`, so implementation and OpenAPI must use the hyphenated ISO date.
7. The setup guide creates a one-time baseline commit on `main` containing only the starter pack, then branches `feature/copilot-build`; otherwise an empty remote would not have a `main` branch to target in the final PR. The coding agent itself is prohibited from pushing to or merging `main`.
8. Human-only steps remain: Windows reboot/WSL setup, authentication, creating `.env`, approving privileged or network actions, reviewing the work, writing truthful personal AI-collaboration reflections, merging the PR and recording the video.

The source plan itself contains a time estimate of 11 prompts at 30–60 minutes each, excluding the clean-machine setup and video work. See `START-HERE.md` for a practical schedule.
