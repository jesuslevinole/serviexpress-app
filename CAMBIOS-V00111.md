# ServiExpress · V00111 — El correo fallaba por un salto de línea en el secreto

Solo cambia `functions/`. El app es igual que V00110 (si ya lo publicaste,
no hace falta volver a publicarlo; sube el número de versión y nada más).

## Qué pasaba

El registro de la función lo dijo exacto:

```
[notify] trucks create Dk9Gibqwb7pHlxnrFyjh: error: queryA EBADNAME smtp.gmail.com
```

El disparador se ejecutó, encontró la configuración de la vista y resolvió
los destinatarios. Lo único que falló fue conectarse al servidor: `EBADNAME`
significa que el nombre no es válido. Y `smtp.gmail.com` lo es — así que lo
guardado en el secreto llevaba algo invisible de más: el salto de línea que
mete Git Bash al pegar, un espacio al final o unas comillas.

## El arreglo

La función ahora **limpia los cinco secretos** antes de usarlos: les quita
espacios, saltos de línea y comillas alrededor. No hay que volver a
escribirlos; el valor que ya está guardado se limpia al leerlo.

Se probó contra los cuatro casos que rompen: `"smtp.gmail.com\r\n"`,
`" smtp.gmail.com "`, `'"smtp.gmail.com"'` y `"'smtp.gmail.com'"`. Los cuatro
quedan en `smtp.gmail.com`.

Esto importa más allá del host: un `\r` colado en `SMTP_PASS` habría dado un
*Invalid login* imposible de diagnosticar, porque la clave se ve bien en
pantalla.

## Qué hacer

```
firebase deploy --only functions
```

Y después, en el app: Trucks → "Automatic emails" → **Probar envío**.

Verificado: `node --check functions/index.js` OK, saneador probado con los
cuatro casos; `tsc -b` + `eslint` + `vite build` en limpio; versión V00111.
