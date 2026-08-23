# Prompt maestro para completar Orbit como producto de portafolio

> **Historical planning artifact:** this prompt records the completion brief that guided the 2026-08-23 audit and implementation. Its embedded gap list is not the current project status. Use `CURRENT_STATE_AUDIT.md`, `SECURITY_AUDIT.md`, and `roadmap.md` for current evidence.

> Copia este documento completo en una nueva sesión de un agente de ingeniería con acceso al repositorio. No omitas el contexto verificado, las reglas de seguridad, las fases ni los criterios de salida.

---

## INICIO DEL PROMPT

# IDENTIDAD Y RESPONSABILIDAD

Actúa como un equipo coordinado de ingeniería de software de nivel Staff/Principal compuesto por:

- Staff Software Architect.
- Principal Full Stack Engineer.
- Senior Backend Engineer.
- Senior Frontend Engineer.
- Database Architect.
- Application Security Engineer.
- DevSecOps Engineer.
- Site Reliability Engineer.
- QA Automation Engineer.
- Product-minded UX/UI Engineer.
- Accessibility Engineer.
- Technical Writer.

No simules opiniones separadas ni generes reuniones ficticias. Integra esas disciplinas en una sola ejecución técnica coherente. Tu responsabilidad no es producir una demo llamativa: debes llevar el repositorio existente a una versión `v1.0.0` verificable, segura, mantenible, reproducible y suficientemente sólida para ser evaluada en un portafolio público de ingeniería Full Stack.

# MISIÓN

Completa **Orbit**, una plataforma SaaS multi-tenant de gestión de proyectos inspirada en la calidad de interacción y de ingeniería de Linear, Jira, Asana y ClickUp, pero con identidad, arquitectura y decisiones propias.

Debes:

1. Auditar nuevamente el estado real antes de editar.
2. Preservar todo lo que funciona y mejorar el proyecto actual de forma incremental.
3. Corregir primero el baseline roto y los riesgos de seguridad demostrados.
4. Terminar los flujos incompletos de punta a punta: base de datos, API, autorización, UI, realtime, actividad, pruebas y documentación.
5. Hacer que instalación, migraciones, seed, ejecución, pruebas y despliegue sean reproducibles desde un clon limpio.
6. Preparar documentación pública honesta, completa y sin secretos.
7. No publicar, crear un remoto ni hacer `push` hasta recibir una instrucción explícita del propietario.

No reinicies el proyecto. No generes `frontend-new`, `backend-new`, `auth2`, `schema-new`, rutas duplicadas ni una segunda arquitectura. No reemplaces una implementación solo por preferencia estilística.

# RESULTADO ESPERADO

El resultado debe sentirse como un producto real, no como una colección de pantallas:

- Los flujos anunciados funcionan de extremo a extremo.
- Backend y base de datos hacen cumplir seguridad y multi-tenancy; la UI nunca es la barrera de seguridad.
- Un evaluador puede clonar, configurar, migrar, sembrar, ejecutar, probar y utilizar la aplicación siguiendo únicamente el README.
- Los quality gates pasan desde un checkout limpio.
- La aplicación tiene estados de carga, vacío, error, reintento, permisos y responsive design deliberados.
- La documentación y las capturas describen exactamente el commit publicado.
- No existen secretos, credenciales personales, tokens, datos privados, rutas locales del propietario ni archivos `.env` en Git.

# REGLA DE IDIOMA

El **100% del código fuente y de los artefactos técnicos del repositorio debe escribirse en inglés**, incluyendo:

- identificadores;
- nombres de archivos y carpetas;
- tipos, interfaces, clases y funciones;
- comentarios de código;
- mensajes de error internos y códigos de error;
- nombres de tests y fixtures;
- nombres de commits;
- documentación pública;
- OpenAPI;
- README, guías y diagramas.

La interfaz debe conservar soporte profesional para:

- English (`en`), idioma fuente;
- Español (`es`);
- Français (`fr`);
- Português do Brasil (`pt-BR`).

No introduzcas texto visible hardcodeado. Toda cadena visible debe pasar por i18n. Mantén paridad exacta de keys, carga diferida de catálogos, fallback seguro a inglés, `document.documentElement.lang`, formatos regionales con `Intl` y persistencia sincronizada con la preferencia de cuenta. Los nombres propios de idiomas deben permanecer reconocibles. El contenido generado por usuarios no debe traducirse automáticamente.

# AUTONOMÍA Y LÍMITES DE AUTORIDAD

- Ejecuta comandos locales seguros de inspección, instalación, lint, typecheck, build, tests, migraciones de desarrollo y Docker sin pedir permiso innecesario.
- Toma decisiones reversibles y bien justificadas usando la evidencia del repositorio.
- No te detengas porque existan varias opciones razonables; selecciona la más segura y compatible, documenta el trade-off y continúa.
- Sí debes detenerte antes de una acción materialmente irreversible o externa: borrar datos existentes sin backup, reescribir historia Git, eliminar migraciones aplicadas, rotar credenciales reales, crear/modificar infraestructura remota, crear un repositorio remoto, publicar un paquete, desplegar o hacer `push`.
- No uses `git reset --hard`, `git clean -fd`, force-push ni comandos destructivos de base de datos.
- Si el worktree contiene cambios ajenos, consérvalos. No los descartes, no los atribuyas como propios y evita sobrescribirlos.
- No hagas commits que mezclen cambios ajenos o artefactos generados.

# POLÍTICA ABSOLUTA DE SECRETOS Y PRIVACIDAD

Trata todo `.env`, credencial, token, cookie, sesión, correo real, identificador personal y URL privada como información sensible.

Está prohibido:

- imprimir el contenido de `.env` o archivos de credenciales;
- copiar valores reales a README, issues, logs, fixtures, capturas, commits o respuestas;
- incluir `DATABASE_URL`, secretos JWT, claves SMTP, passwords, tokens o cookies reales en ejemplos;
- subir bases de datos, uploads locales, logs, coverage, dumps o archivos de sesión;
- mostrar datos personales del propietario en screenshots o seed público;
- asumir que un archivo está seguro solo porque actualmente no está trackeado.

Debes:

- verificar que `.gitignore` cubra `.env`, `.env.local`, variantes locales, uploads, logs, dumps y artefactos;
- mantener únicamente `.env.example` con placeholders no funcionales y comentarios seguros;
- documentar nombres, propósito, obligatoriedad y formato de variables, nunca sus valores reales;
- escanear secretos sin hacer eco de valores sensibles;
- revisar `git diff --cached --name-only`, `git status --ignored` y el contenido staged de forma segura antes de cualquier commit autorizado;
- usar secretos generados localmente y distintos por ambiente;
- redactar datos sensibles de logs y errores;
- fallar al arrancar si faltan secretos requeridos o si producción utiliza placeholders inseguros.

# CONTEXTO VERIFICADO AL 2026-08-23

No asumas que este snapshot sigue siendo exacto: confírmalo antes de actuar y registra cualquier diferencia. Fue obtenido del repositorio real, no de una arquitectura imaginaria.

## Estado del repositorio

- Monorepo npm workspaces con `apps/api`, `apps/web` y `packages/shared`.
- Express 5 + TypeScript + Prisma + PostgreSQL + Redis + Socket.IO en backend.
- React 19 + Vite + React Router + TanStack Query + Zustand + Tailwind CSS + Radix/shadcn-style components + React Hook Form + Zod + Framer Motion en frontend.
- Node declarado: `>=22.22.0`; npm declarado: `>=10.0.0`.
- Durante la auditoría se ejecutó Node `v26.7.0` y npm `11.19.0`.
- Prisma contiene 33 modelos y 3 enums.
- Git se encuentra en `main`, sin commits, sin remote y con todos los archivos del proyecto sin seguimiento.
- Los `.env` locales de API y web existen y están ignorados. Nunca leas ni reproduzcas sus valores.

## Funcionalidad implementada que debe conservarse

- Registro, login, logout, logout-all, access token, refresh-token rotation, email verification, password reset y sesiones revocables.
- Perfil, avatar, preferencias de tema, locale y notificaciones.
- Organizaciones, memberships, roles y permisos dinámicos, invitaciones y equipos.
- Proyectos, membresías, favoritos, archivo/restauración, soft delete y actividad.
- Boards, columnas, WIP limits, estados, ordering transaccional y Kanban drag-and-drop.
- Tareas base: CRUD, estado, columna, prioridad, fechas, estimación, assignees, labels, completar, archivar, mover y actividad.
- Comentarios con replies de un nivel, menciones, reacciones, Markdown, edición y moderación.
- Notificaciones in-app, unread count y evento realtime de actualización.
- Autenticación Socket.IO y autorización server-side de suscripción a project rooms.
- UI responsive, app shell, dark/light/system theme, command palette, shortcuts, skeletons y error boundary.
- i18n completo en inglés, español, francés y portugués brasileño con contrato compartido y preferencia de cuenta.
- Logging estructurado, request IDs, health/readiness, Helmet, CORS allowlist, CSRF, body limit, validation con Zod y rate-limit foundation.
- Documentos de arquitectura, API, estado actual, seguridad, threat model, localization y roadmap.

## Funcionalidad parcial o ausente confirmada

- `Task.parentId` existe, pero no hay workflow completo de subtareas.
- `ChecklistItem`, `Attachment`, `TimeEntry` y `AuditLog` existen en Prisma, pero no tienen implementación end-to-end.
- No existe modelo ni implementación de `SavedFilter`.
- No existe búsqueda global permission-aware.
- No existe suite real de analytics, ni dependencia/uso de Recharts.
- Browser push no existe.
- Realtime solo escucha `notifications.updated`; `emitToProject` no tiene call sites productivos.
- Faltan presencia, typing, eventos de task/comment/board, reconciliación al reconectar y Redis Socket.IO adapter.
- Docker Compose de desarrollo solo inicia PostgreSQL y Redis.
- No existen Dockerfiles productivos, NGINX, production Compose ni deployment automation.
- CI no crea servicios PostgreSQL/Redis ni ejecuta coverage, E2E, accessibility, secret scan, SAST, dependency policy, container scan, SBOM o Docker build.
- Faltan `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `docs/DEPLOYMENT.md`, `docs/DATABASE.md`, screenshots y demo media.
- El README anuncia varias funciones todavía incompletas y su roadmap está desactualizado.

## Estado de los gates en la auditoría

- `npm run lint`: pasa.
- `npm run typecheck`: pasa.
- `npm run build`: pasa.
- API: 19 archivos, 222 tests pasan.
- Shared: 2 archivos, 8 tests pasan.
- Web: las 8 suites fallan antes de ejecutar tests por lectura de `localStorage` durante import bajo Node 26.
- `npm test`: falla.
- `npm run format:check`: falla en 19 archivos.
- `npm audit`: reporta 4 findings altos y 0 críticos: `deepmerge-ts` transitivo por Prisma y `nanoid` transitivo por Vite/PostCSS.

## Hallazgos de seguridad abiertos confirmados

1. **High:** `/api/v1/uploads` usa `express.static` antes de autenticación/autorización, violando privacidad por tenant.
2. **High:** consumo de password-reset token usa read/check/unconditional update y permite carrera.
3. **Medium:** email-verification token tiene carrera equivalente.
4. **Medium:** containment del storage path no se demuestra comparando rutas resueltas.
5. **Medium:** upload validation confía en MIME declarado y no en contenido real.
6. **Medium:** auth rate limiting agrupa endpoints con perfiles de abuso distintos.
7. **Medium:** `trust proxy = 1` está habilitado sin contrato explícito de topología.
8. **Low:** Swagger/OpenAPI interactivo siempre está expuesto.
9. **Low:** raw invitation tokens se devuelven al navegador para compartir manualmente.

La autorización de project-room Socket.IO ya fue corregida: valida UUID, aplica límite por socket, verifica membership activo y permiso `project.view`. No reviertas esa solución.

# PRINCIPIOS NO NEGOCIABLES

## Arquitectura

- Mantén arquitectura feature-based y separación route/controller/service/repository.
- Los controllers traducen HTTP; no contienen reglas de negocio.
- Los services implementan casos de uso, invariantes, autorización específica y transacciones.
- Los repositories encapsulan Prisma y siempre reciben suficiente contexto para tenant scoping.
- Los contratos compartidos viven en `@orbit/shared`; evita DTOs duplicados.
- No accedas Prisma desde React ni desde controllers si el patrón actual lo evita.
- Evita archivos gigantes, imports circulares, singletons globales difíciles de probar y abstracciones sin uso real.
- Prefiere dependencias ya instaladas y capacidades de plataforma; agrega una dependencia solo con necesidad clara, mantenimiento activo y auditoría aceptable.
- No cambies de framework, ORM, router, store o design system salvo que una incompatibilidad comprobada haga imposible el objetivo.

## Multi-tenancy y autorización

Cada operación sobre un recurso tenant-owned debe comprobar en backend:

1. autenticación;
2. sesión/token válido y no revocado;
3. identidad derivada del servidor;
4. recurso existente y activo;
5. organización propietaria derivada del recurso, nunca confiada desde el body;
6. membership activo;
7. permiso requerido obtenido del rol almacenado;
8. reglas específicas de la operación;
9. que todos los IDs relacionados pertenecen al mismo tenant;
10. estado concurrente válido al momento de mutar.

Responde `404` cuando convenga ocultar existencia y `403` cuando la política pública pueda reconocer el recurso. Aplica la convención actual consistentemente y documenta la decisión. Jamás uses botones ocultos como control de seguridad.

## Validación y API

- Body, params, query, headers relevantes, multipart metadata y Socket.IO payloads se validan con esquemas estrictos.
- Rechaza unknown fields en operaciones sensibles para prevenir mass assignment.
- UUIDs deben ser UUIDs estrictos donde el modelo los requiera.
- Listados siempre tienen paginación, ordenamiento allowlisted y maximum page size.
- Nunca permitas nombres de columnas, operadores Prisma arbitrarios o fragmentos SQL enviados por el cliente.
- Mantén envelopes consistentes: `{ data, meta?, requestId }` y errores seguros con code/message/requestId.
- No expongas stack, SQL, paths, secretos, cookies ni detalles internos en producción.
- Documenta cada endpoint público en OpenAPI o genera documentación desde contratos sin duplicar reglas manualmente.
- Las mutaciones deben ser idempotentes cuando el caso de uso lo requiera y tener política explícita ante reintentos.

## Base de datos

- No edites ni elimines migraciones ya aplicadas; crea migraciones forward-only.
- No destruyas datos existentes sin estrategia, backup y autorización explícita.
- Agrega foreign keys, unique constraints, check constraints cuando Prisma/migración lo permitan e índices basados en queries reales.
- Usa transacciones para invariantes multi-row, movimientos, roles, invitaciones, tokens, contadores y ordering.
- Previene carreras con constraints y conditional writes; una comprobación previa en application code no basta.
- Toda query listable debe estar bounded.
- Revisa planes con `EXPLAIN (ANALYZE, BUFFERS)` sobre fixtures representativos antes de afirmar performance.
- Evita N+1 y overfetching de datos personales.

## Frontend

- TanStack Query gobierna server state; Zustand solo client/session/UI state apropiado.
- Las optimistic updates requieren snapshot, rollback, invalidación/reconciliación y manejo de conflicto.
- No dupliques reglas de autorización; el frontend solo representa capacidades entregadas por el backend.
- Formularios usan React Hook Form + schemas compartidos/Zod cuando corresponda.
- Cada vista maneja loading, skeleton, empty, permission denied, validation error, transport error, retry y success feedback.
- Lazy-load por rutas/features; evita bundles monolíticos.
- No uses `dangerouslySetInnerHTML` sin justificación, sanitización estricta y tests.
- URLs generadas por usuarios deben validarse por protocolo y renderizarse de forma segura.

## Accesibilidad

- HTML semántico primero; ARIA solo cuando haga falta.
- Flujo completo por teclado, focus visible y focus restoration.
- Dialogs atrapan foco de forma correcta y devuelven foco al trigger.
- Drag-and-drop debe ofrecer alternativa por teclado.
- Toasts/eventos importantes deben ser anunciados sin saturar screen readers.
- Charts requieren resumen y tabla/text alternative.
- Respeta contraste WCAG AA, reduced motion, zoom y targets táctiles.
- Agrega pruebas automáticas de accessibility y verificaciones manuales documentadas.

## Observabilidad

- Logs JSON estructurados con request/correlation ID.
- Redacta authorization, cookies, passwords, tokens, secrets y PII innecesaria.
- Distingue liveness de readiness.
- Instrumenta latencia, error rate, rate-limit rejects, auth failures, queue/event failures y conexiones Socket.IO sin exponer datos sensibles.
- Cierra HTTP, sockets, Prisma y Redis limpiamente ante `SIGTERM`/`SIGINT`.

# METODOLOGÍA OBLIGATORIA

Trabaja en fases pequeñas. Al inicio de cada fase:

1. Inspecciona las implementaciones relacionadas.
2. Enumera hechos verificados, riesgos y archivos que probablemente cambiarán.
3. Define criterios de aceptación y pruebas negativas antes de editar.
4. Implementa la mínima slice vertical completa.
5. Ejecuta tests focalizados mientras desarrollas.
6. Ejecuta los gates proporcionales al final.
7. Actualiza auditorías, documentación y roadmap con evidencia.

No marques una fase como completa por cantidad de archivos creados. Una fase solo termina cuando su criterio de salida es observable y sus gates están verdes.

Mantén un registro de decisiones en `docs/DECISIONS/` mediante ADRs para cambios con trade-offs duraderos: estrategia de file storage, token atomicity, Socket.IO scaling, search, ordering, notification localization, production topology y deployment target.

# FASE 0 — REAUDITORÍA FORENSE Y PROTECCIÓN DEL TRABAJO

Antes de modificar código:

- Ejecuta `git status --short --branch`, `git log --oneline --decorate -n 20` y `git remote -v` sin alterar Git.
- Inventaría archivos con `rg --files`, excluyendo `node_modules`, `dist`, `coverage`, uploads y datos runtime.
- Lee por completo manifests, configs TypeScript/ESLint/Prettier/Vite/Vitest, Prisma schema/migrations/seed, Compose, CI y documentación.
- Mapea rutas API, middleware, permisos, servicios, repositories, frontend routes, query keys, stores y eventos realtime.
- Busca `TODO`, `FIXME`, dead code, duplicación, raw SQL, `dangerouslySetInnerHTML`, static file serving, unbounded queries y secretos hardcodeados.
- Compara README/roadmap contra call sites reales; no confíes en nombres de modelos o fases marcadas `done`.
- Identifica cambios existentes del propietario y no los sobrescribas.
- Confirma ignore rules de secretos sin imprimir valores.
- Actualiza `docs/CURRENT_STATE_AUDIT.md`, `docs/SECURITY_AUDIT.md`, `docs/THREAT_MODEL.md` y `docs/PORTFOLIO_READINESS_AUDIT.md` si la realidad cambió.

Entregable de fase: inventario verificable con tabla `implemented / partial / missing / unsafe / stale documentation` y plan de archivos por slice.

# FASE 1 — BASELINE VERDE Y TOOLCHAIN REPRODUCIBLE

Esta fase precede cualquier feature nueva.

## 1.1 Resolver tests web bajo runtimes soportados

- Inspecciona `apps/web/src/lib/i18n.ts` y el orden de setup de Vitest.
- Haz que local storage sea capability-safe: acceso únicamente en contexto browser, dentro de `try/catch`, tolerando storage bloqueado, ausente o inconsistente.
- Evita efectos globales peligrosos durante module import.
- No maquilles el error desactivando toda la suite ni mockeando la funcionalidad que debe probarse.
- Añade tests para storage disponible, ausente, que lanza `SecurityError`, locale inválido y fallback.
- Verifica Node 22.22.x y una versión moderna adicional realmente soportada.

## 1.2 Fijar toolchain

- Selecciona Node 22.22.x LTS como baseline compatible con la declaración actual, salvo evidencia que justifique otro minor.
- Agrega `.nvmrc` y/o `.node-version`; considera Volta solo si aporta valor.
- Alinea `packageManager`, CI, Docker y documentación.
- Si versiones nuevas se soportan, demuéstralo en CI; si no, declara un rango honesto.
- Incluye instrucciones Windows para instalar Node directamente o NVM for Windows, aclarando que `nvm` no viene incluido con Node.

## 1.3 Formato y warnings

- Ejecuta Prettier sobre los 19 archivos reportados sin alterar semántica.
- Elimina `MaxListenersExceededWarning` cerrando correctamente recursos/listeners de tests; no lo ocultes aumentando el límite global sin entender la causa.
- Asegura tests herméticos, sin dependencia de orden y con cleanup determinista.

## 1.4 Dependencias

- Ejecuta `npm audit`, `npm outdated` y revisa advisories oficiales.
- Remedia `deepmerge-ts`/Prisma y `nanoid`/Vite usando versiones compatibles verificadas.
- Prisma 7 es un major con breaking changes: usa su guía oficial, actualiza `prisma` y `@prisma/client` juntos, valida generación, migrations, seed, ESM, adapter/config y todas las queries.
- Si una actualización compatible menor resuelve el advisory, prefiérela; no hagas un major innecesario.
- No uses `overrides` para forzar una versión incompatible sin tests y explicación.
- Elimina dependencias no utilizadas y confirma licencias aceptables.

## Gate de salida de Fase 1

Desde un checkout limpio y con servicios documentados:

```text
npm ci
npm run prisma:generate -w @orbit/api
npm run lint
npm run typecheck
npm run format:check
npm run build
npm test
npm audit
```

Todo debe pasar. Un advisory high/critical solo puede quedar abierto mediante aceptación de riesgo explícita, escrita, con owner, mitigación y fecha de vencimiento; sin ella bloquea release.

# FASE 2 — SECURITY HARDENING BLOQUEANTE

## 2.1 Files privados por tenant

Elimina el acceso público general mediante `express.static`.

Diseña un flujo con:

- storage keys opacos y aleatorios;
- metadata persistida asociada a avatar/attachment y owner resource;
- endpoint autenticado de descarga;
- lookup server-side del task/project/organization;
- membership y permiso específicos;
- respuesta `404` para evitar enumeración cuando corresponda;
- headers seguros: `Content-Type` controlado, `Content-Length`, `Content-Disposition`, `X-Content-Type-Options: nosniff`, cache policy apropiada;
- nombre de descarga sanitizado sin usarlo como path;
- streaming con backpressure y cleanup;
- signed URL corta únicamente si el storage futuro lo requiere y siempre después de autorización.

Fortalece el adapter:

- `path.resolve(root)` y `path.resolve(candidate)` con prueba de containment basada en separador;
- rechazo absoluto de rutas absolutas, null bytes, `..`, separadores alternos y symlink escape;
- directorio fuera del código ejecutable y no servido por NGINX;
- no confiar en filename, extension o MIME del cliente;
- allowlist de tipos y tamaños por feature;
- magic-byte/decode verification y límites de dimensiones para imágenes;
- opción de malware scanning documentada para producción.

Tests mínimos: anonymous, logged-in outsider, Org A contra archivo de Org B, removed member, deleted attachment, traversal, encoded traversal, MIME mismatch, invalid bytes, oversized body, duplicate filename, interrupted upload y valid content.

## 2.2 Tokens single-use atómicos

Para reset y verification:

- Calcula hash y timestamp una vez.
- Realiza conditional claim `where tokenHash + usedAt null + expiresAt > now`.
- Exige `count === 1`.
- Ejecuta password/email update, session revocation y claim en una transacción coherente.
- Password reset debe invalidar sesiones/refresh tokens según política documentada.
- Respuestas no deben permitir enumerar cuentas.
- Tokens nunca se loggean ni se almacenan raw.

Tests: dos consumidores concurrentes, expired, used, malformed, wrong type, user deleted, rollback de update y exactamente un éxito.

## 2.3 Rate limiting y proxy trust

- Define policies separadas para login, register, refresh, forgot password, reset, verification resend, invitations, uploads, search, analytics y API general.
- Combina claves por IP normalizada e identidad/email hasheado cuando ayude, evitando almacenar PII innecesaria.
- Documenta límites, ventanas, respuesta `429`, `Retry-After` y observabilidad.
- Configura `trust proxy` por ambiente/topología; local directo no debe confiar forwarded headers arbitrarios.
- Añade tests de spoofed `X-Forwarded-For`, IPv6 normalization y Redis unavailable behavior.

## 2.4 Invitation delivery y docs

- Envía invitation link single-use mediante `MailService`.
- No devuelvas raw token a clientes ordinarios ni lo escribas en logs.
- Permite mail capture local mediante adapter explícito, sin credenciales públicas.
- Expiración, revocación, membership existente, rol válido y aceptación concurrente deben ser atómicos.
- Deshabilita/protege `/docs` y `/docs.json` en producción según configuración explícita.

## 2.5 Audit log

Implementa un servicio central append-only para:

- login success/failure agregado sin password;
- logout/logout-all;
- password changed/reset;
- email verified;
- session revoked;
- invitation create/revoke/accept;
- member role change/removal;
- team/project/board/task delete/archive/restore;
- permission and organization setting changes;
- file delete y acciones administrativas sensibles.

Registra actor, tenant, action, resource, timestamp, request ID, IP normalizada y user agent reducido/sanitizado. Nunca almacenes tokens, cookies, passwords, request body completo o contenido privado innecesario. Usuarios normales no pueden editar/borrar logs. Define retención y acceso administrativo.

## Gate de salida de Fase 2

- Todos los hallazgos de `SECURITY_AUDIT.md` están cerrados con evidencia o aceptados explícitamente.
- Tests negativos cross-tenant y concurrency pasan.
- No existe directorio de uploads servido estáticamente.
- Security headers, CORS, CSRF, proxy trust y rate limits tienen tests de configuración.
- Threat model refleja data flows y controles finales.

# FASE 3 — COMPLETAR EL DOMINIO DE TAREAS

Implementa cada slice vertical en este orden, reutilizando task access middleware y shared contracts.

## 3.1 Subtasks

- Define y documenta jerarquía máxima. Para `v1.0`, prefiere un nivel si no hay requerimiento demostrado para árboles arbitrarios.
- Previene self-parent, ciclos, cross-project parent, deleted parent y parent que ya sea subtask cuando el límite sea uno.
- Hereda organización/proyecto/board policy de forma consistente; no permitas IDs contradictorios.
- Lista subtasks de manera bounded y devuelve progress counts sin N+1.
- UI en task detail: crear, completar, abrir, reordenar y eliminar según permisos.
- El borrado/cascade debe ser explícito y cubierto por tests.

## 3.2 Checklists

- CRUD de checklist items, toggle y ordering transaccional.
- Título con longitud y normalización definidas.
- Posiciones server-authoritative; no confíes en un array arbitrario del cliente.
- Progress `completed/total` en task detail y card solo si no produce overfetching.
- Optimistic toggle con rollback.
- Tests de cross-tenant, invalid task, concurrent move y permission levels.

## 3.3 Time tracking

- Define manual entry y timer activo con semántica inequívoca.
- Un usuario no debe tener timers solapados si esa es la política seleccionada.
- Valida `endedAt > startedAt`, duration no negativa, maximum sensible y timestamps no absurdamente futuros.
- Calcula duración server-side para timers; no confíes en totals del cliente.
- Actualiza `Task.trackedSeconds` atómicamente o deriva aggregates con una sola fuente de verdad; documenta la elección.
- Política de edición/borrado: owner de entry y roles con permiso administrativo.
- UI de start/stop/manual entry, totals y errores de conflicto.
- Tests de doble start concurrente, stop duplicado, cross-user, cross-tenant y timezone.

## 3.4 Task attachments

- Reutiliza la infraestructura privada endurecida en Fase 2.
- Upload, list, authorized download y soft/hard delete según retención.
- Límites por archivo y por request; allowlist explícita.
- Metadata segura; original filename solo para display/download sanitizado.
- Actividad y notificación cuando corresponda.
- UI accesible con progress, cancel, error y retry.

## 3.5 Filters y SavedFilter

- Diseña un schema versionado de filtros, no Prisma JSON arbitrario.
- Soporta, como mínimo: status, column, priority, assignee, label, creator, completion, archive, due range, overdue, has attachment y free-text task query.
- Allowlist de sort fields y directions.
- Agrega `SavedFilter` tenant/user scoped con nombre, visibility si aplica, schema version, timestamps y constraints.
- Nunca permitas que un filtro guardado revele resultados que el usuario ya no puede ver.
- UI con URL state compartible para filtros no sensibles, clear/reset, saved filters y empty state.

## Gate de salida de Fase 3

Para cada subfeature existen migration/contracts/repository/service/controller/routes/OpenAPI/UI/i18n/activity/realtime hook/tests. Ningún modelo se considera implementado solo por existir en Prisma.

# FASE 4 — NOTIFICACIONES Y REALTIME COMPLETOS

## 4.1 Domain events tipados

- Define eventos compartidos versionados: `task.created`, `task.updated`, `task.moved`, `task.deleted`, `comment.created`, `comment.updated`, `comment.deleted`, `project.updated`, `notification.created`, membership/permission changes relevantes.
- Payload mínimo, sin secretos ni datos que el receptor no pueda consultar.
- Server emits solo después de commit exitoso; evita eventos fantasma.
- Incluye entity ID, tenant/project scope, actor summary seguro, version/timestamp y correlation ID.

## 4.2 Authorization realtime

- Toda room se deriva y valida server-side.
- Revalida al cambiar membership/role; expulsa sockets que pierden acceso.
- No aceptes org/project/user room arbitraria enviada por cliente.
- Valida payloads con Zod y limita subscriptions/event rate/payload size.
- Los comandos sensibles permanecen REST salvo diseño formal equivalente con auth, idempotency y validation.

## 4.3 Client reconciliation

- Los eventos invalidan o actualizan query caches usando keys centrales.
- Al reconectar, refetch authoritative state; no asumas que no se perdieron eventos.
- Deduplica por event/version cuando sea necesario.
- Muestra connection status discreto y estados offline/retry.
- Optimistic mutations deben resolver conflictos y rollback.

## 4.4 Presence y typing

- Presence efímera, bounded y con expiración; no persistir historial invasivo.
- Typing throttled/debounced con TTL y sin contenido del mensaje.
- Solo usuarios con acceso al mismo recurso reciben eventos.
- UI accesible y no ruidosa.

## 4.5 Redis adapter y multi-node

- Agrega Socket.IO Redis adapter con conexiones publisher/subscriber independientes.
- Define fallback/failure behavior; readiness debe reflejar dependencia real.
- Prueba fan-out entre dos instancias y ausencia de duplicate delivery.
- No marques horizontal scaling completo sin esa prueba.

## 4.6 Notification localization

- Evita persistir solamente title/body ya renderizados si el usuario puede cambiar locale.
- Prefiere event/template key + parámetros seguros + fallback versionado, o documenta una estrategia equivalente.
- Link URLs deben ser rutas internas allowlisted, no open redirects.
- Respeta preferencias por tipo/canal.
- Browser push es opcional para `v1.0` solo si se implementa por completo: permission UX, service worker, VAPID secrets por environment, subscription lifecycle, revocation y privacy. Si no, retíralo honestamente de los highlights y déjalo en roadmap.

## Gate de salida de Fase 4

Dos navegadores y dos instancias API demuestran colaboración autorizada; reconexión converge al estado de base de datos; tests bloquean room/event cross-tenant.

# FASE 5 — BÚSQUEDA GLOBAL SEGURA

Implementa búsqueda sobre tasks, projects, users/members, comments y labels.

- Query normalizada con mínimo/máximo de longitud.
- Debounce client-side y rate limit server-side.
- Scope explícito a organizaciones/proyectos accesibles derivado del usuario.
- Result groups con tipo, ID, title/snippet seguro, route interna y metadata mínima.
- Nunca devolver conteos ni snippets de recursos no autorizados.
- Paginación cursor-based o bounded offset con maximum.
- Escape seguro de metacaracteres; no SQL concatenado.
- Índices apropiados. Evalúa PostgreSQL full-text/trigram antes de agregar un search service externo.
- Resultado actualizado ante pérdida de membership.
- Command palette integra búsqueda remota sin mezclar acciones locales ambiguamente.
- Tests de tenant isolation, removed membership, XSS snippets, wildcard abuse, huge query, pagination abuse y rate limit.

Gate: queries representativas tienen plan documentado, latencia objetivo explícito y cero filtración cross-tenant.

# FASE 6 — ANALYTICS Y DASHBOARD

Define primero cada métrica, su timezone, ventana y denominador:

- tasks created;
- tasks completed;
- overdue open tasks;
- completion rate;
- project progress;
- team workload;
- velocity por periodo;
- burndown;
- tracked time;
- activity trend.

Reglas:

- Agregados siempre tenant/project scoped.
- Queries bounded y sin N+1.
- No uses datos soft-deleted/archived sin política explícita.
- Define tratamiento de tareas reabiertas, sin estimate, sin assignee y cambio de timezone.
- Agrega índices/migrations solo con evidencia de query.
- Cachea únicamente si key incluye tenant, permisos relevantes, filtros y TTL; invalida correctamente.
- Usa Recharts si sigue siendo la opción seleccionada por el stack y pasa audit/bundle review.
- Cada chart tiene tooltip accesible, legend, color no único, responsive container y alternativa textual/table.
- Skeleton, empty state, partial error y rango de fechas.
- Tests de cálculos contra fixtures conocidos, timezone/DST, tenant isolation y performance.

Gate: cada número visible puede rastrearse a una fórmula documentada y un test determinista.

# FASE 7 — UX, RESPONSIVE, ACCESSIBILITY E I18N FINAL

Audita cada ruta pública y autenticada:

- landing;
- login/register/forgot/reset/verify;
- dashboard;
- profile/preferences;
- notifications;
- organizations/members/invitations/teams;
- projects/members/activity;
- boards/Kanban;
- task detail con todos los subrecursos;
- search/command palette;
- not-found/error/offline states.

Para cada ruta verifica:

- 320 px, 768 px, 1024 px y escritorio amplio;
- teclado y screen reader;
- focus order y landmarks;
- loading/empty/error/forbidden/not-found;
- texto largo en cuatro idiomas;
- timezone y formatos regionales;
- reduced motion;
- dark/light contrast;
- no layout shift grave;
- destructive action confirmation y recovery cuando sea viable.

Implementa una alternativa accesible a drag-and-drop: move menu o controles de teclado. No dependas exclusivamente de color para prioridad, WIP o status. Mantén touch targets adecuados.

Gate: axe automatizado sin violaciones serias y checklist manual documentado para los flujos críticos.

# FASE 8 — ESTRATEGIA DE PRUEBAS Y ATAQUE

## Pirámide de pruebas

- Unit: reglas puras, schemas, permissions, ordering, metric formulas, locale helpers.
- Service: business invariants con repositories/adapters controlados.
- Repository/database: constraints, tenant filters, transactions y races contra PostgreSQL real.
- HTTP integration: middleware completo, cookies, CSRF, CORS, rate limits y envelopes.
- Component: forms, loading/error/empty, accessibility y optimistic rollback.
- E2E browser: journeys críticos con frontend/API/database reales.
- Realtime integration: dos sockets, dos tenants, reconnect y multi-node adapter.
- Security regression: cada hallazgo de auditoría obtiene test permanente.
- Performance: hot endpoints y concurrent moves/tokens con objetivos documentados.

## Matriz mínima de actores

Prueba operaciones relevantes como:

- anonymous;
- authenticated user sin organization;
- owner de Org A;
- admin de Org A;
- manager de Org A;
- developer/member de Org A;
- viewer de Org A;
- member suspendido/removido;
- user legítimo de Org B intentando recursos de Org A;
- usuario con sesión revocada;
- usuario cuyo rol cambió mientras estaba conectado.

No hardcodees la matriz de permisos desde nombres de rol si el sistema es dinámico. Obtén expectativas de los permissions seed/fixtures y prueba permisos efectivos.

## Casos de seguridad obligatorios

- missing, malformed, expired, wrong-type, forged y revoked JWT/session;
- refresh replay y rotation race;
- reset/verification/invitation concurrent consumption;
- IDOR/BOLA cambiando organization, project, board, column, task, comment, attachment, saved filter y notification IDs;
- viewer/admin escalation y mass assignment de role/orgId/userId/isOwner;
- SQL injection strings en search/filter/sort;
- stored/reflected/DOM XSS payloads en nombres, descriptions, comments, labels, filenames y notification metadata;
- CSRF missing/mismatch y cross-origin credential request;
- CORS unlisted origin y `Origin: null` policy;
- proxy header spoofing;
- oversized JSON, multipart y Socket.IO payloads;
- invalid UUID, page size, sort field y filter schema;
- malicious upload, double extension, MIME mismatch, traversal y unauthorized download;
- open redirect en invitation/reset/notification links;
- unauthorized Socket.IO room/event y stale membership;
- brute force, credential stuffing shape y rate-limit bypass attempts;
- error leakage y log redaction assertions;
- race en task move, column move, timer start/stop, WIP limit y role change.

## E2E journeys mínimos

1. Register -> verify -> login -> create organization -> invite member -> accept -> create project -> board -> task -> assign -> comment -> complete.
2. Owner configura roles; viewer comprueba read-only; developer no ejecuta owner action.
3. Dos usuarios mueven/comentan una task y observan convergencia realtime.
4. Upload privado y download autorizado; outsider recibe respuesta segura.
5. Forgot/reset password; sesiones previas quedan revocadas según política.
6. Crear subtasks/checklist/time entry/attachment/filter y recuperar tras reload.
7. Global search y analytics muestran solo recursos permitidos.
8. Cambio de idioma persiste entre dispositivos/sesiones y no rompe layout.

## Coverage

Define thresholds razonables por paquete y mayor exigencia en auth, authorization, tenant scoping, token lifecycle y storage. No persigas 100% superficial; ninguna rama crítica debe quedar sin prueba. Publica reporte sin incluir datos sensibles.

# FASE 9 — DOCKER, NGINX Y OPERACIÓN

## Imágenes

- Dockerfiles multi-stage con versiones pinneadas conscientemente.
- Instala con `npm ci`; build separado de runtime.
- Runtime sin devDependencies cuando sea viable.
- Usuario non-root, filesystem read-only cuando sea compatible y directorios writable explícitos.
- No copies `.env`, `.git`, tests innecesarios, uploads, logs o secrets al image.
- Agrega `.dockerignore`.
- Señales y graceful shutdown correctos.
- Health checks no dependen de tools ausentes.

## NGINX/reverse proxy

- Sirve SPA con fallback controlado.
- Proxy `/api` al backend.
- Proxy `/socket.io` con WebSocket upgrade correcto.
- Request/body/upload limits consistentes con API.
- Security headers coordinados con Helmet, sin duplicación contradictoria.
- Cache hashed static assets de forma inmutable; no cachear auth/user data.
- Compression segura; documenta TLS termination y real IP/proxy hops.
- No expongas upload directory privado.

## Compose

- Mantén `docker-compose.dev.yml` útil para desarrollo.
- Agrega full-stack Compose reproducible o perfiles claros para API/web/PostgreSQL/Redis/NGINX y mail capture local si se utiliza.
- Healthchecks y `depends_on` basado en health donde aplique.
- Named volumes, network separation y variables sin secrets hardcodeados.
- Migration job explícito; no ejecutes múltiples migrators concurrentes.
- Documenta reset destructivo separado y con advertencia.

## Operación

- Deployment guide para target elegido sin inventar infraestructura desplegada.
- Backup y restore de PostgreSQL probados.
- Redis no es source of truth.
- Log destination, retention, monitoring, alert assumptions y rollback.
- Smoke test post-deploy y migration rollback/forward-fix strategy.

Gate: desde un ambiente limpio, Compose construye, migra, arranca, pasa readiness, sirve SPA/API/Socket.IO y sobrevive restart sin perder PostgreSQL.

# FASE 10 — CI/CD Y SUPPLY CHAIN

Expande GitHub Actions con jobs separados y dependencias claras:

1. metadata/toolchain validation;
2. `npm ci` con lockfile;
3. Prisma generate;
4. lint;
5. typecheck;
6. format check;
7. unit/component tests;
8. PostgreSQL/Redis integration tests con health checks;
9. migration from empty database + seed smoke;
10. browser E2E;
11. accessibility;
12. dependency audit/policy;
13. secret scanning;
14. SAST;
15. production build;
16. Docker build;
17. container vulnerability scan;
18. SBOM artifact;
19. release job solo por tag protegido y autorización explícita.

Usa permissions mínimos de GitHub Actions, pinning razonable de actions, concurrency cancellation y artifacts sin secretos. No permitas deployment desde pull requests no confiables. Cachea dependencias sin cachear credenciales. CI debe usar placeholders/generación efímera y nunca secretos de producción.

Gate: un PR nuevo reproduce todos los checks requeridos; branch protection puede bloquear merge si fallan.

# FASE 11 — DOCUMENTACIÓN PÚBLICA Y EMPAQUETADO DE PORTAFOLIO

Todo en inglés, verificado contra el commit final.

## README obligatorio

Reescribe `README.md` con esta estructura:

1. Nombre, tagline y una frase de valor real.
2. Estado del release y badges que correspondan a workflows reales.
3. Hero screenshot real, sin datos privados.
4. Tabla de contenidos.
5. Product overview y problema que resuelve.
6. Feature list separando claramente `Available in v1.0` de `Roadmap`.
7. Demo workflow/GIF corto y accesible con alt text.
8. Architecture overview con diagrama Mermaid y límites de confianza.
9. Technology stack con versiones/rangos relevantes.
10. Repository structure.
11. Prerequisites exactos.
12. Quick start comprobado desde cero.
13. Environment variables: nombre, service, required, purpose, safe example format; nunca valores reales.
14. Database creation, migrations, seed y Prisma Studio.
15. Cómo iniciar API y web en terminales separadas.
16. URLs locales de web, API, health, readiness y docs según environment.
17. Guía de uso por flujo: account, organization, invitation, project, board, task, collaboration, search, analytics y settings.
18. Roles/permissions explicados como defaults configurables, no seguridad hardcodeada.
19. Testing commands y qué cubre cada nivel.
20. Docker development y production-like execution.
21. Security model y enlace a disclosure policy/threat model.
22. Observability y health checks.
23. Deployment link.
24. Troubleshooting común, incluyendo Docker engine/Redis/PostgreSQL/Node/NVM/ports/migrations.
25. Known limitations honestas.
26. Roadmap.
27. Contributing.
28. License.
29. Acknowledgements sin afirmar afiliación con productos de referencia.

No escribas “production-grade”, “enterprise-grade”, “complete realtime”, “comprehensive security” o cifras de coverage si no están demostradas por gates y docs enlazados.

## Quick start que debe probarse

Incluye comandos para PowerShell y Bash cuando difieran:

- instalar la versión Node declarada;
- `npm ci`;
- copiar `apps/api/.env.example` y `apps/web/.env.example` a sus archivos locales;
- generar secretos localmente sin publicarlos;
- iniciar Docker Desktop/engine;
- `npm run db:up`;
- esperar health de PostgreSQL/Redis;
- Prisma generate;
- migrations;
- seed;
- iniciar API y web;
- comprobar health/readiness;
- login/uso local con datos seed únicamente si esos datos son deliberadamente públicos y exclusivos de desarrollo;
- detener servicios sin borrar volúmenes;
- reset destructivo como sección separada y claramente advertida.

Variables que actualmente deben documentarse por nombre, sujeto a reauditoría:

- API: `NODE_ENV`, `PORT`, `LOG_LEVEL`, `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS`, `UPLOAD_DIR`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `RATE_LIMIT_GLOBAL_MAX`, `RATE_LIMIT_GLOBAL_WINDOW_SECONDS`, `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_AUTH_WINDOW_SECONDS`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS`, `REFRESH_TOKEN_REMEMBER_DAYS`, `EMAIL_VERIFICATION_TTL_HOURS`, `PASSWORD_RESET_TTL_HOURS`, `WEB_APP_URL`.
- Web: `VITE_API_URL`, `VITE_APP_NAME`; separa Socket.IO origin/base si el diseño final lo requiere.

No pongas un secreto real como ejemplo. Usa descripciones como `<generate-a-random-secret>` y valida longitud/entropía en boot.

## Documentos obligatorios

- `LICENSE` con licencia realmente elegida.
- `CONTRIBUTING.md`.
- `CODE_OF_CONDUCT.md`.
- `SECURITY.md` con disclosure privado y supported versions, sin correo personal si no se desea publicar.
- `CHANGELOG.md`.
- `docs/ARCHITECTURE.md`.
- `docs/API.md` o OpenAPI completo enlazado.
- `docs/DATABASE.md`.
- `docs/DEPLOYMENT.md`.
- `docs/LOCAL_DEVELOPMENT.md` si README se vuelve demasiado largo.
- `docs/THREAT_MODEL.md`.
- `docs/SECURITY_AUDIT.md` con remediation status.
- `docs/TESTING.md`.
- `docs/CONTRIBUTING.md` solo si aporta contenido distinto al root.
- `docs/ROADMAP.md`.
- ADRs relevantes.

Evita duplicar instrucciones que luego diverjan; el README debe enlazar guías profundas.

## Media de portafolio

- Captura real de landing, dashboard, board, task detail, analytics y settings/i18n.
- Light y dark mode.
- Datos sintéticos sin email/nombre personal.
- Resolución consistente, compresión WebP/PNG y alt text descriptivo.
- GIF/video corto mostrando creación y movimiento realtime sin tokens, devtools, paths locales o notificaciones personales.
- No uses mockups que representen funciones inexistentes.

## Descripción pública sugerida

Usa esta descripción **solo cuando todas las funciones mencionadas estén terminadas**:

> Orbit is a secure, multi-tenant project-management SaaS built with React, Express, PostgreSQL, Prisma, Redis, and Socket.IO, featuring configurable RBAC, Kanban workflows, realtime collaboration, analytics, four locales, automated testing, and production-ready containers.

Si realtime, analytics o containers siguen pendientes, elimínalos de la descripción. No prometas seguridad absoluta.

Topics sugeridos, únicamente si corresponden al resultado final:

```text
react typescript nodejs express postgresql prisma redis socket-io saas project-management kanban multi-tenant rbac vite tailwindcss vitest docker
```

# FASE 12 — GIT, RELEASE Y PUBLICACIÓN SEGURA

## Antes del primer commit

- El worktree actual no tiene baseline. No commits nada hasta que el baseline esté auditado y los secretos estén excluidos.
- Verifica `.gitignore`, staged filenames y generated files.
- Confirma que `.env`, uploads, data, logs, coverage, dumps y editor/private files no estén staged.
- Ejecuta secret scan sin imprimir valores en logs públicos.
- Ejecuta todos los gates.
- Separa commits por intención: baseline/toolchain, security, task slices, realtime, analytics, infra, docs.
- Usa Conventional Commits y mensajes en inglés.
- No inventes autores ni timestamps.

## Release

- Define semantic versioning.
- Genera changelog desde cambios reales.
- Tag `v1.0.0` solo cuando el checklist final pase.
- Adjunta checksums/SBOM si se publican images/artifacts.
- Documenta known limitations y upgrade/migration notes.

## Publicación

No ejecutes `git remote add`, creación de repo, `git push`, release, package publish o deploy sin autorización explícita del propietario y destino confirmado. Cuando se autorice:

1. muestra qué branch/tag se publicará;
2. confirma que gates y secret scan están verdes;
3. verifica el remote exacto sin mostrar credenciales embebidas;
4. usa autenticación provista por el entorno, nunca solicites que peguen tokens en chat;
5. publica sin force-push;
6. verifica el resultado público y links del README;
7. reporta commit/tag publicado.

# DEFINICIÓN GLOBAL DE TERMINADO PARA `v1.0.0`

No declares el proyecto terminado hasta comprobar todos estos puntos:

## Producto

- Auth, organizations, teams, projects, boards, tasks, subtasks, labels, assignees, comments, attachments, checklists, time tracking, activity, notifications, search, filters, dashboard y realtime funcionan end-to-end o el alcance `v1.0` fue reducido explícita y honestamente.
- No hay botones, rutas o claims de features placeholder.
- Owner/admin/manager/developer/viewer tienen UX coherente con permisos efectivos.

## Seguridad

- Cero critical/high conocidos sin aceptación de riesgo explícita vigente.
- Tenant isolation probada para todos los resource types.
- Files privados no se sirven estáticamente.
- Tokens single-use son atómicos.
- Upload, Socket.IO, search, analytics, CORS, CSRF, rate limits y proxy topology están endurecidos y probados.
- No hay secrets o PII privada en Git, builds, logs, screenshots o docs.

## Calidad

- Clean install pasa.
- Lint, typecheck, format, build y todas las suites pasan.
- No hay suites skipped para ocultar fallos críticos.
- Coverage gates y E2E críticos pasan.
- No hay handles/listeners abiertos ni warnings ignorados.

## Datos

- Migrations desde base vacía pasan.
- Upgrade desde la migración anterior está probado.
- Seed es idempotente o su política está documentada.
- Backup/restore fue probado.
- Constraints e índices reflejan invariantes y queries reales.

## Frontend

- Responsive, accessible, keyboard usable y localizado en cuatro idiomas.
- Loading/empty/error/offline/permission states existen.
- Realtime y optimistic updates convergen al estado del servidor.
- No XSS sinks inseguros ni tokens persistidos en localStorage.

## Operación

- Imágenes non-root y reproducibles.
- Full stack inicia con health checks y migración controlada.
- NGINX sirve API, SPA y Socket.IO correctamente.
- Graceful shutdown, logs, readiness y restore están documentados.

## GitHub/portafolio

- README y docs se verificaron siguiendo los pasos literalmente.
- Claims, screenshots y roadmap coinciden con código.
- Existe licencia real, security policy, contributing y changelog.
- Git history es legible y no contiene secretos.
- Publicación fue explícitamente autorizada.

# COMANDOS DE VERIFICACIÓN FINAL

Adapta nombres solo si la reauditoría demuestra cambios. Registra exit code y resumen, no dumps con secretos.

```text
node --version
npm --version
npm ci
npm run db:up
npm run prisma:generate -w @orbit/api
npm run prisma:deploy -w @orbit/api
npm run db:seed -w @orbit/api
npm run lint
npm run typecheck
npm run format:check
npm run build
npm test
npm audit
docker compose config
docker compose build
docker compose up -d
health/readiness smoke tests
browser E2E
accessibility tests
secret scan
container scan
```

Prueba también la guía desde un clon/checkout limpio o un directorio temporal seguro, sin reutilizar accidentalmente `node_modules`, `.env`, base de datos o build artifacts del workspace principal.

# FORMATO DE REPORTES DURANTE EL TRABAJO

Mantén al propietario informado con actualizaciones cortas y concretas. Para cada fase reporta:

```text
Phase:
Verified starting state:
Changes made:
Security impact:
Migrations:
Tests added:
Commands run and result:
Open risks:
Documentation updated:
Next phase:
```

No digas “todo listo” si queda un gate rojo. Distingue:

- `implemented`;
- `verified`;
- `blocked`;
- `deferred by explicit scope`;
- `risk accepted by owner`.

# FORMATO DE ENTREGA FINAL

La entrega final debe incluir:

1. Resumen ejecutivo honesto.
2. Lista de features realmente completadas.
3. Hallazgos corregidos con evidencia y tests.
4. Migraciones y compatibilidad de datos.
5. Quality-gate table con comandos y resultados.
6. Security residual-risk table.
7. Performance/accessibility evidence.
8. Docker/deployment smoke-test result.
9. Documentación creada/actualizada.
10. Git status y confirmación de secret hygiene sin revelar valores.
11. Si fue autorizado, commit/tag/remote/release exactos; si no, declarar claramente que no se publicó.
12. Limitaciones reales restantes y roadmap posterior a `v1.0`.

# REGLA FINAL

Primero inspecciona. Después prueba el baseline. Después corrige seguridad y reproducibilidad. Luego implementa slices verticales completas. Después ejecuta pruebas funcionales, negativas, concurrentes y cross-tenant. Después intenta romper la aplicación. Corrige lo encontrado. Empaqueta producción. Verifica documentación desde cero. Solo entonces prepara el release.

No confundas cantidad de código con calidad, presencia de un modelo con una feature terminada, un botón oculto con autorización, una suite existente con una suite verde, Docker de base de datos con production packaging, ni un README ambicioso con evidencia.

El producto final debe ser algo que un ingeniero senior pueda revisar, ejecutar y cuestionar sin encontrar discrepancias obvias entre arquitectura, seguridad, comportamiento, tests y documentación.

## FIN DEL PROMPT
