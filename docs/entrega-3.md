# Entrega 3 · YogaFlow

**Fecha de actualización:** 2 de noviembre de 2026 (America/Guatemala).

## Paso 1 · ICP y persona

Documento: [ICP y persona usuaria](icp-y-persona.md).

Cliente ideal: un estudio pequeño de yoga que necesita coordinar cupos, reservas y cancelaciones. Persona principal: Laura, una alumna que busca una sesión desde su teléfono durante una pausa de trabajo. Los datos inventados se identifican como hipótesis, sin atribuirles validación de entrevistas.

## Paso 2 · Una función que importa

Nueva SPEC: [Encontrar clases por día e instructora](specs/002-filtros-de-agenda.md).

La mejora permite combinar fecha e instructora en la agenda, comprobar cuántas clases coinciden y limpiar los filtros. Conserva visibles las reservas y el saldo completos. La interfaz diferencia una combinación sin coincidencias de una agenda sin próximas clases y funciona para los tres roles.

La nueva pantalla incorpora «Encuentra tu momento», dos controles con etiquetas y un resumen de resultados. Mantiene la identidad YogaFlow y adapta la búsqueda a la persona con poco tiempo. El cierre de sesión está disponible también en móvil.

La SPEC define criterios de aceptación automatizables y cuatro objetivos: encontrar una clase en menos de 30 segundos (4 de 5 personas), hacerlo en hasta 3 acciones, recuperarse de cero resultados en menos de 10 segundos (4 de 5 personas) y conservar las reglas de reservas sin regresiones.

**Métricas de uso:** pendientes de medir con personas. Las pruebas automatizadas comprueban comportamiento técnico; no representan una investigación de usabilidad.

Resultados reales y trazabilidad: [Evidencia](evidence/criterios.md).

## Paso 3 · Publicación

**Estado: pendiente por decisión explícita de la persona usuaria. URL pública: todavía no disponible.** La entrega no debe marcarse como enviada o publicada mientras falte la URL requerida por la consigna.

Se ha preparado [render.yaml](../render.yaml) para conservar el servidor Node.js y SQLite: una instancia, disco de 1 GB en `/var/data`, Node.js 22, `npm test` como validación, `npm run start:production` como arranque y `/healthz` como control de salud. El servicio/disco requieren un plan de pago, cuyo costo se debe revisar antes de crear recursos. No se creó ningún recurso ni se conectó una cuenta de alojamiento.

Para retomarlo:

1. Conectar la cuenta de Render y revisar el costo del servicio con disco persistente.
2. Subir los cambios revisados al repositorio y crear el Blueprint con `render.yaml`.
3. Configurar `DEMO_PASSWORD` mediante el panel, con una contraseña nueva de al menos 16 caracteres. El Blueprint ya declara las demás variables. No copiar la base local al disco de producción.
4. Esperar al despliegue y comprobar HTTPS, login, filtros, reserva, cancelación y conservación de datos tras reiniciar el servicio. La prueba de persistencia local no sustituye esa comprobación en el alojamiento.
5. Registrar aquí la URL real y proporcionar las credenciales ficticias de acceso por un canal privado a quien evalúe el proyecto.

El arranque de producción inicializa datos ficticios solo en una base vacía y rechaza la contraseña local conocida. No cambia las contraseñas existentes en cada inicio. La demostración conserva los datos entre personas con acceso; no incorpora registro público ni cuentas reales.

El workflow de [GitHub Actions](../.github/workflows/pruebas.yml) prepara Node.js 22 y ejecuta los tests. No se ha ejecutado aún en GitHub. Render esperará los checks antes de futuros despliegues automáticos. La configuración usa el [formato de Blueprints](https://render.com/docs/blueprint-spec) y el [disco persistente de Render](https://render.com/docs/disks); la validación remota del Blueprint está pendiente.

## Paso 4 · Formulario de la tarea

[Formulario de entrega](https://forms.gle/B8meCgnjdicbBHdd7).

**Estado: no enviado.** Retomar después de publicar y verificar la URL. No se han leído ni rellenado campos del formulario ni se han enviado datos personales.
