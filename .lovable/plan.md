## Módulo "Entrenamientos" — Plan de implementación

Nuevo módulo aislado. No toca tablas ni flujos existentes. Se integra como una tarjeta más en el Dashboard y rutas nuevas bajo `/entrenamientos`.

### 1. Base de datos (migración nueva)

Tablas nuevas en `public`, todas con RLS por `user_id` y GRANTs a `authenticated` + `service_role`:

- `training_tasks` — biblioteca de ejercicios
  - name, task_type, didactic_form, difficulty, demand, space, players_count, work_time, rest_time, complexity, competitiveness, description, image_url, material, is_favorite
- `training_sessions` — cabecera de sesión
  - microcycle, session_number, session_date, category, season, coach, objective
- `session_tasks` — tareas dentro de una sesión (join con orden)
  - session_id, task_id, order_index, custom_notes (override opcional)
- `shared_training_links` — enlaces públicos
  - session_id, token (único), is_public, expires_at
  - Política pública SELECT por token (via función security definer) para visualización externa

Bucket de storage `training-images` (público) para imágenes de ejercicios.

### 2. Rutas y páginas

```
/entrenamientos                    → Dashboard del módulo (accesos rápidos)
/entrenamientos/tareas             → Biblioteca de tareas con filtros
/entrenamientos/tareas/nueva       → Crear/editar tarea
/entrenamientos/favoritas          → Mis favoritas
/entrenamientos/sesiones           → Listado de sesiones (propias + predefinidas)
/entrenamientos/sesiones/nueva     → Editor de sesión (drag & drop de tareas)
/entrenamientos/sesiones/:id       → Ver / editar sesión
/entrenamientos/compartir/:token   → Vista pública read-only (sin login)
```

Nuevo botón en `Dashboard.tsx`: tarjeta "Entrenamientos" → `/entrenamientos`.

### 3. Componentes principales

```
src/pages/entrenamientos/
  EntrenamientosHome.tsx
  TasksLibrary.tsx           (grid + filtros)
  TaskEditor.tsx             (form + upload imagen + import)
  FavoriteTasks.tsx
  SessionsList.tsx           (tabs: Mis sesiones | Predefinidas)
  SessionEditor.tsx          (cabecera + lista ordenable de tareas)
  SessionView.tsx            (vista tipo ficha + botones PDF/compartir)
  PublicSessionView.tsx      (versión pública del token)

src/components/entrenamientos/
  TaskCard.tsx
  TaskFilters.tsx
  TaskPicker.tsx             (modal para añadir tareas a sesión)
  SessionTaskItem.tsx        (draggable)
  SessionPdfExport.tsx       (3 modos: resumido / extendido / editable)
  ShareLinkDialog.tsx
  ImportTasksDialog.tsx      (Excel/Word/PDF → tasks)

src/hooks/
  useTrainingTasks.ts
  useTrainingSessions.ts
  useSharedLinks.ts
```

### 4. Filtros de tareas

Panel lateral con selects/chips: forma didáctica, dificultad, exigencia, espacio, nº jugadores, tipo. Búsqueda por nombre. Aplicación reactiva sobre query Supabase.

### 5. Importar tareas (Excel/Word/PDF)

- **Excel/CSV**: `xlsx` (ya en el proyecto) — mapear columnas a campos de `training_tasks`, previsualización, insert masivo.
- **Word (.docx)**: `mammoth` → texto plano → parseo por bloques (una tarea por sección con etiquetas "Nombre:", "Tiempo:", …).
- **PDF**: `pdfjs-dist` extrayendo texto + mismo parser de etiquetas.

Diálogo con drop-zone, tabla editable de previsualización, botón "Importar N tareas".

### 6. Editor de sesión

- Cabecera con todos los campos (microciclo, nº, fecha, categoría, temporada, entrenador, objetivo).
- Lista de tareas añadidas con drag & drop (`@dnd-kit/sortable` ya usable) para reordenar.
- Botón "Añadir tarea" abre `TaskPicker` con filtros y multi-selección.
- Botones: Guardar, Duplicar, Exportar PDF, Compartir enlace.

### 7. Sesiones predefinidas

Tab "Predefinidas" en `SessionsList` lista sesiones marcadas `is_template = true` (columna extra) creadas por admin. Botón "Usar plantilla" duplica a sesión propia editable.

### 8. Exportar PDF (3 formatos)

Cliente-side con `jspdf` + `jspdf-autotable`:
- **Resumido**: cabecera + tabla (nombre, tiempo, jugadores).
- **Extendido**: cabecera + una página/bloque por tarea con imagen y todos los campos.
- **Editable**: usa `pdf-lib` con `AcroForm` fields para permitir edición en Acrobat/lector.

### 9. Compartir

Botón "Compartir" genera token en `shared_training_links` y muestra URL `https://<app>/entrenamientos/compartir/:token`. Copiar al portapapeles + botón WhatsApp. Ruta pública no requiere login (política RLS pública por token).

### 10. Diseño

Reutiliza tokens del design system y estilo `Russo One` existente. Tarjetas oscuras, mismos botones shadcn, mismos gradientes ya usados en Dashboard. Sin cambios globales.

---

### Detalles técnicos

**Dependencias nuevas** a instalar: `mammoth`, `pdfjs-dist`, `jspdf`, `jspdf-autotable`, `pdf-lib`, `@dnd-kit/core`, `@dnd-kit/sortable` (verificar si alguna ya está).

**Rutas**: añadir en `App.tsx` sin tocar las existentes.

**RLS pública**: para `shared_training_links` y `session_tasks`/`training_sessions` accedidos por token, crear función `get_session_by_token(token text)` `SECURITY DEFINER` que devuelva la sesión + tareas si el link existe y no ha expirado, evitando abrir SELECT global a `anon`.

**Import parsing**: heurística por regex sobre etiquetas ES ("Nombre", "Tipo", "Tiempo trabajo", "Descanso", "Jugadores", "Espacio", "Descripción", "Material") + previsualización obligatoria antes de insertar.

**Alcance excluido de esta primera entrega** (avísame si quieres alguno ahora):
- Editor gráfico de pizarra por tarea (usa imagen subida).
- Estadísticas/analytics de carga de entrenamiento.
- Multiequipo / permisos por rol dentro del módulo (usa `user_id` del creador).

¿Lo lanzo tal cual, o quieres que ajuste algún punto (por ejemplo, quitar el PDF editable, o simplificar el import a solo Excel para la v1)?
