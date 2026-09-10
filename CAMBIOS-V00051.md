# ServiExpress · V00051 — El logo se aplica al subirlo (un solo paso)

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Por qué el logo no se colocaba
Subirlo y aplicarlo eran DOS pasos (subir el archivo, luego "Save"), y entre
uno y otro la URL recién subida se perdía: al guardar quedaba vacía, así que
el app seguía mostrando el logo de fábrica. Por eso las vistas previas
decían "current" aunque el archivo sí había subido a Storage.

## Qué cambia
- SUBIR = APLICAR. Al elegir el archivo, se sube y se guarda en el mismo
  acto: el logo aparece de inmediato en el menú lateral y en el login. Ya no
  hay que presionar "Save" para el logo (Save sigue siendo para los textos).
- VISTAS PREVIAS REALES: los dos recuadros (38 px y 150 px) muestran
  exactamente lo que el app está usando en ese momento, con un borde
  punteado para juzgar el recorte. Si no hay logo propio, muestran el de
  fábrica — ya no dicen "current".
- BOTÓN "REMOVE LOGO": vuelve al logo incluido cuando quieras.
- Se corrigió la alineación de las vistas previas (se encimaban).
- Mensaje de estado claro: "A custom logo is in use…" o "No custom logo
  yet: the app is using the built-in one".

## Recordatorio sobre tu archivo
El fondo blanco que se ve alrededor del logo viene DENTRO de la imagen. Para
que se integre con el tema oscuro hay que subir un PNG con fondo
TRANSPARENTE. Si solo tienes la versión con fondo, mándamela y te la
devuelvo recortada.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00051.
