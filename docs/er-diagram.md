# Orbit Entity Relationship Summary

The authoritative model is `apps/api/prisma/schema.prisma`. This diagram shows aggregate ownership and the primary many-to-many joins without repeating every scalar field.

```mermaid
erDiagram
  User ||--o{ Session : has
  User ||--o{ RefreshToken : owns
  User ||--o| UserPreference : configures
  User ||--o{ OrganizationMember : joins
  Organization ||--o{ OrganizationMember : contains
  Role ||--o{ OrganizationMember : grants
  Role ||--o{ RolePermission : maps
  Permission ||--o{ RolePermission : maps

  Organization ||--o{ Invitation : issues
  Organization ||--o{ Team : contains
  Team ||--o{ TeamMember : contains
  User ||--o{ TeamMember : joins

  Organization ||--o{ Project : owns
  Project ||--o{ ProjectMember : contains
  User ||--o{ ProjectMember : joins
  Project ||--o{ ProjectTeam : includes
  Team ||--o{ ProjectTeam : assigned
  Project ||--o{ Board : has
  Board ||--o{ Column : has
  Board ||--o{ SavedFilter : stores
  User ||--o{ SavedFilter : owns
  Organization ||--o{ TaskStatus : defines

  Project ||--o{ Task : contains
  Board ||--o{ Task : displays
  Column ||--o{ Task : orders
  TaskStatus ||--o{ Task : classifies
  Task ||--o{ Task : parent_of
  Task ||--o{ TaskAssignee : assigns
  User ||--o{ TaskAssignee : receives
  Task ||--o{ TaskLabel : tags
  Label ||--o{ TaskLabel : tags

  Task ||--o{ Checklist : has
  Checklist ||--o{ ChecklistItem : contains
  Task ||--o{ Attachment : has
  User ||--o{ Attachment : uploads
  Task ||--o{ TimeEntry : tracks
  User ||--o{ TimeEntry : logs
  Task ||--o{ TaskActivity : records

  Task ||--o{ Comment : discusses
  Comment ||--o{ Comment : replies_to
  Comment ||--o{ CommentReaction : receives
  Comment ||--o{ CommentMention : mentions
  User ||--o{ Notification : receives
  Organization ||--o{ ActivityLog : records
  Organization ||--o{ AuditLog : audits
```

## Key invariants

- Organization membership is the root authorization context.
- Project membership can further constrain project access but cannot grant access across organizations.
- Board/column/task relations are validated together so a task cannot be moved into a column from another board or project.
- A task may have a parent task in the same project, enabling subtasks.
- Checklists are first-class task children; checklist items belong to one checklist.
- Saved filters are personal even when their target board is shared.
- Refresh, verification, reset, and invitation secrets are stored as hashes where the flow permits and have expiration/revocation state.
- Audit records preserve historical actor identifiers rather than cascading away the evidence.

See [DATABASE.md](DATABASE.md) for migration, concurrency, backup, and performance policy.
