# App Translation & Localization Guidelines (Skill)

When developing or modifying features in this application, you MUST follow these guidelines to ensure that all text is properly localized in all supported languages (`es-MX` and `en-US`).

## 1. Every text must have an "English translate key"
Do not hardcode strings directly in the HTML or TS files. **Every text that is not entered by the user must have its corresponding translate key**. 
**IMPORTANT**: Translation keys MUST be written in English using UPPER_SNAKE_CASE (e.g., `VEHICLES_CATALOG`, `SAVE_BUTTON`). Inside the codebase, you MUST NOT create or use translation keys in Spanish.
Every single static text shown to the user MUST use the `@ngx-translate/core` service or the `translate` pipe.
- **HTML Example**: `<ion-title>{{ 'VEHICLES' | translate }}</ion-title>`
- **TS Example**: `this.translate.instant('VEHICLES_CATALOG')`

## 2. Update All JSON Translation Files
Whenever a new text string is introduced to the application, you MUST update **all** supported language JSON files located in `src/assets/i18n/`.
- `src/assets/i18n/es-MX.json`
- `src/assets/i18n/en-US.json`

Failure to update these files will result in the application displaying the raw translation key instead of the translated value.

## 3. Keep Keys Consistent
Use English `UPPER_SNAKE_CASE` as the translation keys. Ensure that you provide the exact same key in both language files with its corresponding value.
- **Example (`es-MX.json`)**: `"VEHICLES_CATALOG": "Catálogo de Vehículos"`
- **Example (`en-US.json`)**: `"VEHICLES_CATALOG": "Vehicles Catalog"`

## 4. Verify Contexts
Always double-check that the translation matches the context of the screen (e.g., "Home" could mean "Casa" as in housing expenses, or "Inicio" as in dashboard. Ensure the translation matches the specific module's intent).
