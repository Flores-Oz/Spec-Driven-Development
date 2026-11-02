# Prompt de ejecución del agente · SPEC-001

> Lee y aplica `AGENTS.md`, `docs/specs/001-reservas-y-espera.md` y `.agents/skills/yogaflow-brand/SKILL.md` antes de escribir código. Implementa únicamente el feature SPEC-001. Prioriza las reglas de negocio y las pruebas automatizadas CA-01…CA-04. Usa la identidad editorial de YogaFlow sin recrear un dashboard genérico. Si encuentras una contradicción, corrige y versiona la spec primero; después modifica la implementación y vuelve a ejecutar las pruebas. No implementes facturación, asistencia, compra de paquetes ni envío automático de mensajes. Entrega código ejecutable, datos ficticios, instrucciones de instalación y evidencia de pruebas. No declares cumplimiento de criterios sin pruebas verdes.

## Validación y refinamiento de la spec

La formulación original del gran proyecto decía solo «validar que la alumna tenga clases disponibles» y «respetar lista de espera». Al convertirla en SPEC-001 se concretaron cuatro decisiones que antes eran ambiguas:

1. **Saldo:** una reserva no descuenta una clase, pero sí compromete un crédito frente a reservas futuras. Esto evita sobre-reservar los 10 créditos del paquete.
2. **Esperas:** la posición se establece por orden de registro (ID creciente), no por fecha de modificación o prioridad manual.
3. **Promoción:** no basta estar primera; se revalida crédito en el momento de promover y se registra el motivo si deja de ser elegible.
4. **Cupo concurrido:** el límite se comprueba en una transacción del servidor y con una barrera adicional de datos; no es un contador visual.

Estas correcciones se hicieron **antes de codificar** y quedaron fijadas en SPEC-001 v1.1. Los casos automáticos se escribieron en función de la spec. Las comprobaciones posteriores no exigieron otro cambio a los criterios.
