---
name: yogaflow-brand
description: Aplica la identidad visual y principios de UX de YogaFlow a pantallas, componentes, mensajes y flujos del estudio de yoga. Usar al crear o modificar cualquier interfaz visible del proyecto.
---

# Skill — Dirección de marca YogaFlow

## Cuándo activarla
Cuando diseñes, implementes o revises cualquier página, formulario, estado vacío, notificación o componente de YogaFlow. Leer primero `references/design-tokens.md` de esta skill y consultar las capturas del repositorio en `references/`.

## Personalidad
Calma, cercanía, claridad y confiabilidad. La app debe sentirse como una herramienta boutique diseñada para un estudio pequeño; no una plantilla SaaS corporativa.

## Decisiones obligatorias
1. **Paleta**: marfil `#F7F4ED`, verde bosque `#234B3D`, salvia `#A7B8A4`, terracota `#C9745B`, blanco cálido `#FFFEFA`, gris `#77776F`.
2. **Tipografía**: títulos editoriales serif (Cormorant Garamond si está disponible; Georgia de respaldo); interfaz sans (DM Sans si está disponible; sistema de respaldo).
3. **Composición**: la agenda, el saldo y la disponibilidad son protagonistas; preferir listas jerarquizadas y paneles contextuales a filas de tarjetas KPI genéricas.
4. **Acción primaria única** por superficie, verbos específicos: «Reservar lugar», «Entrar en espera», «Cancelar mi reserva».
5. **Estados explícitos** además de color: «4 de 12 lugares», «Clase completa», «En espera · lugar 2», «Tu reserva está confirmada».
6. **Móvil primero en decisiones**: controles táctiles >=44px, sin tablas horizontales; foco visible, etiquetas claras y aria-live para feedback.
7. **Notificaciones honestas**: solo «Notificación interna registrada» cuando no hay email/WhatsApp externo.
8. **Nunca inventar módulos** ni añadir ilustraciones/animaciones si desvían del objetivo.

## Procedimiento de diseño
1. Identifica el rol, su tarea y la única decisión principal de la pantalla.
2. Dibuja jerarquía de lectura: encabezado contextual → estado actual → acción → detalle secundario.
3. Reutiliza tokens y clases compartidas; usa el mismo lenguaje en UI, errores y tests.
4. Revisa estados: vacío, completo, en espera, reservado, error, cargando y móvil.
5. Comprueba que una alumna pueda reservar sin necesitar instrucciones de uso.

## Antipatrones
Dashboard con seis tarjetas idénticas; gráficos de negocio irrelevantes; degradados fluorescentes; sombras grandes; lorem ipsum; botones decorativos; formulario para tareas de un clic; usar solo rojo/verde para diferenciar estados; fotos de yoga genéricas como decoración.

## Criterio de terminado
Una persona identifica su siguiente clase, plazas libres y estado de reserva en menos de un vistazo; el diseño es legible en escritorio y a 360px; conserva color, vocabulario y tipografía del producto.
