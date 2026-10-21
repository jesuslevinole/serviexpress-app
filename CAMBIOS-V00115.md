# V00115 — Fleet Report: aviso de camión repetido en la misma semana

> Requiere V00114 instalado. Son 9 archivos (incluido este).

## La regla

Dentro de la misma semana aplicada **un camión va una sola vez**. No importa
la estación ni la entidad, y no hay excepciones.

Guardar desde el formulario ya lo impedía (V00068). Aun así podían colarse
copias por tres vías: **Import CSV** (no revisaba la regla), **dos guardados
al mismo tiempo** desde dos teléfonos, o registros **anteriores a la regla**.
Ese es el caso del 466667 de la captura: está una vez en la estación 770
(SERVIEXPRESS RED) y otra en la 776 (SR EXPRESS).

## Qué se ve ahora

**1. Aviso junto al número del camión.** En la columna Truck, cada copia
muestra el número en rojo con la etiqueta **⚠ REPEATED ×2**. Al pasar el
ratón dice en qué otra estación, entidad, BC y fecha está la otra copia.

**2. Aviso arriba de la tabla:**

> ⚠ **1 truck is loaded more than once in the same week.** A truck can only be
> loaded ONCE per week — not even in another station or entity. **Delete one
> of the copies** (they are shown first in the table).
> • 466667 — 2 times in this week: [Station 770 · SERVIEXPRESS RED · Orlando Pimentel · 10/20/2026] [Station 776 · SR EXPRESS · Michael Mejias · 10/13/2026]

Cada copia es un botón que abre ese registro.

**3. Los repetidos salen primero** en la tabla, con sus copias juntas, para
compararlas y borrar una sin buscarlas.

**4. El aviso se quita solo** en cuanto se borra una de las copias.

## Detalles

- **El BC también lo ve aunque la otra copia sea de otra estación.** La
  semana vigente se revisa contra la lista en vivo del servidor de *todas*
  las estaciones, la misma que ya usaba el bloqueo del desplegable. Así que
  esto no gasta lecturas extra. Cada BC ve solo los repetidos en los que
  está alguna copia de su estación.
- **Pestaña Historic:** también marca los repetidos de semanas pasadas,
  agrupándolos por la semana con la que se guardó cada registro.
- **Import CSV ya no los deja pasar.** En el previo, una fila queda en rojo
  con el motivo si su camión ya está cargado esta semana o si viene dos
  veces en el mismo archivo. Las filas con ID de un registro existente son
  actualizaciones de ese mismo registro, así que no cuentan como repetido.
- El aviso es solo para el **camión**. El bloqueo de driver repetido al
  guardar sigue igual que antes.

## Archivos

```
src/components/crud/CrudModule.tsx      detección, aviso en la celda, aviso arriba, orden, regla del importador
src/components/crud/CrudModule.css      estilos del aviso (clases week-dup-*)
src/components/crud/ImportCsvModal.tsx  nueva prop rowGuard (regla extra por fila en el previo)
src/hooks/useCaptureWindow.ts           expone weekRows (semana vigente, todas las estaciones)
src/types/models.ts                     ModuleConfig.weekDuplicateAlert
src/config/modules.ts                   Fleet Report: weekDuplicateAlert { field: 'idTruck' }
src/config/version.ts, public/version.json    V00115
```

## Para publicar

1. Copia los archivos y sube el front. No hay que tocar functions ni reglas.
2. Abre Fleet Report → In progress: el 466667 debe salir arriba con el aviso.
   Borra la copia que sobra y el aviso desaparece.

## Verificado

- `tsc -b`, `eslint src` y `vite build` sin errores
- Sin `style={{` nuevos: todo va en clases de CSS
