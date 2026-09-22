# ServiExpress · V00058 — Nuevo módulo "Fleet Report" + Rentals activables

Reemplaza la carpeta `src/` completa y `public/version.json`.
Colección nueva en Firestore: `fleetReports` (se crea sola con el primer
registro; las reglas publicadas ya la cubren).

## 1. Fleet Report (nuevo módulo en el menú)
Fusión de Fleet y BC Report: UN REGISTRO POR CAMIÓN.
- Formulario: todos los campos de Fleet (camión, entidad, estación, ruta,
  driver, escáner, gas card, S number, V-Truck, stops, observación) MÁS:
  Actual Mileage, Front L/Driver, Front R/Pass, Back L/Driver Out,
  Back L/Driver In, Back R/Pass Out y Back R/Pass In.
- TEMPORIZADOR: usa EXACTAMENTE el mismo horario de ventana que BC Reports
  (mismo reloj; si cambias la ventana en uno, cambia en el otro). Arriba se
  ve la cuenta regresiva y el "X of Y trucks added in this window".
- Reglas de la ventana, adaptadas a "un registro por camión":
    · Cada camión UNA vez por semana: los ya capturados desaparecen del
      desplegable y, si alguien lo intenta, el mensaje dice dónde está.
    · Camiones en taller / con correctivo abierto: fuera del desplegable,
      con el motivo.
    · Fuera de la ventana no se puede crear (los exentos sí, como siempre).
    · A diferencia de BC Reports, aquí NO aplica "un reporte por BC por
      semana": cada BC hace un registro por cada camión suyo.
- BOTONES DE MANTENIMIENTO: en el detalle de cada Fleet Report aparecen
  "Add corrective maintenance" y "Add preventive maintenance". Abren el alta
  de Maintenance YA PRELLENADA con lo capturado: tipo, camión, entidad,
  estación, escáner, millaje y los 6 cauchos. Solo falta completar lo
  propio del mantenimiento.
- CHECK DE VERIFICACIÓN (solo administradores): botón de check en cada fila
  para marcar el Fleet Report como revisado / con información correcta. Se
  pinta verde, guarda quién y cuándo lo verificó, y queda en la bitácora
  del registro. Otro clic lo desmarca. En "View as" no aparece.
- Permisos: "Fleet Report" aparece en la matriz de Roles como cualquier
  módulo (Ver, Crear, Editar…). Actívalo en los roles que lo usarán.

## 2. Rentals: botón encender / apagar
Mismo botón que Assets (icono de encendido) en la columna de acciones:
- Apagado = fila atenuada y el rental NO aparece en ninguna lista
  desplegable del app. Otro clic lo reactiva.
- Los rentals existentes arrancan todos ACTIVOS (nada desaparece al
  publicar).

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00058.
