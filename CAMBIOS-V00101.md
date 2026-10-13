# ServiExpress · V00101 — Arreglo del build de Cloudflare (UpdateNotice.css)

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

## Qué pasó

El build falló con:

```
Could not resolve "./UpdateNotice.css" from "src/components/layout/UpdateNotice.tsx"
```

El archivo SÍ venía en el paquete V00100 (520 bytes, en
`src/components/layout/`). Lo que falla es el repositorio: ese nombre no
llegó al commit con las mayúsculas exactas. Windows no distingue mayúsculas
y git conserva en su índice el nombre con el que se registró la primera vez;
el servidor de Cloudflare es Linux y sí distingue, así que no lo encuentra.

## Qué se cambió

La hoja se llama ahora **`UpdateNoticeBar.css`** y el componente la importa
con ese nombre. Al ser una ruta nueva, git la agrega limpia y el índice viejo
deja de estorbar. Si en tu repo quedó un `UpdateNotice.css` suelto, puedes
borrarlo: ya no lo usa nadie.

Verificado en Linux (mayúsculas sensibles, igual que Cloudflare): los 150
archivos de `src/` resuelven sus importaciones relativas, `tsc -b` y `eslint`
en limpio y `vite build` OK.

## Cómo publicar para que no vuelva a pasar

1. Borra la carpeta `src` del repositorio ANTES de copiar la nueva (no
   extraigas encima: si tu descompresor salta un archivo, el build cae así).
2. Copia `src` y `public` del paquete.
3. `git add -A src public` y revisa con `git status` que no quede ningún
   archivo marcado como borrado que no esperabas.

Para comprobar que un archivo llegó bien al repositorio:

```
git ls-files src/components/layout
```

Debe aparecer `UpdateNoticeBar.css` con esas mayúsculas exactas.

Versión V00101.
