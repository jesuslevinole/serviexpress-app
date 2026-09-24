# ServiExpress · V00070 — Correctivo automático y pestaña Historic por rol

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1 y 2. Fuera la pregunta y los botones
- Se quitó el modal "Fleet Report saved · ¿Corrective o Preventive?" que
  salía al guardar.
- Se quitaron los botones "Add corrective maintenance" y "Add preventive
  maintenance" del detalle del Fleet Report.
El único camino ahora es el campo del formulario (punto 4). En el detalle
del MANTENIMIENTO sigue el botón "Came from: Fleet Report…" para volver al
reporte de origen.

## 3. La pestaña "Historic", desde Roles
Columna nueva en la matriz: "Historic tab (previous weeks)".
- Quien la tenga concedida ve las dos pestañas (In progress / Historic).
- Quien NO la tenga solo ve la semana vigente: la pestaña desaparece y el
  módulo muestra únicamente los registros de la semana en curso.
- El administrador la ve siempre y, como respaldo para no configurar nada,
  también quien pueda borrar en el módulo.

## 4. Correctivo creado AUTOMÁTICAMENTE
Al guardar un Fleet Report con "Add corrective maintenance? = Yes", el app
crea solo el mantenimiento, sin abrir ningún formulario, con:
  Type: Corrective · Status: Pending
  Truck: el del reporte · Actual Mileage: el del reporte
  Observation: lo escrito en "Specify the problem"
  Captured by: quien capturó el reporte
  (más fecha, entidad y estación del reporte)
Queda enlazado al Fleet Report de origen y registrado en la bitácora. Arriba
del módulo aparece el aviso: "Corrective maintenance created automatically
for <camión> (status Pending). You can open it in Maintenance."
Si algo fallara al crearlo, el Fleet Report se guarda igual y el aviso lo
dice para crearlo a mano.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00070.
