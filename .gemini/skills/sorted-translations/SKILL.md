---
name: sorted-translations
description: Documents the mandatory pattern for keeping translation keys in alphabetical order.
---

# Alphabetically Sorted Translations

This application enforces a strict pattern for all localization/translation files (e.g., `en-US.json`, `es-MX.json`):

**Translation keys must always be stored in alphabetical order.**

## Why?
1. **Maintainability**: Sorting keys alphabetically makes it much easier for developers and translators to find specific entries, especially as the application grows.
2. **Merge Conflicts**: Alphabetical sorting significantly reduces the likelihood of git merge conflicts when multiple developers add new translations simultaneously.

## How to enforce this pattern:
Whenever you add or modify a translation key in the JSON files, make sure to insert it in its correct alphabetical position based on the key name.

If you are adding multiple keys or performing a large refactor, you can use a quick Node.js script to sort the entire file automatically:

```javascript
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('path/to/lang.json', 'utf8'));
const sorted = {};
Object.keys(data).sort().forEach(key => {
  sorted[key] = data[key];
});
fs.writeFileSync('path/to/lang.json', JSON.stringify(sorted, null, 2) + '\n');
```

*Always respect this ordering convention when working with the `i18n` directory.*
