# ServiExpress · V00100 — View as de verdad, Roles a pantalla completa y alcance campo por campo

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

## 1. "View as user" más grande y con lista de usuarios

El diálogo ya no es una cajita con un desplegable:

- Una tarjeta grande **"Choose a user…"** abre la **lista completa de
  usuarios** en su propio modal, con **buscador** por nombre, correo, rol o
  estación. Cada renglón muestra nombre, correo, **rol** y **estaciones
  asignadas** (u "Office · all stations"), y el elegido queda marcado.
- Al elegirlo, el diálogo muestra una ficha con su rol, sus estaciones y su
  estatus, para confirmar antes de entrar.

## 2. Ver como alguien = ver EXACTAMENTE lo suyo; guardar = a tu nombre

La simulación ya aplicaba su rol, sus permisos, sus accesos extra y su
alcance. Lo que cambia es la **autoría**:

- Lo que guardes mientras simulas queda a nombre **tuyo**, no del usuario
  emulado. El campo "Captured by" / "BC" del formulario muestra tu nombre
  desde el principio, para que no haya sorpresa al guardar.
- La barra amarilla de arriba lo dice: *"exactly what they see; anything you
  save is recorded as you"*.
- La bitácora de cambios ya registraba al usuario real con "(as X)"; eso se
  mantiene.

## 3. Roles: pantalla completa y UN solo scroll

El modal "Edit role" pasa a ocupar **toda la pantalla**. El nombre del rol y
el filtro de módulos quedan fijos arriba y **solo la matriz desplaza**: se
acabaron los dos scroll peleando (el del modal y el de la rejilla). El
encabezado y la columna del módulo siguen fijos al desplazar.

## 4. Alcance campo por campo, por rol ("Who sees it")

En **Edit layout** de cualquier módulo, cada campo tiene ahora un botón
**"Who sees it"**. Al abrirlo se configura, con las mismas palabras de Roles:

| Opción | Qué ve ese rol en el campo |
|---|---|
| **Role** (por omisión) | lo que diga la Visibility del módulo en Roles |
| **All** | todo el catálogo |
| **Own** | solo lo que esa persona capturó |
| **Station** | solo lo de sus estaciones asignadas |
| **None** | no ve el campo: desaparece de su formulario, tabla y Excel |

Se puede poner un valor **por omisión para todos** y, debajo, **uno distinto
para cada rol** (el del rol gana). Lo configurado aquí **manda sobre la
Visibility del módulo**. El admin real nunca pierde un campo, aunque esté en
None: si no, una regla mal puesta no se podría corregir.

## 5. La lógica que pediste, ya cubierta

Un BC con **Visibility = Own** en Fleet Report ve **solo sus registros** en la
lista. Pero en el formulario, el campo **Truck** le ofrece los camiones de
**su estación** que **esta semana todavía no están cargados** en el Fleet
Report (los ya cargados salen del desplegable con el motivo, igual que los
repetidos). Eso funciona de dos maneras:

- Por omisión, porque el desplegable de camiones sigue la Visibility del
  módulo **Trucks** (con Station —o cualquier restricción— se acota a su
  Current station).
- Y si quieres forzarlo sin tocar Trucks, pon el campo Truck en
  **Who sees it → Station** para el rol BC.

Verificado: `tsc -b` + `eslint` en limpio, `vite build` OK; versión V00100.
