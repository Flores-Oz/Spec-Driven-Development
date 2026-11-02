# AGENTS.md — Contexto persistente para YogaFlow

## Objetivo
YogaFlow es una aplicación de uso diario para un estudio pequeño de yoga (Andrea, dos instructoras y sus alumnas). Reducir fricción en reservas, cupos y seguimiento de clases; no construir un ERP. Las personas usuarias no son técnicas.

## Fuente de verdad y modo de trabajo SDD
1. Leer **este archivo**, `docs/specs/001-reservas-y-espera.md` y `.agents/skills/yogaflow-brand/SKILL.md` antes de modificar el feature.
2. La spec tiene prioridad sobre pedidos generales o suposiciones. Ante comportamientos ambiguos, proponer/registrar una corrección **primero en la spec** y después actualizar código y pruebas.
3. Cada criterio de aceptación debe tener una o más pruebas automatizadas. Nunca decir que una prueba pasó sin ejecutarla.
4. Cambiar solo lo necesario: entregar **un vertical slice** usable, no reimplementar los siete módulos de la visión original.
5. Los seeders usan datos ficticios; nada de secretos ni cuentas reales en el repositorio.

## Reglas del negocio
- Sesiones: capacidad fija de 12 (incluyendo simultaneidad).
- La reserva **no** descuenta clases. Un consumo futuro se realizará solo por asistencia confirmada y está FUERA de este feature.
- Para confirmar una reserva futura, debe quedar al menos un crédito no comprometido por otras reservas confirmadas futuras. La espera también requiere al menos uno al inscribirse.
- Una alumna puede tener un único estado activo por sesión: confirmada o en espera. Cancelar una reserva libera cupo y promueve en orden FIFO a la primera persona elegible.
- Un evento de cancelación/promoción genera trazabilidad y notificación interna.
- La autorización siempre se valida en servidor. Una alumna solo gestiona sus propias reservas; administración supervisa el grupo.

## Decisiones técnicas de esta entrega
- Esta **entrega ejecutable SDD** usa Node.js 22+ con el módulo integrado `node:sqlite`, HTTP nativo, HTML/CSS/JS sin dependencias para ejecutar y probar el vertical slice en un entorno sin Composer ni PHP-SQLite.
- La visión del producto completo sigue siendo **Laravel 12 + Livewire 3 + Tailwind + PostgreSQL**. El presente slice es un prototipo funcional con persistencia y pruebas, **no** debe presentarse como si ya fuese Laravel. `docs/arquitectura.md` describe cómo trasladar los invariantes al stack definitivo.
- SQLite se opera dentro de transacciones `BEGIN IMMEDIATE`; existe un índice único para impedir estados duplicados y se valida cupo/creditos en servidor. En Laravel/PostgreSQL se usarán transacciones y bloqueos de fila equivalentes.
- No integrar pagos, tienda, facturación, videos, expedientes, SMTP ni WhatsApp automático en este feature.

## Estándares
- Código y UX en español; nombres de tablas/funciones descriptivos y consistentes.
- Seguridad: contraseñas scrypt, cookies HttpOnly/SameSite, sesiones persistentes, CSRF, controles de rol, validación de entradas; credenciales del seed solo para pruebas locales.
- Accesibilidad: focus visible, labels reales, contraste y targets móviles; nunca depender solo del color.
- Para ejecutar: `npm test`, `npm run seed`, `npm start`.
- Antes de entregar revisar `docs/evidence/criterios.md` y documentar qué está realmente comprobado.
