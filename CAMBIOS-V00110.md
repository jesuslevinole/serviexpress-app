# ServiExpress · V00110 — Los correos salen por SMTP propio, sin Resend

Igual que V00109 en el app; lo que cambia es **cómo envía** la Cloud
Function. Se publican las dos partes: `src/` + `public/` (el app) y
`functions/` (`firebase deploy --only functions`).

## Qué cambió

Fuera Resend. La función ahora envía por **SMTP**, o sea con el buzón de
correo que la empresa ya tiene: Google Workspace, Microsoft 365 o el del
hosting. No hay que contratar ni verificar nada con terceros, y el remitente
es una dirección de ustedes de verdad.

Por dentro: `nodemailer` sobre una conexión SMTP que se reutiliza entre
avisos (abrir una por correo es lento y algunos proveedores lo castigan). Si
la conexión falla, se descarta para que el siguiente aviso abra una limpia.

Los destinatarios van en "Para", no en copia oculta: si el remitente es un
`noreply@` que no existe como buzón, mandárselo a él mismo rebotaría.

## Secretos nuevos (los de Resend ya no se usan)

```
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
firebase functions:secrets:set MAIL_FROM
```

`PASOS-DESPLIEGUE.md` trae los valores exactos para Google Workspace,
Microsoft 365 y hosting propio, y los dos avisos que hacen fallar esto a
todo el mundo la primera vez:

- **Gmail/Workspace**: la contraseña NO es la del usuario, es una
  **contraseña de aplicación** (16 letras, exige verificación en dos pasos).
- **Microsoft 365**: trae el **SMTP AUTH apagado** por defecto; hay que
  encenderlo para ese buzón en el centro de administración.

Puerto 465 (SSL) o 587 (STARTTLS). El 25 no sirve: Google Cloud lo bloquea.

## Lo demás no cambia

Disparadores automáticos al crear y al editar, reglas por campo
(*Status → APROBADO*), aviso a quien capturó el registro, bitácora en
`messages_log` y el botón **"Probar envío"**, que ahora muestra el error
literal del servidor de correo: *Invalid login*, *SMTP AUTH disabled*,
*Connection timeout*…

Verificado: `tsc -b` + `eslint` en limpio, `vite build` OK,
`node --check functions/index.js` OK, `nodemailer` instalado y probado en
esta máquina (6.10.1, API correcta); versión V00110.
