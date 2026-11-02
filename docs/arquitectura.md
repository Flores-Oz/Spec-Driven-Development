# Arquitectura y paso a Laravel

## Lo implementado en esta entrega
Este repositorio es un **vertical slice ejecutable** de SPEC-001. Se ha creado con Node.js 22 y SQLite porque el entorno de ejecución de la práctica no tiene Composer ni las extensiones PHP necesarias para arrancar Laravel. **No es un proyecto Laravel**, y por eso el README y el entregable lo declaran con claridad.

- `src/db.js`: esquema e índices; transacciones `BEGIN IMMEDIATE`; triggers de capacidad.
- `src/booking.js`: invariantes, validación de créditos comprometidos, FIFO, auditoría, notificaciones.
- `src/server.js`: API JSON, autenticación y permisos, CSRF, archivos estáticos.
- `src/seed.js`: datos 100% ficticios para demostrar reservas completas y espera.
- `public/`: UI de marca YogaFlow, vistas según rol.
- `tests/`: pruebas verificables de los CA de la spec.

## Migración prevista al stack del proyecto
Mantener contrato e invariantes; recrear con Laravel 12 / Livewire 3 / Tailwind / PostgreSQL 16:

| Este slice | Laravel definitivo |
|---|---|
| `users/sessions` + cookie | Laravel Auth + session driver |
| `booking.reserve/cancel` | `BookingService` en `app/Services` |
| `BEGIN IMMEDIATE` | `DB::transaction` y `lockForUpdate()` de `class_sessions` |
| SQL de esquema/índices | migrations y constraints PostgreSQL |
| `public/app.js` | componentes Livewire para agenda y ficha de clase |
| `audit_events/notifications` | modelos Eloquent + Notification interna |
| `tests/booking.test.js` | pruebas Feature PHPUnit/Pest sobre PostgreSQL |

**Obligatorio en Laravel:** bloqueo de la fila de sesión durante reserva/cancelación/promoción; transacciones para la operación completa, índices únicos, tests concurrentes sobre PostgreSQL. Ninguna verificación exclusivamente frontend protege un cupo.

## Seguridad y límites de la demostración
Sesiones HttpOnly y CSRF; hashes scrypt; datos locales ficticios y contraseña de demo pública **solo** para práctica. No publicar sin HTTPS, configuración de secretos, límites de solicitudes, pruebas de seguridad y reemplazar credenciales. Sin pasarela de pago ni envío externo de mensajes.
