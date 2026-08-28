# ServiExpress · V00025 — Reglas duras del BC Report

Reemplaza la carpeta `src/` completa y `public/version.json`.

1. BUSCADOR en la lista de camiones bloqueados ("87 trucks can't be added"):
   se teclea el número del camión y muestra al instante por qué no está en el
   desplegable y quién lo agregó (aplica en el alta y dentro del reporte).

2. PROHIBIDO guardar un BC Report vacío: al crear, si no trae al menos un
   renglón de mantenimiento, el guardado se rechaza con el aviso
   "use Add lines and capture at least one truck before saving".
   (Los exentos —admin y roles con "Add outside window"— sí pueden, para
   correcciones.)

3. UN CAMIÓN SOLO POR SU ESTACIÓN: el desplegable del renglón ya solo ofrece
   camiones cuya estación actual coincide con la estación del reporte; los de
   otra estación aparecen en la lista de bloqueados con el motivo
   "belongs to Station X — this report is for Station Y". Se suma a lo que ya
   había: ya-agregado-en-la-ventana y en-taller/correctivo.

4. Conteo por estación: el aviso del módulo sigue mostrando al BC
   "X of Y trucks at your station added in this window · Z missing" con la
   lista de faltantes (con la ventana de la "semana siguiente" activa, esto se
   ve toda la semana porque la ventana está abierta).

5. UN SOLO BC REPORT POR BC POR VENTANA: si el BC ya creó el suyo dentro de
   la ventana vigente, el botón Add se deshabilita y el guardado se rechaza:
   "You already created your BC Report for this window (BC Report … · Station
   … · by …). Open that report and keep adding your trucks there." Se
   revalida al momento de guardar (por si lo creó en otra pestaña).

6. FALTANTES CON ESTACIÓN Y SUS BCs (vista admin/oficina): en el aviso del
   módulo, "See which ones" agrupa los camiones faltantes por estación y
   ahora cada grupo dice también QUIÉNES son los BC de esa estación
   ("BCs of this station: Orlando Pimentel, Jesse Belmarez"), tomados de los
   usuarios activos con esa estación en su alcance.

Verificado: `tsc -b` + `eslint` + `vite build` en limpio; versión V00025.
