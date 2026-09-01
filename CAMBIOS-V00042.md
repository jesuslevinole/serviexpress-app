# ServiExpress · V00042 — Recorte de fondo del consumo de lecturas

Reemplaza la carpeta `src/` completa y `public/version.json`.

## El diagnóstico (con números)
Tu propia sesión de escritorio consume ~100-150 lecturas: sana. Las 152 mil
del día salen del VOLUMEN de cargas frías: los teléfonos borran el caché
local con frecuencia (iOS sobre todo), y cada carga fría de un BC bajaba:
  camiones completos (285) + drivers completos (330) + el catálogo Team que
  arma los nombres (430) + TODOS los renglones de la semana de TODAS las
  estaciones (300+) + reportes y catálogos chicos
  = 1,300-1,500 lecturas por carga fría.
20 BCs x 4-6 cargas frías al día = 100-180 mil. Ahí están tus 152k.

## Los recortes (solo usuarios acotados; tú y oficina sin cambio)
1. Catálogos por estación: camiones y drivers se suscriben SOLO a las
   estaciones del usuario (285 -> ~30 y 330 -> ~40 por carga fría).
2. Renglones de la semana por estación: el BC solo baja los de SUS
   estaciones (300+ -> ~30). Ver "índice" abajo.
3. Tope de seguridad en los 6 módulos que iban sin límite (Trucks, Drivers,
   Assets, Fleet, Rentals, Uniform): máximo 500 más recientes, como ya
   tenían los demás.
4. El monitor de lecturas ahora ACUMULA por dispositivo (persiste entre
   sesiones): "This device since 09/02: 3.4k total · top: …" con botón
   reset. Actívate el permiso "Reads monitor" en un teléfono de BC y en un
   día ves su consumo REAL, no adivinado.
Carga fría de BC estimada tras esto: ~250-350 lecturas (antes 1,300-1,500).

## ÍNDICE COMPUESTO (1 vez, recomendado)
El recorte #2 necesita un índice en Firestore. Sin él, el app se da cuenta
solo y usa el modo completo (nada se rompe), pero el ahorro grande llega al
crearlo:
  Firebase Console -> Firestore -> Índices -> Crear índice
    Colección: bcReportDetails
    Campos: idStation (Ascendente), createdAt (Ascendente)
    Alcance: Colección
  (Tarda unos minutos en construirse; después, automático.)
Alternativa: abre BC Reports como un BC (View as NO sirve para esto: hazlo
con un usuario real de estación), y en la consola del navegador (F12)
aparecerá un error de Firestore con un ENLACE directo que crea el índice
con un clic.

## Qué esperar
- Los primeros días tras publicar, cada dispositivo hace UNA carga completa
  más (el caché se rehace con las consultas nuevas); después baja.
- Con esto la meta de <40 mil/día es realista. Si en 2-3 días el número de
  Firebase no baja, enciende "Reads monitor" en el rol de los BC, pide una
  captura del acumulado del dispositivo de los 2-3 más activos, y con eso
  se remata al responsable exacto.
- Detalle honesto: en pantallas de un BC, un camión o driver de OTRA
  estación referenciado en registros viejos puede mostrarse por su id en
  vez del nombre (ya no descarga esos catálogos). En BC Reports las listas
  de movidos conservan sus nombres (ese catálogo del detalle quedó
  completo a propósito).

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00042.
