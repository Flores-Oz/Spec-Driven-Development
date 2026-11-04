# SPEC-001 · Reservas de clases y lista de espera

**Estado:** validada para implementación · **Versión:** 1.1 · **Feature único:** cupos/reservas/espera

## 1. Problema
El estudio de Andrea programa clases de hasta 12 personas. Sin reserva centralizada, una alumna puede llegar y descubrir que no hay espacio. No existe lista de espera ni registro de quién debe recibir el lugar que queda libre. Las tarjetas de 10 clases producen dudas de saldo, así que las reservas deben validar crédito disponible, pero **no consumirlo**; la asistencia será otro feature.

**Persona principal:** alumna que reserva desde su teléfono. **Persona operativa:** administradora que consulta cupos y atiende cancelaciones.

## 2. Alcance del feature
- Ver las próximas sesiones con nombre, instructora, fecha/hora, cupos disponibles y estado de la propia reserva.
- Reservar con confirmación inmediata hasta 12 personas. Si está llena, ingresar a lista de espera con posición FIFO.
- Cancelar una reserva confirmada o retirarse de la espera.
- Promover a la primera alumna elegible cuando se libera un cupo y notificarlo internamente.
- La administradora puede consultar participantes/espera y cancelar una reserva a petición de una alumna.
- Permisos: la alumna solo ve y administra sus propias reservas, la administradora puede revisar todas. La instructora únicamente consulta horarios.

**Fuera de alcance:** cobro, asistencias y descuento de clases, compra/renovación de paquetes, creación/edición de clases, correos externos, automatizaciones WhatsApp.

## 3. Diseño de la solución
### Flujo
1. La alumna inicia sesión, ve sesiones futuras y saldo informativo: `créditos restantes`, `comprometidos en reservas confirmadas futuras` y `disponibles para reservar`.
2. Pulsa **Reservar**. El servidor comprueba autenticación/rol, fecha futura, sesión activa, ausencia de reserva/espera vigente y crédito disponible.
3. Dentro de una transacción escribe una reserva `confirmed` si hay menos de 12 plazas; en otro caso una entrada de espera `active` con posición implícita por `id` creciente.
4. Una cancelación de confirmada marca su reserva como `cancelled`, deja bitácora e intenta promover el primer elemento `active` por ID. Antes de promover valida crédito de esa alumna; si no tiene, marca el intento `skipped`, genera traza y comprueba el siguiente. La promoción crea una reserva confirmada y la notificación correspondiente.
5. Una retirada de espera marca `withdrawn` sin afectar las reservas confirmadas.

### Estado y datos
- `users`: id, nombre, correo, rol, hash de contraseña.
- `student_packages`: saldo total/consumido (consultado; sin cambios al reservar).
- `class_sessions`: cupo 12, fecha futura, instructora, estado.
- `reservations`: una fila por (sesión, alumna), estado `confirmed` o `cancelled`.
- `waitlist_entries`: intentos inmutables de entrada, estado `active/promoted/withdrawn/skipped`, ID para FIFO.
- `notifications`: avisos internos de confirmación, espera, cancelación y promoción.
- `audit_events`: eventos con actor, destinatario, sesión y detalle.

**Integridad:** `UNIQUE(class_id,user_id)` en reservas; índice único parcial de espera activa por (clase, alumna), restricciones y transacciones `BEGIN IMMEDIATE` para ocupación/espera/promoción. `créditos disponibles = max(0, créditos restantes - reservas futuras confirmadas)`. En una promoción hay que revalidar la elegibilidad.

**UX:** usar la skill `.agents/skills/yogaflow-brand/SKILL.md`. Vista alumna: «Mi espacio» con progreso de paquete, próxima reserva y lista de clases con plazas/espera. Vista administradora: «Hoy en el estudio» con agenda y panel lateral de participantes.

## 4. Criterios de aceptación verificables

**CA-01 · Cupo rígido y orden.** Dada una sesión futura activa con capacidad 12, cuando 12 alumnas distintas reservan, las 12 quedan confirmadas. La alumna 13 queda `active` en espera con posición 1 y la alumna 14 en posición 2. Ante solicitudes concurrentes nunca hay más de 12 confirmadas.

**CA-02 · Sin duplicación ni consumo.** Dada una alumna con paquete de 10 créditos, cuando reserva una sesión, su saldo **no se reduce**. Una segunda solicitud a la misma sesión devuelve conflicto `409` y no crea otra reserva/espera activa. Una alumna sin créditos disponibles (considerando compromisos futuros) recibe `422`.

**CA-03 · Cancelación y promoción FIFO.** Dada una sesión completa con dos alumnas esperando, cuando se cancela una reserva confirmada, la primera alumna elegible pasa a confirmada, la segunda conserva su posición relativa y la ocupación permanece en 12/12. El cambio queda auditado y la alumna promovida recibe notificación interna. Si la primera no tiene crédito al promover, se registra `skipped` y se intenta con la siguiente.

**CA-04 · Permisos y persistencia.** Dada una alumna autenticada, cuando intenta cancelar la reserva de otra alumna, el servidor responde `403` y el estado permanece inalterado. Después de reiniciar el proceso, las reservas, listas de espera y notificaciones siguen en SQLite. La administradora puede ver el grupo y cancelar cualquier confirmada.

## 5. Contratos HTTP (JSON)
- `POST /api/login` → `{email,password}` → sesión y `csrfToken`.
- `POST /api/logout` (CSRF).
- `GET /api/me` → usuario y saldos.
- `GET /api/classes` → próximas sesiones y cupos.
- `GET /api/classes/:id` → detalle; participante completo solo a admin.
- `POST /api/classes/:id/reserve` (CSRF) → estado `confirmed` o `waitlisted`, posición si procede.
- `POST /api/classes/:id/cancel` (CSRF) → cancela la propia; admin puede indicar `userId`.
- `GET /api/notifications` → avisos personales.

Errores controlados con `{error,code}`; estados 400/401/403/404/409/422. No confiar en el `userId` enviado por alumnas.

## 6. Decisiones de validación humana (mejoras sobre el prompt general)
- Se separó «reservar» de «asistir»; las reservas nunca descuentan créditos.
- Se definió explícitamente cómo impedir que diez créditos soporten más de diez reservas futuras confirmadas.
- Se aclaró el orden FIFO y la revalidación de crédito justo al promover.
- Se limitó la implementación a un solo feature; no se añaden CRUD generales ni correo externo.

## 7. Evidencia
Pruebas en `tests/` y resultados en `docs/evidence/criterios.md`.

## 8. Revisión visual · 3 de noviembre de 2026

Actualizar acceso, navegación, agenda y paneles con una composición editorial de estudio: fondo marfil, navegación clara, títulos serif, saldo en verde bosque y acentos terracota. Priorizar agenda y próxima reserva sobre tarjetas de indicadores repetidas. La próxima reserva confirmada abre el detalle existente; si no existe, mostrar un estado vacío. Mantener filtros, textos de estado, permisos y contratos de reserva. No incorporar módulos, servicios ni fuentes externas. Verificar los flujos existentes en navegador a 360 y 1280 px, controles táctiles de 44 px y pruebas de negocio.
