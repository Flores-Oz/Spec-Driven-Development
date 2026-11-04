# Evidencia de implementación · SPEC-001 y SPEC-002

**Actualización:** 2 de noviembre de 2026, America/Guatemala.

**Resultado ejecutado:** 22 pruebas automatizadas aprobadas, 0 fallidas, 0 omitidas. Comando `npm.cmd test` sobre Node.js 22.16.0, con bases SQLite temporales: 10 pruebas de reservas, 7 de filtros y 5 de preparación de producción. La salida completa está en `test-run.txt`.

**Estado de la entrega:** implementación local verificada. La persona usuaria decidió dejar la publicación pendiente. Todavía no hay URL pública; no se ha enviado el formulario.

## SPEC-001 · Regresión de reservas

| Criterio | Evidencia | Resultado |
|---|---|---|
| CA-01 · límite 12, espera 13 y 14 | Test de 12 confirmadas + posiciones 1 y 2; test de competencia simultánea por último lugar; prueba de sesión ya llena | Cumple |
| CA-02 · saldo, duplicación, créditos | Reserva con saldo estable; prueba de error 409 y 422; créditos comprometidos | Cumple |
| CA-03 · cancelación y promoción FIFO | Promoción del primero, notificación interna, auditoría; saltar elegibilidad perdida | Cumple |
| CA-04 · roles y persistencia | 403 para cancelación ajena; CSRF HTTP; persistencia tras reapertura SQLite; cancelación administrativa | Cumple |

## SPEC-002 · Agenda por día e instructora

| Criterio | Evidencia ejecutada | Resultado |
|---|---|---|
| CA-F01 · agenda y opciones completas | `agenda.test.js` y navegador: todas las sesiones, orden, fechas/nombres únicos y opciones independientes de los resultados | Cumple |
| CA-F02 · fecha del estudio y combinación AND | Pruebas con fechas UTC que pertenecen al día anterior en Guatemala; filtro individual y combinado en lógica y navegador | Cumple |
| CA-F03 · contador, vacíos y limpieza | Navegador: contador inicial/parcial/vacío, combinación sin coincidencias, limpiar y agenda sin sesiones con mensaje distinto | Cumple |
| CA-F04 · conservación y reinicio | Navegador: detalle, navegación, reserva/cancelación, fecha que desaparece, cierre de sesión y recarga; unitarios para normalización independiente | Cumple |
| CA-F05 · reservas y saldo completos | Reserva y cancelación reales vía UI/API con SQLite en memoria; consultas de crédito y filas de reserva; una reserva fuera del filtro permanece en «Mis reservas» | Cumple |
| CA-F06 · acceso y móvil | Edge real: tres roles, labels asociados, `role=status`/`aria-live`, conservación del foco, controles >=44 px y ausencia de desbordamiento a 360 px | Cumple en las comprobaciones automatizadas |
| CA-D01 · preparación del arranque | 5 tests: configuración inválida, credenciales runtime y cookies seguras, rechazo de base local sin borrar datos, persistencia tras reiniciar y bloqueo del seed CLI en producción | Cumple localmente; alojamiento pendiente |

### Navegador y límites de la comprobación

`node tests/agenda-browser.cjs` se ejecutó contra el servidor real, con Edge/Chromium instalado y una base SQLite en memoria. La API no se sustituyó por respuestas simuladas. Se utilizaron sesiones ficticias de 2099 para que los escenarios no dependieran del día de ejecución. El proceso temporal no modifica `data/yogaflow.sqlite`.

El script comprueba escritorio a 1280 px y móvil a 360 px. En este entorno Windows fue necesario ejecutar el navegador con autorización del entorno; la ejecución final conserva el sandbox del navegador. No se instalaron dependencias npm ni un navegador nuevo. La prueba local no demuestra que exista un despliegue público.

La verificación de accesibilidad comprueba etiquetas, atributos, tamaños, foco y desbordamiento. No sustituye una prueba con lector de pantalla ni una auditoría WCAG completa.

### Archivos de prueba actuales

- `tests/booking.test.js` — casos CA-01 a CA-04
- `tests/agenda.test.js` — casos puros de filtros, fechas y conservación de datos
- `tests/production.test.js` — CA-D01
- `tests/agenda-browser.cjs` — CA-F01 a CA-F06 en navegador con servidor real
- `test-run.txt` — salida real del comando
- `agenda-browser-run.txt` — salida real de la comprobación en Edge

### Capturas de la entrega 3

- `screenshots/filtros-escritorio.png`
- `screenshots/filtros-movil.png`

### Referencias visuales de la entrega anterior

El registro de la entrega anterior documentaba capturas en Chromium con respuestas de prueba y ancho móvil de 390 px. Se conservan como referencias históricas; los resultados de la entrega 3 corresponden a la comprobación real descrita arriba.

- `screenshots/administradora.png`
- `screenshots/detalle-cupos.png`
- `screenshots/alumna.png`
- `screenshots/alumna-movil.png`

### Métricas de éxito

Los objetivos de búsqueda en menos de 30 segundos, hasta 3 acciones y recuperación de cero resultados en menos de 10 segundos **están pendientes de medir con cinco personas**, siguiendo el protocolo de SPEC-002. No se han realizado entrevistas ni pruebas de usabilidad. Las personas y cifras hipotéticas del ICP están identificadas como supuestos. La métrica técnica de regresión tiene 0 fallos en esta ejecución.

### Publicación y limitaciones

- Feature implementado sobre Node.js + SQLite para poder ejecutarlo sin Composer. Laravel está documentado como migración, **no ejecutado**.
- No se realizó despliegue público ni publicación de estos cambios en GitHub dentro de esta actualización, por decisión de la persona usuaria.
- `render.yaml` y el workflow de GitHub Actions están preparados, pero no se han ejecutado ni validado en sus servicios remotos. El servicio/disco de Render requieren un plan de pago; no se crearon recursos.
- Correos externos, compra de paquetes, check-in y consumos están fuera de SPEC-001.
- Las credenciales conocidas siguen siendo exclusivamente locales. El nuevo arranque de producción exige una contraseña runtime propia y rechaza una base que todavía admita el acceso local. El despliegue preparado es una demostración con datos ficticios, sin registro público de alumnas reales.

## Rediseño visual · 3 de noviembre de 2026

Se actualizaron acceso, navegación, saldo, agenda, administración y detalle con la identidad editorial de YogaFlow. Se añadió un panel de próxima reserva confirmada que abre el detalle existente, con estado vacío cuando no hay reservas confirmadas. No se modificaron API, datos ni reglas de negocio.

Validación ejecutada sobre el código actualizado:

- `npm.cmd test`: 22 pruebas aprobadas, 0 fallidas, 0 omitidas; Node.js 22.16.0, bases temporales. Se verificaron cupos, créditos, FIFO, autorización, filtros y configuración de producción.
- `node --check public/app.js`: correcto.
- `node tests/agenda-browser.cjs`: comprobación real en Edge con SQLite temporal. Los tres roles conservan los filtros y permisos. Reserva y cancelación siguen funcionando. Se verificaron el panel de próxima reserva, la apertura de su detalle y el estado vacío.
- Navegador: controles de filtros y limpieza >=44 px, labels, anuncio de resultados, conservación del foco y ausencia de desbordamiento a 360 y 1280 px. También se comprobó el acceso a 360 px.
- Capturas revisadas visualmente en `screenshots/rediseno/`: acceso en escritorio y móvil, agenda de alumna y administración. Los escenarios usan datos ficticios de 2099. El registro final del navegador está en `rediseno-browser-run.txt`.

El primer intento del navegador en el entorno restringido no respondió a CDP. La ejecución fuera de esa restricción, autorizada por el entorno, completó las comprobaciones con el sandbox de Edge habilitado. No se realizó publicación ni prueba con personas o lector de pantalla.
