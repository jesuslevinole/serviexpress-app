# ServiExpress · V00112 — La contraseña de aplicación, con o sin espacios

Solo cambia `functions/`. El app no cambia (solo el número de versión).

## Dónde vamos

- V00111 arregló el nombre del servidor (`EBADNAME`): la conexión ya llega a
  Gmail.
- Ahora Gmail responde `535-5.7.8 Username and Password not accepted`: llega,
  pero rechaza las credenciales.

## El arreglo

Google muestra la contraseña de aplicación como cuatro bloques:
`abcd efgh ijkl mnop`. Hay que entregarla **sin espacios**; con ellos, el
rechazo es exactamente ese 535. Ahora la función detecta ese formato (cuatro
bloques de cuatro letras) y le quita los espacios sola.

Se respeta cualquier otra contraseña: una normal que lleve espacios de verdad
—`Mi Clave Normal 2026`— no se toca. Probado con los cuatro casos.

## Qué hacer

Si no estás seguro de qué guardaste en `SMTP_PASS`, hazlo definitivo en vez
de adivinar: genera una contraseña de aplicación nueva y vuelve a guardarla.

1. [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   con la sesión de `jesuslevinole@gmail.com` → borra la vieja → crea otra →
   copia las 16 letras del recuadro.
2. `firebase functions:secrets:set SMTP_PASS` → pégalas (con o sin espacios,
   ya da igual) → Enter.
3. `firebase deploy --only functions`

El paso 3 no es opcional ni aunque solo cambies el secreto: las funciones se
enlazan a la VERSIÓN del secreto al desplegarse, así que una versión nueva no
la toman hasta el siguiente deploy.

4. En el app: Trucks → "Automatic emails" → **Probar envío**.

Verificado: `node --check functions/index.js` OK y saneador probado con los
cuatro casos; `tsc -b` + `eslint` + `vite build` en limpio; versión V00112.
