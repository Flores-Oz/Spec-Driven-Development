# SPEC-002 · Encontrar clases por día e instructora

**Estado:** definida para implementación · **Versión:** 1.0 · **Entrega:** 3

## 1. Problema y persona

Laura necesita encontrar desde su teléfono una sesión compatible con su día disponible y su instructora preferida. Recorrer todas las sesiones añade fricción antes de reservar. El ICP y los supuestos de esta persona se documentan en `docs/icp-y-persona.md`.

**Historia:** Como alumna, quiero filtrar la agenda por día e instructora para encontrar rápidamente una clase que encaje conmigo y reservar con información de cupo actualizada.

## 2. Alcance y decisiones

- Añadir filtros a la agenda de alumna, administradora e instructora, incluida la agenda de la portada administrativa.
- «Día de la clase» selecciona una fecha concreta de las próximas sesiones; «Instructora» selecciona un nombre presente en la agenda. Los valores iniciales son «Todos los días» y «Todas las instructoras».
- Ambos filtros se combinan con AND y se aplican al cambiar la selección, sin botón de envío ni peticiones nuevas. Se filtran únicamente las sesiones futuras que ya devolvió la API autenticada.
- La fecha de una sesión se calcula en **America/Guatemala**, igual que la hora mostrada; nunca se toma directamente el día UTC ni la zona del dispositivo.
- Las opciones proceden de la agenda completa, no del subconjunto filtrado. Se ordenan las fechas ascendentemente y los nombres alfabéticamente en español. Las sesiones mantienen su orden cronológico.
- Mostrar el número de coincidencias y una acción «Limpiar filtros». Distinguir una agenda vacía de una combinación sin resultados.
- Mantener la selección al abrir/cerrar detalles, reservar, cancelar y navegar por las vistas de la misma sesión. Cerrar sesión reinicia ambos filtros. Una recarga completa también los reinicia; no se guardan datos en localStorage.
- «Mis reservas», saldo y resumen administrativo siempre utilizan la agenda completa. Filtrar no oculta ni altera esos compromisos.
- Si una actualización elimina la fecha o instructora seleccionada de la agenda, reiniciar solo esa selección al valor inicial.
- Mantener cupos, créditos, autorizaciones, estados y promoción FIFO de SPEC-001. El filtrado no concede permisos y no sustituye validaciones del servidor.

**Fuera de alcance:** filtros de historial, cambios de horario, creación de sesiones, favoritos, telemetría externa y cambios de stack de la aplicación.

## 3. Flujo e interfaz

Después del saludo y el saldo, la agenda de la alumna presenta «Encuentra tu momento», una frase breve sobre elegir día e instructora y los dos selectores con etiquetas reales. Debajo aparece un resumen accesible de resultados y la lista con cupos/estado propios. En móvil los controles se apilan sin desplazamiento horizontal. La experiencia mantiene la marca de YogaFlow y controles táctiles de al menos 44 px.

Si no hay coincidencias: «No hay clases con estos filtros» y la opción de limpiarlos. Si la API no devuelve sesiones: «No hay clases próximas»; no se presenta como un error. Se conserva el foco del control tras actualizar resultados y el resumen usa `role="status"` o `aria-live="polite"`.

## 4. Criterios de aceptación automatizables

| ID | Escenario y resultado esperado |
|---|---|
| CA-F01 | Sin selección se muestran todas las sesiones, en su orden original. Las opciones de fecha/nombre son únicas y ordenadas; se derivan de la agenda completa. |
| CA-F02 | Seleccionar un día muestra solo las sesiones de esa fecha en America/Guatemala, incluso si el día UTC difiere. Seleccionar una instructora muestra solo sus sesiones. Combinar ambos aplica AND. |
| CA-F03 | El contador coincide con los resultados. Una combinación vacía muestra el mensaje específico. «Limpiar filtros» restaura ambos valores y todas las sesiones; una agenda vacía tiene un mensaje distinto. |
| CA-F04 | Abrir/cerrar detalle, navegar y refrescar tras reservar o cancelar conservan los filtros válidos. Salir de sesión los reinicia. Una selección que deja de existir se reinicia sin borrar el otro filtro válido. |
| CA-F05 | Con filtros activos, una alumna puede reservar/cancelar desde el detalle con el contrato existente. Sus reservas y saldo completos siguen visibles. Los tests de cupo 12, créditos, FIFO, CSRF y autorización de SPEC-001 continúan pasando. |
| CA-F06 | Los filtros tienen labels asociados, foco conservado, resumen anunciado y controles de al menos 44 px. A 360 px no hay desbordamiento horizontal. Los tres roles pueden filtrar la agenda sin ampliar sus permisos. |

## 5. Métricas de éxito y cómo medirlas

Estos valores son **objetivos**, no resultados obtenidos. La aplicación no recopila analítica externa.

| Métrica | Objetivo | Método |
|---|---|---|
| Éxito al encontrar una clase | Al menos 4 de 5 personas encuentran y abren una sesión adecuada en menos de 30 segundos | Prueba moderada desde la agenda: pedir un día y una instructora que tengan coincidencia, cronometrar hasta abrir el detalle. |
| Esfuerzo de búsqueda | Como máximo 3 acciones: elegir día, elegir instructora, abrir clase | Registrar acciones durante la misma prueba; separar errores y solicitudes de ayuda. |
| Recuperación ante cero resultados | Al menos 4 de 5 personas recuperan la agenda completa sin ayuda en menos de 10 segundos | Preparar una combinación sin coincidencias y pedir volver a ver todas las clases. |
| Integridad de reservas | 0 regresiones en los criterios de SPEC-001 | Ejecutar `npm test` sobre bases temporales y registrar el resultado real. |

Registrar la prueba humana en `docs/evidence/criterios.md` cuando se realice, sin datos personales. Hasta entonces, las métricas de uso permanecen **pendientes de medir**. No existe una línea base de usabilidad medida para la entrega anterior.

## 6. Publicación y evidencia

La entrega requiere una URL accesible. El proyecto funcional usa Node.js y SQLite; su alojamiento debe ejecutar el servidor y conservar la base. GitHub Pages puede alojar una presentación o una demo simulada, pero no cumple por sí solo la persistencia y API de esta aplicación. Registrar plataforma, URL, acceso, limitaciones y pruebas realmente ejecutadas en `docs/evidence/criterios.md` y `docs/entrega-3.md`. Nunca presentar una URL prevista como un despliegue comprobado.

### Preparación del alojamiento Node.js

La configuración propuesta es Render, con una sola instancia y disco persistente en `/var/data`. El servicio/disco requieren un plan de pago; prepararlos en el repositorio no autoriza contratar recursos. La publicación queda condicionada a conectar una cuenta y resolver el costo con la persona usuaria.

Se publicará una demostración funcional con datos ficticios. En producción no se deben habilitar las credenciales locales conocidas: el arranque exige una contraseña propia de al menos 16 caracteres mediante `DEMO_PASSWORD`, una ruta absoluta `DB_PATH` y cookies seguras. Esa contraseña se usa solo al inicializar la base vacía y no cambia cuentas en reinicios. Si una base existente todavía admite la contraseña del seed local, el arranque se rechaza sin alterar los datos. Las cuentas se identifican con los correos ficticios ya existentes; la contraseña de acceso se comparte por un canal privado, fuera del repositorio. El formulario público oculta los botones y la contraseña del seed local. No se incorporan cuentas reales ni registro de usuarias.

**CA-D01 · Arranque reproducible:** el comando de producción rechaza configuración incompleta o la contraseña local, inicializa una base vacía con la contraseña configurada, conserva reservas/cuentas al reiniciar y sirve cookies `Secure` y configuración sin accesos locales. Se comprueba automáticamente. El inicio local sigue usando la demo existente.
