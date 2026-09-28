# ServiExpress · V00079 — Los accesos extra por usuario ya se conservan y aplican

Reemplaza la carpeta `src/` completa y `public/version.json`.

## La causa (una sola, explica los dos síntomas)
El guardado SÍ funcionaba: los accesos extra quedaban escritos en Firestore.
El problema era la LECTURA. Las listas del app convierten los objetos
anidados en texto JSON, y `permissionOverrides` llegaba como texto a:
- el modal "Extra access" → no lo reconocía y abría VACÍO tras recargar
  (por eso parecía que "desaparecía"), y el botón de la columna decía "Set up";
- "View as" → armaba a la persona SIN sus accesos extra → "No access" en
  Fleet Report y el módulo fuera del menú.

## Qué se corrigió
- Nuevo lector único `services/permissionOverrides.ts` que acepta el dato
  como objeto o como texto. Lo usan el modal, la columna "Extra access",
  View as y el login.
- `canOr` (botones de barra: Export, Filters, Template…) ahora también suma
  los accesos extra. Si un módulo se concede SOLO como acceso extra, Filters
  y Template heredan del "View"; Export sigue siendo su propia casilla.
- El texto de ayuda del modal ya no sale partido en columnas.

## Importante
- Lo que ya guardaste antes (Ender con Fleet Report) sigue en la base: al
  publicar esta versión aparecerá marcado, sin volver a capturarlo.
- La persona ve el cambio en su siguiente carga (recargar la página).
- Con acceso extra, la visibilidad por estación del módulo sigue aplicando
  donde el módulo la impone (Fleet Report: solo sus estaciones).

Verificado: `tsc -b` + `eslint` en limpio; versión V00079.
