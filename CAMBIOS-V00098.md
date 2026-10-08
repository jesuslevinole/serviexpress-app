# ServiExpress · V00098 — Elegir columnas del Excel y guardar la selección

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

## Al presionar "Export Excel"
El diálogo ahora muestra "Columns in the Excel (N of M)": una casilla por
cada columna que puede salir (en el orden del archivo), con atajos All / None.
- Marcas las que quieres y presionas Export: sale el Excel solo con esas.
- La selección se GUARDA: al exportar o con el botón "Save selection". La
  próxima vez el diálogo abre con esa misma selección.
- Se guarda por persona y por módulo (Fleet Report, Drivers, Trucks…), en la
  cuenta del usuario: le sigue en cualquier equipo. Si la cuenta no se pudo
  escribir, queda en ese equipo y el diálogo lo avisa.
- Una columna nueva que se agregue al módulo después sale marcada sola (no hay
  que reconfigurar).
- Export no se habilita si no hay al menos una columna marcada.
Aplica a todos los módulos; en Drivers/Trucks/Assets/Rentals también se puede
quitar la columna Status. El resto del diálogo (activos/inactivos, fechas) no
cambia. Corregido: las casillas de fecha del diálogo ya no salen blancas.

Verificado: `tsc -b` + `eslint` en limpio; versión V00098.
