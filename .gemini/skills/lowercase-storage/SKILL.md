---
name: lowercase-storage-pascal-display
description: Enforces lowercase+trim storage in Dexie and PascalCase display via TitleCasePipe. Prevents data inconsistency.
---

# Pattern: Lowercase Storage & PascalCase Display

**Strict Rule:** All free-text fields (names, descriptions, notes, addresses) must follow this bidirectional flow:

## 1. Data Layer (Write)
Before saving to **Dexie**, text must be **trimmed** and converted to **lowercase**.
*   **Mandatory Tool:** Use exclusively the `toLower` function from `database.service.ts`.
*   **Prohibited:** Do not save raw text or use inline `.toLowerCase()`.

```typescript
// database.service.ts
export function toLower(value: string | undefined | null): string {
  return value?.trim().toLowerCase() ?? '';
}

// Usage in Services/Components
const payload = {
  name: toLower(this.form.value.name),
  description: toLower(this.form.value.description)
};
await this.db.items.add(payload);   