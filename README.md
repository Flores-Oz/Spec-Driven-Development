# YogaFlow · SDD: reservas y agenda filtrable

Entrega de **Spec Driven Development** para un pequeño estudio de yoga. Reservas de sesiones de 12 cupos con lista de espera FIFO, créditos y permisos por rol (SPEC-001), más filtros de agenda por día e instructora (SPEC-002). La entrega 3 incluye el ICP, la persona usuaria, criterios de aceptación y objetivos de éxito.

> **Estado técnico real:** demo funcional con Node.js 22+ y SQLite (módulo `node:sqlite`), **no** Laravel todavía. El plan para migrar al stack original Laravel 12 + Livewire 3 + Tailwind + PostgreSQL está en `docs/arquitectura.md`. No requiere `npm install` ni acceso a Internet.

## Inicio rápido

Requisitos: Node.js **22.13+**, terminal y navegador moderno.

```bash
npm run seed    # solo para una base de datos vacía; es opcional si arranca por primera vez
npm test        # pruebas automatizadas
npm start       # http://localhost:3000
```

Si prefieres no ejecutar `seed` el primer inicio en `npm start` crea datos de prueba automáticamente. Los datos se guardan en `data/yogaflow.sqlite` y persisten después de reiniciar.

### Credenciales ficticias

Contraseña para todas las cuentas: `YouYouMisterWithe#234`

- Administradora: `andrea@yogaflow.demo`
- Alumna: `maria@yogaflow.demo`
- Instructora (consulta): `camila@yogaflow.demo`

El formulario tiene botones para introducir estos usuarios de prueba. No usar estas credenciales en entornos públicos.

## Encontrar tu próxima clase 

Entra como María. En **Encuentra tu momento**, elige un día, una instructora o ambos. Las fechas corresponden a America/Guatemala; los resultados muestran sus cupos y el estado de tu reserva. «Limpiar filtros» vuelve a la agenda completa. **Mis reservas** y el saldo se mantienen completos aunque filtres otra clase.

Los filtros también están en las agendas de Andrea y Camila. Se conservan al abrir detalles, reservar, cancelar y cambiar de vista; se reinician al cerrar sesión o recargar la página.

```bash
npm test               # lógica de filtros, reglas de reservas y arranque de producción
npm run test:browser   # prueba real con Edge/Chrome/Chromium instalado
```

## Probar el feature

1. Entra como Andrea y abre **Yoga suave**: hay 12 personas confirmadas y 2 esperando.
2. Cancela una reserva de la lista: la primera persona de espera pasa automáticamente a confirmada, conservando el cupo 12/12.
3. Entra como María y mira el resumen: el saldo del paquete no se consume por reservar.
4. En una sesión con espacios, selecciona **Reservar lugar** y comprueba que aparece **Confirmada**.
5. Intenta reservar dos veces: el servidor responde `409` y no hay duplicados.
6. Prueba `npm test` para validar límite, FIFO, permisos, persistencia y créditos.

## Entregables SDD

- **Contexto persistente**: [`AGENTS.md`](AGENTS.md)
- **Spec de reservas**: [`docs/specs/001-reservas-y-espera.md`](docs/specs/001-reservas-y-espera.md)
- **ICP y persona**: [`docs/icp-y-persona.md`](docs/icp-y-persona.md)
- **Spec nueva con métricas**: [`docs/specs/002-filtros-de-agenda.md`](docs/specs/002-filtros-de-agenda.md)
- **Estado y guía de entrega 3**: [`docs/entrega-3.md`](docs/entrega-3.md)
- **Skill de marca**: [`.agents/skills/yogaflow-brand/SKILL.md`](.agents/skills/yogaflow-brand/SKILL.md)
- **Código funcional**: `src/`, `public/`
- **Evidencia y trazabilidad**: [`docs/evidence/criterios.md`](docs/evidence/criterios.md)
- **Arquitectura y migración**: [`docs/arquitectura.md`](docs/arquitectura.md)

