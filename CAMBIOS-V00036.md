# ServiExpress · V00036 — Editor de layout completo + freno por cuota

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. Orden de columnas con ARRASTRAR Y SOLTAR
En "Edit layout", cada fila trae una agarradera (⋮⋮): arrastra y suelta para
ordenar; el orden aplica a la tabla, el formulario, el exporte y la
plantilla. Las flechas siguen ahí como alternativa.

## 2. El mensaje rojo ("Quota exceeded")
Ese error es la CUOTA DIARIA GRATUITA de Firestore agotada (las 50 mil
lecturas del día se consumieron; se reinicia cada medianoche, hora del
Pacífico). Dos cosas:
- El contador ahora se FRENA COMPLETO al primer "quota exceeded" (antes
  intentaba los 509 uno por uno) y muestra un mensaje claro: "counting is
  paused and will resume another day (upgrading to Blaze removes this
  limit)".
- La solución de fondo sigue siendo el plan Blaze (centavos al mes a este
  volumen); mientras, los recortes de V00033 hacen rendir la cuota.

## 3. Visibilidad en DOS niveles + orden del formulario
- Casilla "Show" (ojo): apagada = el campo desaparece para TODOS — tú
  incluido — de la tabla, el formulario, exportes y plantilla. Los datos
  guardados no se tocan.
- Casilla "Others" (ojo tachado): apagada = SOLO los administradores lo ven;
  los demás usuarios no (ni en tabla ni en formulario). En "View as" lo ves
  como lo vería esa persona.
- El orden de arrastre también ordena el formulario (siempre fue el mismo
  orden). CUIDADO: ocultar con "Show" un campo obligatorio del sistema
  (Date, Driver name) puede romper la captura de ese módulo.

## 4. Agregar y quitar campos propios (modifican la colección)
- Al pie del editor: "Add a field to this module" — nombre + tipo (Text,
  Number, Date, Yes/No) y listo: el campo aparece en el formulario, la
  tabla, exportes e Import CSV, y sus valores se guardan en cada registro.
- Quitar (bote de basura, solo en campos propios): si el campo YA tiene
  datos guardados, pregunta primero con el número exacto:
    ""Plate color" already has data in 87 records. What do you want to do?"
    > Remove field AND delete its data (87)   [borra el dato de cada registro]
    > Remove from the app, keep the data      [el dato queda en la colección]
    > Cancel
- Los campos del sistema no se pueden eliminar (se ocultan con "Show", que
  equivale a quitarlos del formulario sin riesgo).

Nota de migración: columnas que ya tenías ocultas con la casilla anterior
aparecen con "Show" apagado; si guardas, quedan ocultas TAMBIÉN en el
formulario (la semántica nueva). Enciende "Show" y apaga "Others" si lo que
quieres es solo-admin.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00036.
