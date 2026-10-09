---
name: analizar-historia-bug
description: Analiza un bug de Jira contra su Historia de Usuario, la documentacion tecnica enlazada, el codigo efectivamente desarrollado y los casos de prueba asociados. Usar cuando se pide analizar un bug, determinar si un bug es real o un cambio funcional, o validar si un caso de prueba corresponde a la funcionalidad documentada.
---

# Analizar Historia de Usuario + Bug

Este skill define como usar las tools del MCP `hu-bug-analyzer` para producir un
informe confiable sobre un bug: si es un bug real, un cambio funcional, o si el
problema esta en un caso de prueba mal definido.

## Cuando usarlo

El usuario pide analizar un bug de Jira, comparar funcionalidad contra
documentacion, o revisar si los casos de prueba de una historia corresponden a
lo que el codigo efectivamente hace.

## Datos que vas a necesitar

- La clave del Bug (ej: `DEMO-5042`) y/o de la Historia de Usuario relacionada
  (si no las tenes, el paso 1 explica como conseguirlas igual).
- De donde sacar el codigo desarrollado: un repo local (`repoPath` + `fromRef`
  / `toRef`) o un Merge Request de GitLab (`project` + `mrIid`). Si el usuario
  no aclaro cual de los dos, pedirselo antes de seguir — eso no tiene
  fallback automatico.

## Fuente de datos de Jira y documentacion: orden de prioridad

Este MCP incluye tools `demo_jira_*` que leen fixtures locales, pensadas
unicamente para probar el flujo sin credenciales. **No son la fuente
preferida.** Para traer el bug, la Historia, la documentacion tecnica o los
casos de prueba, segui siempre este orden:

1. **MCP real del equipo, si hay uno conectado en la sesion** (por ejemplo
   `fedpat-jira`, el MCP de doctec/Confluence del equipo, o cualquier otro con
   tools de Jira/documentacion). Preferir siempre estas tools reales: son
   datos de verdad, no fixtures de demo.
2. **Tools `demo_jira_*` de este MCP**, solo si no hay ningun MCP real de Jira
   conectado en la sesion.
3. **Pedirselo directamente al usuario** si ninguna de las dos anteriores
   tiene el dato (por ejemplo, la clave no existe en ningun MCP conectado, o
   no hay MCP de Jira en absoluto): pedir que pegue el texto de la Historia de
   Usuario y del bug reportado, y seguir el analisis con eso. No inventar
   contenido de documentacion, de la HU ni del bug.

## Pasos

1. **Traer el bug y la historia**, siguiendo el orden de prioridad de arriba.
   Del resultado, tomar el campo que identifique la Historia relacionada
   (`reportedAgainst` / `linkedIssues` en las tools `demo_jira_*`, o el campo
   equivalente del MCP real) y traer tambien esa Historia.

2. **Traer la documentacion tecnica.** Por cada link/referencia de
   documentacion que aparezca en la Historia, traerla siguiendo el mismo
   orden de prioridad (MCP real de documentacion → `demo_jira_get_documentation`
   → pedirsela al usuario). No continuar con una comparacion documental sin
   haber conseguido el contenido real de alguna de estas tres formas.

3. **Traer los casos de prueba**, con el mismo orden de prioridad (MCP real de
   gestion de casos de prueba, si el equipo tiene uno → `demo_jira_get_test_cases`
   → pedirselos al usuario).

4. **Traer el codigo desarrollado**, segun de donde venga:
   - **Repo local**: llamar `git_get_changed_files` y luego `git_get_diff` con
     el `repoPath`, `fromRef` y `toRef` indicados por el usuario. Si el diff
     es muy grande o hace falta ver un archivo completo, usar
     `git_get_file_content`.
   - **Merge Request de GitLab**: si hay un MCP de GitLab real conectado en
     la sesion (por ejemplo `fedpat-gitlab`), preferir sus tools (equivalentes
     a traer info y diff de un MR) para obtener datos reales. Solo si no hay
     ningun MCP de GitLab conectado, usar `gitlab_get_mr_info` y
     `gitlab_get_mr_diff` de este servidor (requieren `GITLAB_BASE_URL` y
     `GITLAB_TOKEN` configurados; si no lo estan, la tool lo indica — en ese
     caso pedirle al usuario que clone el repo o pegue el diff).

5. **Comparar y razonar**, en este orden:
   - ¿Que dice la documentacion que deberia pasar?
   - ¿Que dicen los criterios de aceptacion de la Historia? ¿Coinciden con la
     documentacion o hay alguna contradiccion entre ambas?
   - ¿Que hace el codigo realmente (segun el diff)?
   - ¿Hay tests existentes (en el diff o en el repo) que certifiquen el
     comportamiento actual para ese escenario puntual?
   - ¿Que describe el bug como comportamiento actual vs esperado?
   - ¿Los casos de prueba de la Historia validan exactamente lo que dice la
     documentacion, o prueban algo que no esta documentado / no existe en el
     dominio?
   - Si el bug describe como "esperado" un comportamiento que contradice la
     documentacion Y los criterios de aceptacion de la Historia, y el codigo
     (mas algun test existente) es consistente con esa documentacion: el
     comportamiento reportado como bug es, en realidad, el documentado. No
     corregirlo como si fuera un bug.

6. **Emitir el informe** con esta estructura exacta:

   ```markdown
   ## Informe de analisis — <clave del bug> / <clave de la HU>

   ### Resumen
   <1-2 lineas de la HU y el bug>

   ### Documentacion tecnica relevante
   <que dice la doc, citando la referencia>

   ### Codigo analizado
   <archivos relevantes del diff y que hacen>

   ### Casos de prueba
   <por cada caso: OK / cuestionable, y por que>

   ### Veredicto
   Una sola opcion: **Bug real** | **Cambio funcional** | **Caso de prueba
   incorrecto** | **Sin evidencia suficiente**

   ### Justificacion
   <por que, con referencia puntual a la linea de codigo, al parrafo de la doc,
   o al paso del caso de prueba que sustenta el veredicto>

   ### Recomendacion
   <que hacer: fix de codigo, actualizar doc, corregir o dar de baja un caso de
   prueba, pedir mas info>
   ```

7. **Publicar el informe como Artifact** (ademas de mostrarlo en el chat), si
   tenes disponible la tool Artifact. Cargar primero el skill
   `artifact-design`. Estructura de referencia (ver ejemplo publicado en esta
   conversacion si lo tenes a mano):
   - Encabezado tipo "expediente": clave del bug y de la HU, titulo (el
     summary del bug), y un badge de veredicto destacado arriba a la derecha,
     con color segun el veredicto (rojo/bad para "Bug real", ambar/warn para
     "Cambio funcional" o "Caso de prueba incorrecto", neutral para "Sin
     evidencia suficiente").
   - Una seccion por cada bloque del informe (Resumen, Documentacion,
     Codigo analizado, Casos de prueba, Justificacion, Recomendacion), cada
     una con un borde lateral de acento.
   - El codigo citado (fragmentos del diff, nombres de archivo, mapas/enums)
     en bloques o inline con tipografia monoespaciada.
   - Favicon 🔍. Titulo del artifact corto y especifico (ej. "Caso
     DEMO-5042"), nunca generico.
   - Si no tenes la tool Artifact disponible, no es un error: mostrar el
     informe en markdown en el chat como siempre.

8. **Si el usuario pide cargar el informe (o un resumen) como comentario en
   el ticket**: armar el texto exacto del comentario y mostrarselo al usuario
   primero. Postearlo (con la tool de comentarios del MCP de Jira real
   conectado, ej. `jira_add_comment`) solo despues de que el usuario confirme
   explicitamente — nunca asumir la confirmacion ni postear de forma
   preventiva. Es una accion visible para todo el equipo en el ticket.

## Reglas importantes

- No asumir informacion que ninguna tool devolvio. Si falta documentacion,
  codigo o casos de prueba, decirlo explicitamente y pedirlo al usuario en vez
  de completar con suposiciones.
- El veredicto "Bug real" requiere poder senalar la linea concreta de codigo
  que contradice la documentacion o el comportamiento esperado.
- Si un caso de prueba prueba un valor/estado que no aparece en la
  documentacion ni en el codigo (enum, lista de valores validos, etc.),
  marcarlo como **caso de prueba incorrecto**, no como bug.
- Si existe un test automatizado que certifica explicitamente el
  comportamiento que el bug reporta como incorrecto, tratarlo como evidencia
  fuerte de que ese comportamiento es intencional: no asumir que el test esta
  desactualizado solo porque alguien reporto un bug sobre ese escenario.
- No confundir "se comporta distinto a como lo hace otro sistema (legado, de
  referencia, de otro cliente, etc.)" con "es un bug". Si la documentacion y
  la Historia vigentes describen el comportamiento actual tal como esta
  implementado, la discrepancia con ese otro sistema es, como mucho, una
  propuesta de **cambio de regla de negocio** que requiere confirmacion de
  negocio antes de implementarse — no un bug a corregir de entrada. En ese
  caso, la recomendacion del informe debe pedir esa confirmacion explicita
  antes de tocar codigo, y citar el test existente que certifica el
  comportamiento actual.
