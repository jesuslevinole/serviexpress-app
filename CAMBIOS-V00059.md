# ServiExpress · V00059 — Check por permiso + mantenimiento al guardar

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. Por qué no veías el botón de check
El check estaba limitado a "ser administrador" y tu sesión entra con el rol
DEVELOPER, así que no aparecía en la columna de acciones.
Ahora es un PERMISO de la matriz de Roles: columna nueva
"Verify (correct info check)".
- Actívala en el módulo Fleet Report para los roles que deban verificar
  (Developer, Administrador, o el que decidas) y el botón aparece de
  inmediato en cada fila.
- Los administradores lo siguen viendo siempre, sin configurar nada.
- El check sigue guardando quién y cuándo verificó, y queda en la bitácora.

## 2. Al guardar un Fleet Report pregunta por el mantenimiento
Después de guardar aparece un aviso: "Do you want to create a maintenance
for this truck?" con tres salidas:
- CORRECTIVE MAINTENANCE -> abre el alta de Maintenance con tipo Corrective.
- PREVENTIVE MAINTENANCE -> abre el alta con tipo Preventive.
- NO, THANKS -> cierra y no hace nada.
En los dos primeros casos el formulario llega PRELLENADO con lo que
acabas de capturar: camión, entidad, estación, escáner, millaje y los seis
cauchos. Solo se completa lo propio del mantenimiento.

Los botones del detalle ("Add corrective / preventive maintenance") siguen
disponibles para hacerlo más tarde sobre un Fleet Report ya guardado.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00059.
