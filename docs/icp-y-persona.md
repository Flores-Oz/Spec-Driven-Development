# ICP y persona usuaria · Entrega 3

## Cliente ideal (ICP)

Un estudio pequeño de yoga, como el de Andrea, con una administradora, dos instructoras y clases de hasta 12 personas. Necesita coordinar reservas, cancelaciones y lista de espera sin que las alumnas dependan de mensajes para saber si tienen lugar. Utiliza paquetes de clases y necesita distinguir el saldo de los créditos comprometidos en reservas futuras.

El problema, los roles, el cupo y los créditos proceden de SPEC-001. Como hipótesis para orientar esta entrega, el estudio tiene entre 30 y 80 alumnas activas y hoy resuelve muchas consultas por WhatsApp. Estas cifras y el canal todavía no se han validado con clientes.

## Persona principal: Laura, alumna con poco tiempo

**Perfil hipotético:** 32 años, trabaja en horario de oficina y organiza su práctica desde el teléfono durante una pausa. Prefiere algunas instructoras y necesita encontrar rápidamente una clase que encaje en un día concreto. Su edad, ocupación y preferencias son supuestos permitidos por la consigna, no resultados de entrevistas.

- **Tarea:** encontrar una clase por día e instructora, revisar sus lugares y reservar.
- **Fricción:** recorrer toda la agenda para comparar fechas e instructoras.
- **Necesidad:** filtros comprensibles, resultados inmediatos y claridad cuando no hay coincidencias.
- **Resultado esperado:** encontrar una opción adecuada en menos de 30 segundos, sin perder de vista sus reservas ni su saldo.

## Persona operativa: Andrea, administradora

Andrea necesita revisar el grupo, resolver cancelaciones y acompañar la espera. Los filtros le permiten ubicar una sesión sin cambiar las reglas de cupo, créditos ni promoción FIFO. Su nombre y rol proceden del contexto del proyecto.

## Consecuencias para el diseño

La agenda incorpora un bloque «Encuentra tu momento» con dos controles visibles: «Día de la clase» e «Instructora». Muestra cuántas clases coinciden, permite limpiar la selección y mantiene «Mis reservas» a la vista aunque una clase reservada quede fuera del filtro. Las fechas se interpretan en la zona del estudio, America/Guatemala.

La mejora se limita a encontrar clases; no incorpora módulos de pagos, asistencias, compra de paquetes ni mensajes externos.
