# Evidencia de implementación · SPEC-001

**Resultado:** 10 pruebas automatizadas aprobadas, 0 fallidas. Ejecutadas mediante `npm test` sobre Node.js 22.16.0 con bases SQLite aisladas temporales.

| Criterio | Evidencia | Resultado |
|---|---|---|
| CA-01 · límite 12, espera 13 y 14 | Test de 12 confirmadas + posiciones 1 y 2; test de competencia simultánea por último lugar; prueba de sesión ya llena | Cumple |
| CA-02 · saldo, duplicación, créditos | Reserva con saldo estable; prueba de error 409 y 422; créditos comprometidos | Cumple |
| CA-03 · cancelación y promoción FIFO | Promoción del primero, notificación interna, auditoría; saltar elegibilidad perdida | Cumple |
| CA-04 · roles y persistencia | 403 para cancelación ajena; CSRF HTTP; persistencia tras reapertura SQLite; cancelación administrativa | Cumple |

### Archivos de prueba

- `tests/booking.test.js` — casos CA-01 a CA-04
- `test-run.txt` — salida real del comando

### Inspección visual

Se renderizaron pantallas de escritorio y móvil en Chromium con respuestas de prueba del servicio local y sin errores JavaScript. El ancho móvil comprobado fue 390px de contenido para una ventana de 390px, sin desplazamiento horizontal. **Estas capturas verifican el aspecto visual; no sustituyen a las pruebas de la API ni constituyen un despliegue público.**

- `screenshots/administradora.png`
- `screenshots/detalle-cupos.png`
- `screenshots/alumna.png`
- `screenshots/alumna-movil.png`

### Limitaciones transparentes

- Feature implementado sobre Node.js + SQLite para poder ejecutarlo sin Composer. Laravel está documentado como migración, **no ejecutado**.
- No se realizó despliegue público ni publicación en GitHub/Drive dentro de esta entrega.
- Correos externos, compra de paquetes, check-in y consumos están fuera de SPEC-001.
- Las credenciales son exclusivamente para uso local de demostración; no aptas para Internet.
