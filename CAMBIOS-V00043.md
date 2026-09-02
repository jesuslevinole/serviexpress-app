# ServiExpress · V00043 — Mapa de consumo por módulo + 2 recortes más

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Ranking de carga fría por módulo (análisis del código + tamaños reales)
Lecturas aproximadas al abrir cada módulo con caché vacío:

ADMIN (antes de V00042 -> ahora):
1. Maintenance    ~1,600 -> ~1,300  (500 propios + bcReports COMPLETO 509
                                     + trucks 285 + assets + routes...)
2. BC Reports     ~1,300 -> ~1,300  (500 + trucks 285 + detalles semana 300+)
3. Trucks / Fleet ~900 c/u          (catálogo + drivers 330 + Team 430 + fleet)
4. Shop           ~850
5. Drivers        ~800              (330 + Team 430)
6. Resto          < 300

BC / usuario de estación (antes de V00042 -> ahora):
1. BC Reports     ~1,200 -> ~150-300 (reportes/camiones/drivers/detalles de
                                      SU estación; el gran ahorro llega al
                                      crear el índice de V00042)
2. Fleet          ~1,100 -> ~350     (falta Team, ver estrategia 2)
3. Maintenance    ~1,500 -> ~600     (con esta versión baja el catálogo
                                      bcReports: 509 -> ~15 de su estación)

## Los 2 recortes de esta versión
1. El catálogo de REPORTES dentro de Maintenance (para la columna "BC
   Report") ahora se acota: por estación para usuarios acotados
   (509 -> ~15) y con tope de 500 recientes para el admin — que además
   COMPARTE el listener con el módulo BC Reports, así que al admin no le
   cuesta lecturas extra. Sin esto, ese catálogo crecía ~30/semana sin
   límite: era la fuga estructural más peligrosa a futuro.
2. Tope general para catálogos referenciados grandes (bcReports,
   maintenance): nunca más un catálogo de referencia sin límite.

## Estrategias pendientes, en orden de impacto (para ir decidiendo)
1. ÍNDICE de V00042 (bcReportDetails: idStation + createdAt) — 5 minutos en
   consola, activa el ahorro grande de los BC. LA PRIORIDAD.
2. El catálogo Team (430 docs) viaja completo a cualquier módulo que
   muestre drivers, solo para armar el nombre "APELLIDOS, Nombre". Como los
   drivers ya traen su nombre copiado, puedo armar la etiqueta desde el
   propio driver y dejar Team solo en el módulo Drivers: -430 por carga
   fría de Trucks/Fleet/Assets/Accidents/Requirements. Riesgo bajo; drivers
   sin nombre copiado mostrarían "(sin nombre)". Dame luz verde y lo hago.
3. Medir Assets con el monitor (tamaño desconocido; aparece en 4 módulos).
   Si pasa de 200, se acota por estación igual que camiones.
4. Los detalles de la semana para el ADMIN (300+ por carga): se puede
   aplazar su carga hasta que el admin abre el aviso/desglose. Impacto medio
   en tus propias pestañas.

## Cómo verificar
Con "Reads monitor" encendido: el acumulado del dispositivo ("This device
since…") en un teléfono de BC tras un día debe quedar en cientos, no miles.
La lista por colección te dice el siguiente objetivo si algo sigue alto.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00043.
