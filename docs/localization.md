# Localization

Orbit uses English as the source language for code, identifiers, comments, API contracts, documentation, and translation keys. User-facing content is localized through `i18next` and `react-i18next`.

## Supported locales

| Identifier | Native label       | Formatting locale |
| ---------- | ------------------ | ----------------- |
| `en`       | English            | `en-US`           |
| `es`       | Español            | `es-419`          |
| `fr`       | Français           | `fr-FR`           |
| `pt-BR`    | Português (Brasil) | `pt-BR`           |

`packages/shared/src/locales.ts` is the source of truth for accepted locale identifiers. The same union is used by the API preference schema and the web application.

## Resolution and persistence

On an anonymous visit, Orbit resolves a locale in this order:

1. A valid locale stored under `orbit.language`.
2. The first supported language or language family in `navigator.languages`.
3. English.

For authenticated users, the stored account preference takes precedence after session bootstrap. A locale change is applied optimistically and persisted through `PATCH /users/me/preferences`; the client restores the previous locale if the request fails.

Every successful change updates i18next, local storage, and the document's `lang` attribute. Date and relative-time formatters receive the active locale. English is bundled as the fallback; every additional catalog is loaded on demand and cached by the browser. All currently supported languages use left-to-right direction; a future right-to-left locale must add direction metadata and visual regression coverage.

## Adding a locale

1. Add its canonical identifier to `SUPPORTED_LOCALES` in the shared package.
2. Add native label and `Intl` metadata to `locale-options.ts`.
3. Add a complete dictionary under `apps/web/src/locales` with the exact English key structure and interpolation placeholders.
4. Register the resource in `apps/web/src/lib/i18n.ts`.
5. Update the OpenAPI enum and this document.
6. Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.

The i18n test suite rejects missing keys, extra keys, empty translations, unknown persisted locale values, and incorrect regional resolution.
