# Comments

How code in this repo is commented. Banner templates, one file per comment syntax, live in [`comments/`](comments/).

## Rules

1. **Comments stand on their own.** A reader with a fresh checkout must understand every comment. Point only at what is committed: ADRs (`docs/adr/0007`), `GLOSSARY.md` terms, other code. `.scratch/` is gitignored, so specs, tickets and their section numbers ("spec §9", "ticket 19") lead nowhere for anyone else. State the fact or the reason itself instead.
2. **Comment the why.** Explain intent, constraints, trade-offs, non-obvious consequences, and the reasons a simpler-looking alternative was rejected. Well-named code already says what it does, so line-by-line narration adds noise.
3. **Doc comments describe the what.** Python docstrings, TSDoc: these state what an item does and its contract. Keep them.
4. **Short why: one `//` line. Long why or wider context: a banner block.** When an explanation needs more than two or three lines, or frames a whole region of code, use a text-block banner (below).

## Banners

Copy banners from the template for the file's language; do not draw them by hand. Every banner ends at **column 99**: pick the variant matching the indentation (indent 0 / 4 / 8 / 12 → width 99 / 95 / 91 / 87). Titles are UPPER CASE and centred. Leave a blank line after every banner.

### Section banners

Split a file into named regions. Fill sets the level: `=` (heaviest, top-level sections of the file) → `~` → `-` (nested sections, e.g. inside an `impl` or a long function).

| Family    | Look                                 | Use                                                                                                                                                                             |
| --------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary   | `//~===~//` rules, `//$ TITLE $//`   | Default for free-form sections: `TYPES`, `HELPERS`, `CONFIG`, `TESTS`.                                                                                                          |
| Alternate | `//\|===\|//` rules, `//? TITLE ?//` | A file's fixed scaffold that repeats across similar files (e.g. every handler file has `VALIDATION` / `HANDLERS` / `DOCUMENTATION`), so it reads apart from free-form sections. |
| Minor     | `///===///`, `/// TITLE ///`         | Lightest grouping inside a section.                                                                                                                                             |

Untitled dividers (`//?===?//`, `//|===|//`, `///===///`) separate groups of related items, e.g. clusters of constants, when a name would add nothing.

Do not mix families for the same level within one file.

### Text-block banners

Carry the longer explanations. Body lines start with the body marker (`//#` in `//` languages) and wrap before column 99.

| Banner             | Marker     | Use                                                    |
| ------------------ | ---------- | ------------------------------------------------------ |
| `NOTE`             | plain `//` | Background context; nice to know, safe to skip.        |
| `IMPORTANT INFO`   | `?`        | Context a reader needs before changing the code below. |
| `EXTENDED SECTION` | `~` / `$`  | A section banner that also explains the section.       |
| `WARNING`          | `§`        | An easy-to-break contract or an obligation on callers. |
| `DANGER`           | `!`        | Getting it wrong costs security, data, or money.       |

Replace the placeholder title (`NOTE`, `IMPORTANT INFO`, …) with a specific one (`WHY THE LISTENER BINDS BEFORE HEALTH`) when that says more.

## Per-language templates and gotchas

| Template                                | Languages                             | Gotchas                                                                       |
| --------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------- |
| [`comments.ts`](comments/comments.ts)   | TypeScript, JavaScript                | TSX: banners only outside JSX markup.                                         |
| [`comments.py`](comments/comments.py)   | Python, shell, YAML, TOML, Dockerfile | Dockerfile parser directives (`# syntax=`) and shell shebangs stay on line 1. |
| [`comments.sql`](comments/comments.sql) | SQL                                   | ..                                                                            |

Markers in the `#` and `--` templates mirror the `//` ones: `//~` → `#~` / `--~`, `//#` → `##` / `--#`, `///` → `##` / `---`.

## Editor highlighting

The markers (`!`, `?`, `#`, `$`, `§`, `|`, `~`) are [Better Comments](https://marketplace.visualstudio.com/items?itemName=aaron-bond.better-comments) tags, coloured by `better-comments.tags` in `.vscode/settings.json`.
