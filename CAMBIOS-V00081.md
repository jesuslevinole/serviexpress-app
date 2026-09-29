# ServiExpress · V00081 — My trucks numerado, taller/correctivo arriba, Historic por rango

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. My trucks: consecutivo real
Cada camión lleva su número (1, 2, 3… hasta el total de la estación). El número
se conserva al buscar, así el último siempre dice cuántos hay. La cabecera ahora
cuadra: total · agregados · pendientes · en taller · en correctivo.

## 2. Taller y correctivo arriba, con icono
- Llave (azul) = orden de Shop abierta → estado "IN SHOP".
- Triángulo (rojo) = mantenimiento correctivo pendiente → estado "CORRECTIVE".
Orden: primero taller, luego correctivo, luego pendientes y al final los ya
agregados.

## 3. Historic por rango de fechas
La pestaña Historic ya no muestra nada hasta que eliges "From" y "To" (fechas
de Texas; viene propuesto: últimos 7 días) y presionas "Search". Se consulta al
servidor por la fecha del registro, así sale cualquier semana, no solo las que
cabían en la lista. Muestra cuántos registros hay en ese rango; filtros,
buscador y Export Excel trabajan sobre ese resultado. La pestaña "In progress"
no cambia.

### Índice recomendado (para los BC)
Un BC consulta "su estación + rango de fechas". Firestore pide un índice
compuesto para eso; mientras no exista, el app igual funciona (trae el rango y
filtra la estación en el navegador, con más lecturas). Para crearlo: la primera
búsqueda de un BC deja en la consola del navegador un enlace de Firebase —
ábrelo y "Create index". O manual en Firestore → Indexes:
  colección `fleetReports` · `idStation` Ascending · `date` Ascending.

Verificado: `tsc -b` + `eslint` en limpio; versión V00081.
