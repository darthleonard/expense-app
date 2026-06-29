---
name: lowercase-storage-pascal-display
description: Documents the mandatory pattern for storing text data in lowercase and displaying it in Pascal case across the application.
---

# Lowercase Storage & Pascal Case Display Pattern

This application enforces a strict pattern for all free-text fields (e.g., names, descriptions, addresses, notes):

1. **Storage Layer**: Text must be **trimmed** and converted to **lowercase** before saving to the Dexie database.
2. **Presentation Layer**: Text must be displayed in **Pascal case** (Title Case) on the UI.

This separation of concerns ensures uniform data within the database (useful for querying, sorting, and future migrations) while presenting a clean, user-friendly aesthetic on the front end.

## 1. The `toLower` Utility
The core rule is implemented as a single, exported pure function in `database.service.ts`:

```typescript
/** Normalizes a user-entered string for storage: trimmed + lowercase. */
export function toLower(value: string | undefined | null): string {
  return value?.trim().toLowerCase() ?? '';
}
```

**Always** import and use this function in the service layer or page components when preparing payloads to save to Dexie.

## 2. Implementing the Save Logic
When inserting or updating records, map the text fields through `toLower()`.

**Example:**
```typescript
import { toLower } from '../core/services/database.service';

async saveItem() {
  if (!this.currentItem.name.trim()) return;
  
  const payload = {
    ...this.currentItem,
    name: toLower(this.currentItem.name),
    description: toLower(this.currentItem.description)
  };
  
  await this.db.items.add(payload);
}
```

## 3. Implementing the Presentation Logic
Do not write custom `.toTitleCase()` logic. Instead, use Angular's built-in `TitleCasePipe` (`| titlecase`) directly in the templates.

**Example:**
```html
<ion-item>
  <ion-label>
    <h2>{{ item.name | titlecase }}</h2>
    <p *ngIf="item.description">{{ item.description | titlecase }}</p>
  </ion-label>
</ion-item>
```

## Important Exceptions
Do **not** apply this pattern to:
- **Enum values / Internal identifiers** (e.g., `type: 'casa'`, `status: 'activa'`, `category: 'gasto_fijo'`). These are translated via the `| translate` pipe.
- **IDs or purely numeric strings** (e.g., barcodes).
- **Date ISO strings**.

*Always follow this pattern when adding new features or modules to the application.*
