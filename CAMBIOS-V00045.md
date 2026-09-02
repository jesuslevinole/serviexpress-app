# ServiExpress · V00045 — Fuera la dependencia del catálogo Team (-430/carga)

Reemplaza la carpeta `src/` completa y `public/version.json`.

## Sobre los 18 mil de esta mañana
Dos cosas para leer bien ese número:
1. HOY ES MIÉRCOLES DE CIERRE (la ventana cierra 11:59 PM): es el día de
   más tráfico de la semana — todos los BC capturando desde temprano. Para
   la flota el día no "apenas inicia": empezó a las 4-5 AM.
2. Tras publicar V00042-V00044, cada dispositivo hace UNA recarga completa
   (las consultas nuevas rehacen su caché). Esa joroba es de un solo día
   por dispositivo.
Aun así, faltaban dos palancas. Una es tuya (el índice); la otra va aquí.

## El recorte de esta versión
El catálogo Team (430 documentos) viajaba COMPLETO a Trucks, Fleet, Assets,
Accidents y Requirements solo para armar el nombre de los drivers. Como los
drivers ya traen su nombre copiado ("APELLIDOS, Nombres"), la etiqueta
ahora sale del propio driver y Team solo se descarga dentro del módulo
Drivers (donde sigue completo para el campo Team y Merge duplicates).
- Ahorro: -430 lecturas por carga fría en esos 5 módulos, para TODOS los
  roles (también tus pestañas).
- Detalle honesto: si algún driver quedó sin nombre copiado (los pocos que
  no entraron en la recarga de nombres), fuera del módulo Drivers su
  etiqueta puede salir como id o "(sin nombre)". Se corrige recargando
  drivers_nombre_formato.csv con REPLACE, que sigue pendiente.

## Checklist para que el número baje DE VERDAD (en orden)
1. Publicar esta versión (y confirmar V00045 en el pie del menú).
2. CREAR EL ÍNDICE (es la palanca más grande de los BC y sigue pendiente):
   Firestore -> Índices -> Crear: bcReportDetails, campos idStation (Asc) +
   createdAt (Asc), alcance Colección. Sin él, cada BC sigue bajando los
   renglones de TODAS las estaciones (~300 extra por carga fría).
3. Encender "Reads monitor" en el rol de los BC hoy, y esta noche pedir a
   los 2-3 BCs más activos una captura del panel: la línea "This device
   since…" y el top por colección nombran al responsable exacto, sin
   adivinar.

## Qué esperar
Con índice + V00045 activos, un día de cierre como hoy debería quedar en
15-25 mil, y los días normales en 5-15 mil. Si el jueves/viernes sigue
arriba de 30 mil, las capturas del monitor de los BC nos dan el objetivo
siguiente con nombre y apellido.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00045.
