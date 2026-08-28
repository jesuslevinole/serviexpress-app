# ServiExpress · V00030 — La aritmética del aviso, completa y a la vista

Reemplaza la carpeta `src/` completa y `public/version.json`.

## El caso T'ara Kusek (28 vs "17 of 20")
Los números SÍ cuadran entre sí; lo que faltaba era mostrar la pieza que los
conecta. La cuenta real:
- El catálogo de Trucks dice que HOY la estación 706 tiene 20 camiones
  activos asignados.
- El reporte del 08/26 trae 28 renglones, capturados ANTES de la regla de
  estación (V00025), cuando el BC podía agregar camiones de cualquier
  estación.
- De esos 28, solo 17 son camiones que hoy pertenecen a la 706 -> "17 of 20
  · 3 still missing". Los otros 11 hoy figuran en OTRA estación, dados de
  baja o ya no existen en el catálogo.

## Qué cambia
El aviso del BC ahora muestra esa pieza:
- En la línea de progreso: "17 of 20 trucks at your station added · 3 still
  missing · 11 added in your reports but not counted (moved / inactive)".
- En "See which ones", un grupo nuevo: "Added in your station's reports but
  NOT counted for it", con cada camión y su motivo exacto:
    "429776 · NKJ6125 — the catalog places it at 782 today"
    "500021 · SGJ0766 — inactive truck"
- Sumando: contados + no contados = los renglones del reporte. Todo
  verificable a un clic, sin abrir el reporte (el desglose dentro del
  reporte de V00029 también sigue ahí).

## Qué revisar con esto en la mano
Si al ver los motivos resulta que varios de esos 11 SÍ están físicamente en
la 706, lo que está desactualizado es su "Station actual" en el módulo
Trucks: corrigiéndola ahí, los números del aviso se ajustan solos. Desde
V00025 los BC ya solo pueden capturar camiones de su estación, así que los
reportes nuevos siempre van a cuadrar 1 a 1.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00030.
