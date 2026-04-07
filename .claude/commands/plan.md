Read audit-report.md and our CLAUDE.md. Based on the audit, create a phased implementation plan for migrating this React web dashboard to React Native / Expo, saved as migration-plan.md. Do not write any code yet.
The plan should:

Order components by complexity (Low → Medium → High)
Group related components into logical phases (e.g. navigation setup, core screens, data layer, security)
Flag any dependencies between components (e.g. "X must be built before Y")
Note which web libraries need replacing and what their RN equivalents are
Identify the SQLite schema work as its own phase, to be done before any screens that depend on data
