# ServiExpress · V00039 — Ajustes de alertas, rojo en Excel y adjuntos

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. Fuera de las alertas
Actual Mileage, Next mant (from truck), Dolly y Batteries ya NO aparecen en
el modal de Alerts ni se pintan (aunque tuvieran un umbral guardado). El
resto de campos numéricos sigue configurable.

## 2. El rojo viaja al Excel
Las mismas celdas que se ven en rojo en el app salen en ROJO (negrita +
fondo rosado) en TODOS los Excel:
- Export Excel del módulo (con o sin rango de fechas).
- El exporte de renglones enlazados (BC Reports con sus mantenimientos).
- El exporte del detalle abierto.
- El paquete de reportes del Dashboard.
Misma regla exacta que en pantalla: valor <= umbral configurado en Alerts.

## 3. Files & photos
- Botones "Take photo" y "Upload photo / PDF" arriba, en AZUL, con botón de
  refrescar al lado.
- Lo que subes aparece EN LA PESTAÑA AL INSTANTE (la miniatura o el
  documento se agregan a la lista apenas termina la carga, sin esperar).
- La ruta de guardado se muestra debajo de los botones.

## 4. Pestaña duplicada del camión
Había dos pestañas de lo mismo ("Station & Entity changes" nueva y
"Entity / Station history" que ya existía). Queda UNA sola: "Station &
Entity changes", la vista original con su columna "Changed by".

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00039.
