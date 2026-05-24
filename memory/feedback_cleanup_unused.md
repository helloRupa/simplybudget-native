---
name: feedback_cleanup_unused
description: Remove unused imports, variables, and parameters after adding or modifying code
metadata:
  type: feedback
---

After adding or modifying code, remove any imports, variables, or parameters that are no longer used — don't leave them in as scaffolding.

**Why:** Caught an unused `act` import left in `__tests__/settings.test.tsx` after implementation.

**How to apply:** Before finishing any code change, scan the modified files for unused imports or dead variables and remove them.
