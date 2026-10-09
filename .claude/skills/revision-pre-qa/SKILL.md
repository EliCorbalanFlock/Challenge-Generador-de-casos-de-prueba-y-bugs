---
name: revision-pre-qa
description: Antes de pasar una Historia de Usuario a QA, verifica si el codigo desarrollado en una rama cumple los criterios de aceptacion de la HU, comparandolo contra la documentacion tecnica y los casos de prueba existentes (si los hay). Si encuentra incumplimientos, los lista como bugs de desarrollo a resolver antes del pase a QA. Solo audita codigo para historias de backend: para frontend compara HU, documentacion y casos de prueba, pero no valida el codigo contra un diseño de Figma (fuera de alcance de esta version). Usar cuando se pide un autochequeo, una revision previa a QA, o verificar una HU antes de darla por terminada.
---

# Revision pre-QA de una Historia de Usuario

Chequeo proactivo que corre el propio equipo de desarrollo **antes** de pasar
una Historia de Usuario a QA, para encontrar incumplimientos de los
criterios de aceptacion antes de que los encuentre QA. No reemplaza el
testing de QA: es un filtro previo.

Complementa al skill `analizar-historia-bug` (que analiza un bug ya
reportado): este skill no parte de un bug, parte de la Historia y busca
activamente donde el codigo no cumple lo que esa Historia pide.

## Cuando usarlo

El usuario pide revisar una HU antes de pasarla a QA, hacer un autochequeo de
lo desarrollado, o verificar que el codigo cumple los criterios de aceptacion
antes de cerrar la tarea.

## Datos que vas a necesitar

- La clave de la Historia de Usuario.
- Si la Historia tiene codigo de **backend**: de donde sacarlo — un repo local
  (`repoPath` + `fromRef`/`toRef`) o un Merge Request de GitLab (`project` +
  `mrIid`).
- Si la Historia es de **frontend**, o mixta: no hace falta ubicacion de
  codigo de frontend para este skill (ver "Backend vs frontend" abajo).

Si no es obvio si la Historia es de backend o de frontend (o ambas), pedirlo
directamente al usuario antes de seguir. No asumirlo.

## Backend vs frontend: que se audita y que no

- **Backend**: se audita el codigo contra la documentacion tecnica y los
  criterios de aceptacion, igual que en `analizar-historia-bug`. Es la parte
  mas confiable porque la documentacion tecnica suele describir
  comportamiento verificable en codigo (reglas, validaciones, calculos).
- **Frontend**: en esta version **no se analiza el codigo de frontend**.
  Cumplir el diseño requiere compararlo contra un Figma (u otra fuente
  visual), y esta version del MCP no tiene esa capacidad. Para una Historia
  de frontend, el skill solo compara HU vs documentacion tecnica vs casos de
  prueba, y el informe debe decir explicitamente que la validacion visual
  contra el diseño queda pendiente de revision manual — nunca inferir ni
  simular que el diseño se cumple.
- Si la Historia tiene partes de backend y de frontend, aplicar cada regla a
  la parte que corresponda y dejarlo explicito en el informe.

## Fuente de datos

Mismo orden de prioridad que en `analizar-historia-bug`: MCP real del equipo
conectado en la sesion (Jira, documentacion, casos de prueba) primero, tools
`demo_jira_*` de este servidor como fallback de demo, y si ninguna tiene el
dato, pedirselo directamente al usuario. No inventar contenido de
documentacion, de la HU ni de casos de prueba.

## Pasos

1. **Traer la Historia de Usuario** y extraer sus criterios de aceptacion
   como una lista enumerada (si vienen en prosa, separarlos vos misma en
   puntos verificables).

2. **Traer la documentacion tecnica** enlazada a la Historia.

3. **Traer los casos de prueba**, si existen. Si todavia no hay casos de
   prueba cargados, no es un error: decirlo y seguir igual con el resto del
   chequeo.

4. **Si la Historia es (o incluye) backend**: traer el diff de codigo.
   - **Repo local**: `git_get_changed_files`, `git_get_diff`, y
     `git_get_file_content` si hace falta ver un archivo completo, entre
     `fromRef` y `toRef`.
   - **Merge Request de GitLab**: preferir un MCP de GitLab real conectado en
     la sesion (ej. `fedpat-gitlab`) si existe. Solo si no hay ninguno, usar
     `gitlab_get_mr_info` y `gitlab_get_mr_diff` de este servidor.

5. **Evaluar cada criterio de aceptacion por separado**, con uno de estos tres
   estados:
   - **Cumple**: el codigo (backend) implementa exactamente lo que pide el
     criterio, o el criterio no depende de codigo (ej. es puramente de
     redaccion/alcance) y la documentacion lo confirma.
   - **No cumple**: el codigo contradice el criterio, o falta la
     implementacion. Esto se convierte en un bug de dev (paso 6).
   - **No verificable con esta informacion**: tipicamente en frontend (sin
     Figma) o cuando falta documentacion/codigo para confirmar. No inventar
     un veredicto: declararlo no verificable y decir que falta para poder
     verificarlo.

6. **Por cada criterio "No cumple", armar una entrada de bug de dev**:
   titulo breve, criterio de aceptacion incumplido, evidencia puntual
   (archivo y fragmento de codigo, o ausencia de el), y severidad estimada
   (bloqueante si impide el flujo principal de la Historia, menor si es un
   detalle).

7. **Revisar los casos de prueba existentes** (si los hay) con el mismo
   criterio que en `analizar-historia-bug`: señalar si alguno prueba algo que
   no corresponde a la funcionalidad documentada.

8. **Emitir el informe** con esta estructura exacta:

   ```markdown
   ## Revision pre-QA — <clave de la HU>

   ### Resumen
   <1-2 lineas de que hace la Historia, y si es backend, frontend o ambas>

   ### Criterios de aceptacion

   | # | Criterio | Estado | Evidencia |
   |---|---|---|---|
   | 1 | <texto> | Cumple / No cumple / No verificable | <archivo:linea o motivo> |

   ### Bugs de dev detectados
   <uno por cada criterio "No cumple": titulo, descripcion, criterio
   incumplido, evidencia, severidad. "Ninguno" si no hay.>

   ### Casos de prueba
   <si no hay casos de prueba cargados, decirlo. Si los hay, listar
   observaciones por caso.>

   ### Limitaciones de esta revision
   <si la Historia es de frontend, aca va explicito: "No se valido el
   cumplimiento del diseño Figma: requiere revision manual". Si falto
   documentacion o repo, tambien listarlo aca.>

   ### Recomendacion
   <si hay bugs de dev: resolverlos antes de pasar la Historia a QA. Si el
   equipo usa una tool de Jira para cargar bugs de dev (ej.
   jira_create_bug_dev_ticket), ofrecer cargarlos ahi, pero solo si el
   usuario lo pide explicitamente — no crear tickets sin confirmacion.>
   ```

## Reglas importantes

- No marcar "Cumple" un criterio de frontend sin tener como verificarlo
  (documentacion, no Figma). Ante la duda, "No verificable", nunca "Cumple"
  por omision.
- Un bug de dev detectado aca tiene el mismo estandar de evidencia que un
  "Bug real" en `analizar-historia-bug`: tiene que poder señalarse la linea o
  la ausencia concreta de codigo que no cumple el criterio.
- Nunca crear tickets de Jira (bug de dev u otro) de forma automatica. Esta
  revision produce un informe para que el equipo decida; cargar los bugs es
  una accion aparte que requiere pedido explicito del usuario.
- Si la Historia no tiene ningun criterio de aceptacion redactado como tal,
  decirlo y pedir al usuario que los defina (o confirme cuales son) antes de
  evaluar "cumple/no cumple" — no inventar criterios.
