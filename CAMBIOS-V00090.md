# ServiExpress · V00090 — Alerts con mínimo y máximo, Difference mileage en Fleet Report, regla visible y en Excel

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

## 1. Valor máximo por campo
En "Alerts" cada campo tiene ahora dos casillas:
- Minimum (red when ≤): en o bajo ese número, rojo.
- Maximum allowed (red when >): por encima de ese número, rojo.
Cualquiera puede quedar vacía (sin ese límite). No deja guardar un máximo
menor o igual al mínimo. Lo ya configurado se conserva como mínimo.

## 2. Difference mileage
- Fleet Report trae "Next mant (from truck)" (se copia del camión al elegirlo y
  queda fijo) y la columna calculada "Difference mileage" = Next mant − Actual
  Mileage. En el formulario se ve en vivo al teclear el millaje.
- "Difference mileage" aparece en Alerts; de fábrica: rojo en 0 o menos
  (camión pasado de mantenimiento). Esa misma regla aplica en los demás
  módulos que tienen Difference mileage.

## 3. Se dice cuándo se pone rojo
- En Alerts, junto a cada campo, la regla en palabras y en vivo:
  "Red when 30 or less, or above 120" / "No alert".
- En las tablas, al pasar el mouse por un número en rojo se ve su regla.

## 4. Excel
El Excel exportado pinta en rojo con las mismas reglas (mínimo y máximo) e
incluye "Difference mileage". Encima de cada columna con alerta va la regla
("Red when ≤ 30 or > 120") en rojo.

Verificado: `tsc -b` + `eslint` en limpio; versión V00090.
