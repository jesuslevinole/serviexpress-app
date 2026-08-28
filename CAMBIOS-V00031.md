# ServiExpress · V00031 — La pertenencia del camión es SOLO su Current station

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Qué estaba pasando (el verdadero origen del 28 vs "17 of 20")
El conteo de la ventana sí leía "Current station" (idStationActual), PERO
además filtraba por la ENTIDAD del BC. En una misma estación conviven
camiones de varias entidades (en la 706 hay SR EXPRESS y SERVIEXPRESS RED
juntos), así que a T'ara solo le contaba los 20 de su entidad y dejaba fuera
los demás camiones de SU estación — de ahí el descuadre con sus 28.

## Regla corregida (en TODO el circuito)
Un camión pertenece a la estación donde está HOY según su "Current station",
sin importar la entidad. Aplica a:
- El aviso "X of Y trucks at your station" y su lista de faltantes.
- La lista de bloqueados del formulario y el candado de estación.
- El grupo "added but not counted" (V00030) y el desglose del reporte.
Con esto, el "of Y" del BC serán TODOS los camiones activos de su estación,
y sus capturas cuadran 1 a 1.

## Después de publicar
Repite la prueba con T'ara: el aviso debe decir "X of <todos los de la 706>"
y el descuadre con los 28 debe reducirse a los camiones que de verdad hoy
figuren en otra estación o de baja (visibles con su motivo en el grupo
"NOT counted").

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00031.
