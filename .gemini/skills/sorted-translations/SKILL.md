---
name: sorted-translations
description: Enforces alphabetical sorting of i18n JSON keys. Auto-sorts new entries, prevents merge conflicts.
---

# Alphabetically Sorted Translations

**Strict Rule:** All keys in translation files (`*.json` inside `i18n/` or `assets/i18n/`) must be stored in **strict alphabetical order**.

## Execution Guidelines
1.  **Insertion:** When adding new keys, insert them immediately in their correct alphabetical position.
2.  **Refactoring:** If a file is unsorted, execute the following Node.js script to normalize it automatically before saving. Do not manually reorder large files.

```javascript
const fs = require('fs');
const path = require('path');

// Target file (adjust path as needed)
const filePath = 'src/assets/i18n/en-US.json'; 
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const sorted = {};

// Sort keys alphabetically using localeCompare for proper character handling
Object.keys(data).sort((a, b) => a.localeCompare(b)).forEach(key => {
  sorted[key] = data[key];
});

fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + '\n');
console.log('Translation keys sorted successfully.');   