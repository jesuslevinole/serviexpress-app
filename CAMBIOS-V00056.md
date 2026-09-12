# ServiExpress · V00056 — Se elimina "Add line": Done guarda y cierra

Reemplaza la carpeta `src/` completa y `public/version.json`.

## El cambio
La ventana de captura de renglones ya no tiene el botón "+ Add line", que
confundía (se podía cerrar con Done y perder lo escrito).
Ahora es un camión por apertura, sin ambigüedad:
1. El BC abre la ventana con "Add truck".
2. Llena los datos del camión.
3. Presiona DONE: el renglón se guarda en la lista Y la ventana se cierra.
4. Para el siguiente camión, vuelve a abrirla con "Add another truck".

Detalles pensados para que nadie pierda trabajo:
- Si hay algo escrito y falta un campo obligatorio, el camión ya está en el
  reporte o está bloqueado (taller / ya capturado), Done NO cierra la
  ventana: muestra el motivo y deja los datos intactos para corregir.
- Si la ventana se abre y se cierra sin escribir nada, simplemente cierra.
- Dentro de la ventana hay una línea de ayuda que explica el flujo.
- El botón de la barra ahora dice "Add truck" / "Add another truck" (antes
  "Add lines" / "Edit lines"), y el aviso de reporte vacío usa ese nombre.

Recordatorio: los renglones se graban en la base al presionar SAVE en el
formulario del BC Report. Done solo los suma a la lista en pantalla.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00056.
