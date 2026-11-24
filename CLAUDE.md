@AGENTS.md

## Comments

Read `docs/comments.md` before writing or editing comments in any language. In short:

- Comments stand on their own: reference only committed material (ADRs, `GLOSSARY.md`, code). `.scratch/` is gitignored, so state the reason itself instead of citing a spec, ticket, or section number.
- Comment the why; doc comments cover the what. Longer explanations go in banner blocks copied from `docs/comments/`.

## Version Control — Hands Off Git

**The developer owns the repository state. Never mutate it without explicit permission.**

Do **not** run, unprompted, any command that changes tracked history, the index, or the working tree:

- `git add` / `git rm` / `git restore` / `git checkout <path>` — the developer curates the staging area himself
- `git commit` (including `--amend`), `git revert`, `git reset`, `git stash`
- `git push`, `git pull`, `git merge`, `git rebase`, `git cherry-pick`, `git tag`
- `git branch` / `git switch -c` — do not create, rename, or delete branches
- `gh pr create` and any other command that publishes to the remote

Read-only inspection is always fine and encouraged — `git status`, `git diff`, `git log`, `git show`, `git blame`, `git ls-files`, `git stash list`. Use these freely to understand a change before working on it.

**Implicit permission** exists only when the task _is_ a git task. If the developer asks you to resolve merge conflicts, bisect a regression, fix a botched rebase, or clean up a branch, the write commands needed to carry that out are authorized by the request itself. Even then, prefer the least destructive option available, and say what you are about to do before running anything irreversible (`reset --hard`, `push --force`, history rewrites).

Everything else — staging, committing, pushing, branching, releasing — is the developer's job. If a change is finished and would normally be committed, simply say so and stop.
