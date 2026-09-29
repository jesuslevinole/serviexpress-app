# ServiExpress · V00084 — Fleet Report: precarga, columna BC, fecha fija, Shop/correctivo permitidos

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. Precarga de la información anterior
Al elegir el camión en un Fleet Report nuevo, el formulario se llena solo con lo
que se cargó la vez anterior para ESE camión: Type, Route, Driver, Scanner,
Gas card, S Number, V Truck y Stops. Aparece un aviso verde con el origen
("Prefilled from this truck's previous Fleet Report of 09/22/2026 (by …)").
- Si el camión nunca tuvo Fleet Report, se toma de su registro en Fleet.
- Solo rellena campos que el usuario no ha tocado; si cambia de camión, se
  reemplaza la precarga anterior.
- NO se copian las lecturas de la semana (Actual Mileage, presiones de llantas)
  ni el correctivo: se capturan nuevas cada vez.
- Si el driver precargado ya está en otro Fleet Report de esta semana, al
  guardar el sistema lo avisa (regla de un driver por semana).

## 2. Columna "BC"
La tabla muestra el nombre del BC que cargó cada registro, justo después de la
fecha. (Si guardaron un orden de columnas propio con "Table layout", la columna
puede quedar en otra posición: se acomoda desde ahí.)

## 3. Fecha no modificable
La fecha la pone el sistema: hoy en hora de Texas. Se ve bloqueada al crear y
al editar, y al guardar se fuerza el día de hoy (aunque alguien la manipule).

## 4. Camiones en Shop / correctivo SÍ se pueden cargar
Ya no salen del desplegable ni se rechazan al guardar. En los avisos siguen
contando como "not required": si los cargan, pasan a "loaded".

Verificado: `tsc -b` + `eslint` en limpio; versión V00084.
