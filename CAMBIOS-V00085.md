# ServiExpress · V00085 — Columna BC fija, detalle con quién capturó, Shop/correctivo seleccionables

Reemplaza la carpeta `src/` completa y `public/version.json`.

## 1. La columna BC desaparecía al recargar
Causa: en "Customize / Table layout" estaba guardada una configuración vieja que
OCULTABA el campo "Captured by" del Fleet Report. Al cargar el app aparecía la
columna (código) y en cuanto llegaba ese layout, la quitaba (y también del
detalle). Ahora el campo BC está bloqueado en el layout: ninguna configuración
lo puede ocultar ni sacar de la tabla/detalle. Se puede seguir moviendo de lugar.

## 2. Los "not required" (Shop / correctivo) se pueden seleccionar
- Salen en el desplegable de Truck y se guardan sin error (desde V00084).
- El aviso ya no dice "not required / can't be added": dice
  "in shop / corrective (optional — they can still be added)".
- En "See which ones", cada camión (faltantes y Shop/correctivo) trae un botón
  "+" que abre el Fleet Report con ese camión ya elegido, con su entidad,
  estación y la precarga del registro anterior.

## 3. Detalle: quién hizo el registro
- El campo BC vuelve a verse en el detalle.
- El pie dice "Captured: 09/29/2026, 05:41 PM by <nombre>" (en todos los
  módulos que registran capturista).

Verificado: `tsc -b` + `eslint` en limpio; versión V00085.
