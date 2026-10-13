# ServiExpress · V00102 — Un solo scroll en todo el app y ventanas de configuración a pantalla completa

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).
**OJO:** este paquete BORRA `src/index.css` (ver punto 3). Si copias la
carpeta encima sin borrar la anterior, ese archivo se queda y no pasa nada,
pero lo limpio es borrar `src` antes de copiar.

## 1. Se acabaron los dos scroll

Regla nueva, para todo el app: **dentro de una ventana desplaza UNA sola
cosa.** Antes casi cada lista traía su propio tope de alto y su propia barra,
metida dentro de la barra del modal: había que arrastrar dos para llegar al
mismo sitio.

Se les quitó el scroll propio a: el configurador de campos (Edit layout), la
lista de usuarios de "View as", columnas del Excel, Alerts, destinatarios de
correo, duplicados, verificación, My trucks e historial de estaciones,
importar CSV, accesos del usuario, resumen del detalle, lista de cobertura,
avisos de la ventana de captura, estaciones en Usuarios, desglose del
Dashboard y movimientos de Uniform inventory.

Excepciones a propósito, que NO son "dos scroll":
- La matriz de Roles: ahí desplaza la rejilla (para que el encabezado y la
  columna del módulo queden fijos) y no el cuerpo. Sigue siendo una barra.
- El menú de un desplegable con buscador, el menú lateral, el panel de
  filtros y el cajón del Dashboard: cada uno es su propia región.

## 2. Las ventanas de configuración ocupan la pantalla

Pasan a **pantalla completa**: Edit layout (campos de cualquier módulo),
Form steps, Columns del Export Excel, Alerts, Change window, Import CSV,
Merge duplicates y Accesos del usuario. Roles ya estaba.

Pasan a **ventana grande** (80% de la pantalla): elegir usuario en "View as",
el propio "View as" y los destinatarios del correo.

A pantalla completa el contenido no se estira sin límite: se centra con un
ancho cómodo (1.500 px), porque un renglón de formulario de 1.900 px no hay
quien lo lea.

## 3. Limpieza: `src/index.css` borrado

Era una copia EXACTA, byte a byte, de `src/styles/index.css`, y el app solo
carga la de `styles/`. Cualquier arreglo hecho en el archivo equivocado no
tenía efecto. Queda uno solo.

Verificado: `tsc -b` + `eslint` en limpio, `vite build` OK; versión V00102.
