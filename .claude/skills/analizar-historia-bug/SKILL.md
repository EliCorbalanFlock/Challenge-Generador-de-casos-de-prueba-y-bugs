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

- La clave del Bug (ej: `DEMO-5042`) y/o de la Historia de Usuario relacionada.
- La ruta local del repo (`repoPath`) donde esta el codigo de esa historia, y
  las referencias de git a comparar (`fromRef` = rama base, `toRef` = rama o
  commit de la historia).

Si el usuario no te dio alguno de estos datos, pedilo antes de seguir.

## Pasos

1. **Traer el bug y la historia.** Llamar `jira_get_issue` con la clave del
   bug. Del resultado, tomar `reportedAgainst` (o `linkedIssues`) para
   identificar la Historia de Usuario, y llamar `jira_get_issue` de nuevo con
   esa clave.

2. **Traer la documentacion tecnica.** Por cada valor en `docLinks` de la
   Historia, llamar `jira_get_documentation`. Si la tool indica que no hay
   documentacion local, pedirle al usuario que la pegue o adjunte antes de
   continuar — no inventar contenido de documentacion.

3. **Traer los casos de prueba.** Llamar `jira_get_test_cases` con la clave de
   la Historia.

4. **Traer el codigo desarrollado.** Llamar `git_get_changed_files` y luego
   `git_get_diff` con el `repoPath`, `fromRef` y `toRef` indicados por el
   usuario. Si el diff es muy grande o hace falta ver un archivo completo, usar
   `git_get_file_content`.

5. **Comparar y razonar**, en este orden:
   - ¿Que dice la documentacion que deberia pasar?
   - ¿Que hace el codigo realmente (segun el diff)?
   - ¿Que describe el bug como comportamiento actual vs esperado?
   - ¿Los casos de prueba de la Historia validan exactamente lo que dice la
     documentacion, o prueban algo que no esta documentado / no existe en el
     dominio?

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

## Reglas importantes

- No asumir informacion que ninguna tool devolvio. Si falta documentacion,
  codigo o casos de prueba, decirlo explicitamente y pedirlo al usuario en vez
  de completar con suposiciones.
- El veredicto "Bug real" requiere poder senalar la linea concreta de codigo
  que contradice la documentacion o el comportamiento esperado.
- Si un caso de prueba prueba un valor/estado que no aparece en la
  documentacion ni en el codigo (enum, lista de valores validos, etc.),
  marcarlo como **caso de prueba incorrecto**, no como bug.
