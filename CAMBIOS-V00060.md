# ServiExpress · V00060 — El check de verificación ya se ve sin configurar

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Qué pasaba
El botón de check existía y estaba bien colocado, pero solo aparecía para
administradores o para quien tuviera ACTIVADO el permiso nuevo "Verify" en
Roles. Tu sesión entra con el rol DEVELOPER y ese permiso todavía no estaba
marcado, así que la columna de acciones no lo mostraba.

## Qué cambia
El check aparece ahora para:
- El administrador (siempre).
- Quien tenga el permiso "Verify (correct info check)" del módulo.
- RESPALDO: quien pueda BORRAR en ese módulo. Si alguien tiene permiso para
  eliminar registros, marcarlos como correctos es una atribución menor — así
  el botón funciona sin tener que configurar nada.

Para restringirlo a un grupo concreto: en Roles, quita "Delete" a ese rol o
maneja la columna "Verify" del módulo Fleet Report.

El comportamiento del check no cambia: se pinta verde, guarda quién y cuándo
verificó, queda en la bitácora del registro y otro clic lo desmarca.

## Recordatorio sobre la ventana
En Fleet Report el aviso dice "closed since Sep 22" con horario "martes 8:00
AM a martes de esa misma semana 11:59 PM". Ese horario deja la ventana en
cero. Con "Change window" conviene dejarla como la de captura semanal que
usaban (martes 8:00 AM -> miércoles de la semana siguiente 11:59 PM).
Recuerda que ese reloj es COMPARTIDO con BC Reports.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00060.
