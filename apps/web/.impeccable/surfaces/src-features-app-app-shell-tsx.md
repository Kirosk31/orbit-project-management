---
version: 1
slug: "src-features-app-app-shell-tsx"
primary_target: "src/features/app/app-shell.tsx"
related_targets: ["src/pages/app","src/features"]
---

## Scope

The authenticated Orbit app (shell, dashboard, boards in Kanban and list view, task detail, projects, organizations, notifications, profile) and the auth screens. Visitor mode: Operate. The public landing is a separate Persuade surface that inherits this world.

## Audience and task

Startup and SMB teams in Latin America (5–30 people, mixed roles) who keep Orbit open for hours: see what is theirs today, move cards across columns, comment, check what is late. Constraints live in PRODUCT.md.

## Direction contract

THESIS: A team's week is a panel of simple, repeated pieces set in calm order, the way Athos Bulcão built Brasília's walls from a handful of glazed tiles. Refuses the category default of a grey shadcn screen with one violet accent and a grid of KPI cards.

OWN-WORLD: Cool porcelain ground with white panels; a deep cobalt-ultramarine rail that holds navigation like a tiled wall; ochre reserved for "today" and attention; status and priority in their own semantic hues, always paired with an icon or text. Archivo (Omnibus-Type, Buenos Aires) carries every role with tabular figures, no monospace labels. Square-shouldered controls with one small radius, tonal layers instead of drop shadows.

STORY: Opening Orbit shows what needs you today; each project reads at a glance as a tile panel filling with finished work; moving a card or finishing a task glazes a tile.

FIRST VIEWPORT: Cobalt rail at left (workspace, navigation, recent projects, account at the foot). Top bar with breadcrumb and search that opens the command palette. Main column: "Today" heading, the assigned and due-soon task list first, project tile panels beside it, notifications below. Primary action "New task" at top right of the main column.

FORM: Athos Bulcão's modular azulejo panels, candidate 3 of 7 on my ordered list; signature move: project and board progress drawn as a tile panel, one tile per task, a quarter-circle module that rotates and glazes when the task is done. seed:d23f25ab644f8a0c

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Tenant branding editor is not built; the accent and rail tokens must stay swappable.
- Billing UI is out of scope for this redesign.
