### Update
24 Oct 2026
Started to code this app up using SuperGrok but it failed miserably.
Switched to ChatGPT (free codex version) and it did a splendid job.
For now the code lives on my PC. I may upload it into this repo at some point.

-------------------------------------------------

# Read Family Tree

Interactive genealogy visualization webapp (v0.01).

## Features

- Hierarchical family tree (older generations above, younger below)
- Light and dark colour themes (toggle in header; preference saved)
- Right-click a person to:
  - Set as "Me" (view zooms in to that person on next load / current session)
  - Edit properties (DOB, birth location, DOD, death location, death reason, gender)
  - Add child, parent, or sibling
- Zoom and pan (mouse wheel / drag)
- If no "Me" set, view fits the entire tree
- Data stored in browser localStorage (persists across sessions)
- Export current tree as JSON
- Reset to initial seed data
- Initial seed data drawn from family emails (Donald Utton / half-brother, etc.)

## Usage

Open `index.html` (or the GitHub Pages site once enabled) in a browser.

- Right-click any person for the context menu.
- Use the theme toggle.
- "Set as Me" stores the choice in sessionStorage so the view starts zoomed to that person.

## Data

People are stored as a flat array of objects with `id`, `name`, `dob`, `birthLoc`, `dod`, `deathLoc`, `deathReason`, `gender`, and `parentIds` (array).

Layout uses the first parent for the hierarchical tree (simple for v0.01). Marriage/spouse links planned for later.

## Deployment

This is a static site. Enable GitHub Pages from the main branch (root) to host at `https://mfread.github.io/read-family-tree/`.

## Version

0.01 — first attempt.

## Future ideas

- Spouse / marriage links and multi-parent layout
- Photos on nodes
- Search / filter
- Collapse / expand branches
- Import GEDCOM
- Shared editing (auth) if desired
- More precise dates and locations from further research
