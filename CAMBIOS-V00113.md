# V00113 — Mensaje del correo editable y buscadores con un solo estilo

## 1. El texto del correo lo escribe el admin

En cada vista, **Automatic emails** trae ahora una sección **"Mensaje del
correo"** con el asunto y el cuerpo tal como van a salir, y un botón
**Editar mensaje**. Se escribe una vez y queda guardado para esa vista; para
cambiarlo, se vuelve a pulsar Editar.

Lo que se puede editar:

| Campo | Qué es |
|---|---|
| Asunto | la línea que se lee en la bandeja |
| Texto de apertura | el párrafo con el que empieza el correo |
| Texto de cierre | el pie (se puede dejar vacío) |
| Tabla con los datos | se incluye o no |
| Lista de cambios | se incluye o no (solo aplica al editar un registro) |

**Variables.** Escritas entre llaves, el servidor las sustituye al enviar:

- `{titulo}` — nombre de la vista (Trucks, Fleet Report…)
- `{evento}` — Nuevo registro, Registro editado, o la regla que se cumplió
- `{registro}` — cómo se identifica el registro (`730925 · 10/16/2026`)
- `{fecha}` — fecha y hora del envío

Una variable mal escrita **no se borra**: sale tal cual en el correo, para que
se note y se corrija. Y si el registro no tiene etiqueta, el asunto no termina
en un guion suelto: el separador se recorta solo.

**Compatibilidad.** Una vista que nunca pasó por el editor sigue enviando
exactamente el correo de antes: el texto de fábrica es el que el sistema ya
usaba. No hay que volver a configurar nada.

**Probar envío** ahora manda el correo con *ese* texto, con datos de ejemplo y
una marca de prueba arriba. Sirve de vista previa real sin tener que guardar un
registro de verdad.

## 2. Un solo estilo de buscador en toda la app

Había buscadores con estilo propio y otros que eran un `input` pelado —de ahí
que varios parecieran "sin CSS". Ahora hay **una sola clase global**,
`.app-search`, con fondo, borde, icono y **anillo de foco** (al escribir se
ilumina el campo entero, no solo el texto), y tres variantes:

- normal — barra de herramientas de los módulos
- `is-block` — ocupa el ancho, para los de dentro de un modal
- `is-compact` — píldora pequeña, para los embebidos en una cabecera
- `is-flush` — al ras, para el que encabeza un desplegable

Aplicada en: barra de Trucks/Fleet Report/todos los módulos, Roles, Users,
Uniform inventory, Automatic emails, User access, selector de usuario
("View as"), lista de camiones, nota de registros bloqueados y el buscador de
los desplegables.

Los CSS de cada componente quedaron solo con su parte de maquetación (cuánto
ocupa, dónde va); el aspecto está en un único sitio.

## Archivos tocados

```
src/styles/index.css                        .app-search y sus variantes
src/components/crud/EmailRecipientsModal.tsx  sección "Mensaje del correo"
src/components/crud/EmailRecipientsModal.css  estilos del editor y la vista previa
src/services/emailNotifications.ts            NotifyTemplate, variables, texto de fábrica
functions/index.js                            el servidor usa la plantilla; prueba = vista previa
src/components/crud/CrudModule.tsx/.css       buscador a la clase global
src/components/crud/BlockedRefsNote.tsx       idem
src/components/crud/MyTrucksModal.tsx/.css    idem
src/components/crud/CaptureWindow.css         idem
src/components/layout/UserPickerModal.tsx/.css idem
src/components/ui/SearchableSelect.tsx/.css   idem
src/pages/RolesPage.tsx                       idem
src/pages/UsuariosPage.tsx                    idem
src/pages/UniformInventoryPage.tsx            idem
src/pages/UserAccessModal.tsx/.css            idem
src/config/version.ts, public/version.json    V00113
```

## Para publicar

1. Copia los archivos y sube el front como siempre.
2. **Las funciones hay que volver a desplegarlas** para que el servidor lea la
   plantilla:
   ```
   FUNCTIONS_DISCOVERY_TIMEOUT=120 firebase deploy --only functions
   ```
3. En cada vista donde quieras texto propio: **Automatic emails → Editar
   mensaje → Save**. Las que no toques siguen igual que hoy.

## Verificado

- `tsc -b` sin errores
- `eslint src` sin avisos
- `vite build` correcto
- `node --check functions/index.js` y carga del módulo: 24 funciones
- Sustitución de variables probada contra el código real: valor normal,
  registro vacío (recorta el guion), variable desconocida (se conserva)
- Sin estilos en línea nuevos (`grep "style={{"` sobre el diff)
