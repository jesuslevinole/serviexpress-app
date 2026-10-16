# ServiExpress · V00108 — Correos AUTOMÁTICOS desde el servidor

Este paquete trae DOS cosas que se publican por separado:
- `src/` + `public/` → el app (como siempre).
- `functions/` + `firebase.json` + `PASOS-DESPLIEGUE.md` → las Cloud
  Functions, que se despliegan con `firebase deploy --only functions`.
  **Los correos no funcionan hasta que despliegues las funciones.**

## Lo que cambia de fondo

Antes el aviso lo disparaba el navegador después de guardar. Si el BC cerraba
la pestaña, si el guardado venía de una importación o si fallaba la conexión,
no salía nada.

Ahora lo dispara **Firestore en el servidor**: cada vez que se escribe un
registro en una colección vigilada, se ejecuta la función, lee la
configuración de esa vista y manda el correo. El navegador ya no envía nada
ni decide destinatarios — solo guarda la configuración.

## Configuración por vista: botón "Automatic emails"

En cada módulo (donde antes decía "Email on save"):

**Cuándo avisar**
- Al **crear** un registro.
- Al **editar** cualquier campo.
- **Reglas por campo**: *"Cuando Status pase a APROBADO"*. Se agregan las que
  quieras, con cualquier campo de lista del módulo (Status, Type…). Avisan
  aunque las dos opciones de arriba estén apagadas, porque son eventos con
  nombre propio: el asunto del correo dice *"Requirements: Status: APROBADO"*.
  Ahí está el aviso de aprobación de un requerimiento que pediste.

**A quién**
- Los usuarios que marques (busca por nombre o correo).
- Y, si quieres, **quien capturó** el registro — útil para avisarle al BC que
  su solicitud fue aprobada.

Sin nadie marcado, esa vista no envía nada. Los usuarios sin correo no se
pueden marcar, y los INACTIVOS se saltan al enviar.

## Cómo se ve el correo

Asunto: `[ServiExpress] Requirements: Status: APROBADO — SANCHEZ BARRIOS, Gabriel · 10/16/2026`

Cuerpo: una tabla con los campos del registro —con los nombres resueltos, no
los ids: "730925", no "7f3a9c…"— y, cuando es una edición, la lista de
**qué cambió**: `Status: PENDIENTE → APROBADO`.

## Colecciones vigiladas

Fleet Report · BC Reports · Requirements · Maintenance · Shop · Accidents ·
Trucks · Drivers · Assets · Rentals · Fleet.

No se vigilan los renglones de detalle (los del BC Report y los uniformes):
son miles de escrituras por semana y no tienen pantalla de configuración
propia, así que cada una sería una invocación tirada a la basura.

## IMPORTANTE al publicar

1. Despliega las funciones (`PASOS-DESPLIEGUE.md`, paso 3). Requiere plan
   **Blaze**, que ya tienen.
2. Si ya tenías configurado "Email on save" en alguna vista, **entra y
   guarda otra vez**: la configuración nueva incluye datos que el servidor
   necesita (la colección y los campos que van en el correo) y que la
   versión anterior no guardaba.
3. Comprueba en Firebase → Functions → Registros: cada ejecución deja una
   línea con el resultado (*enviado a 3*, *sin configuración*, *error: …*).

Verificado: `tsc -b` + `eslint` en limpio, `vite build` OK,
`node --check functions/index.js` OK; versión V00108.
