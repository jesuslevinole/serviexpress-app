# ServiExpress · V00103 — URGENTE: el formulario ya no borra lo que estás escribiendo

Reemplaza la carpeta `src/` completa y `public/version.json`
(trae `src/firebase/config.ts`: que entre al commit).

## El borrado automático (error mío, entró en V00100)

**Qué pasaba.** Al elegir un camión y empezar a llenar el Fleet Report, a los
pocos segundos el formulario se vaciaba solo y no había manera de terminarlo.

**Por qué.** En V00100 agregué el alcance por campo ("Who sees it"). El dato
que lo resuelve se recalculaba en cada pintado de pantalla, y eso hacía que la
lista de campos del formulario se viera como "otra lista" aunque fuera la
misma. El formulario lo interpretaba como "me acaban de abrir de nuevo" y se
reiniciaba con los valores en blanco. Como el reloj de la ventana de captura
late **cada 15 segundos**, el formulario se borraba solo cada 15 segundos.

**Cómo se arregló, por partida doble:**

1. Ese dato ahora es estable: no cambia de identidad en cada pintado.
2. El formulario solo se reinicia por los motivos de verdad: al abrirse, al
   pasar a editar otro registro, al pedir un alta nueva ("Save and add
   another") o si cambian los campos del módulo. **Nada más puede borrar lo
   que estás escribiendo** — ni un catálogo que termina de cargar, ni el
   reloj, ni que llegue un registro nuevo de otra persona.

## Avisos largos dentro del formulario

La nota de "camiones que no se pueden agregar ahora" (en los renglones del BC
Report) pintaba hasta 60 renglones de corrido y empujaba los campos fuera de
la vista. Ahora muestra **6** y un botón **"Show all"**; el buscador por
número sigue igual. Sin barra de desplazamiento interna: se respeta la regla
de V00102 de un solo scroll.

Verificado: `tsc -b` + `eslint` en limpio, `vite build` OK; versión V00103.
