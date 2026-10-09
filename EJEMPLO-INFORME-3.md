# Ejemplo de informe generado — revision pre-QA (backend)

Tercer escenario de demo, usando el skill `revision-pre-qa` en vez de
`analizar-historia-bug`. Reutiliza la Historia `DEMO-5001` (filtro de avisos
por estado) y su codigo en `sample-repo`, pero desde el angulo contrario:
no hay ningun bug reportado todavia — es desarrollo revisando su propio
trabajo **antes** de pasarlo a QA.

Pedido al agente:

> Hace la revision pre-QA de DEMO-5001. Es un repo de backend, el codigo esta
> en sample-repo, rama feature/DEMO-5001-filtro-estado contra main.

---

## Revision pre-QA — DEMO-5001

### Resumen
La Historia pide poder filtrar el listado de avisos de obra por estado
(Pendiente, Aprobado, Rechazado, Anulado). Es una Historia de **backend**:
`AvisoObraFilterService.java` implementa el filtro.

### Criterios de aceptacion

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | El filtro debe permitir elegir uno de: Pendiente, Aprobado, Rechazado, Anulado | No cumple | `AvisoObraFilterService.ESTADO_POR_LABEL` solo mapea Aprobado, Rechazado y Anulado; falta "Pendiente" |
| 2 | Al aplicar el filtro, el listado muestra unicamente los avisos cuyo estado coincide exactamente | Cumple (para los labels mapeados) | `filtrarPorEstado` filtra por igualdad de `EstadoAviso`; correcto para Aprobado/Rechazado/Anulado |
| 3 | Si no se selecciona ningun valor, el listado muestra todos los avisos sin filtrar | Cumple | `filtrarPorEstado` devuelve `avisos` sin modificar cuando `estadoSeleccionado` es null o vacio |

### Bugs de dev detectados

**DEV-1 — Falta el label "Pendiente" en el mapa de filtros**
- Criterio incumplido: #1.
- Evidencia: `AvisoObraFilterService.java`, constante `ESTADO_POR_LABEL`, no
  tiene la entrada `"Pendiente" -> EstadoAviso.PENDIENTE`. Como
  `filtrarPorEstado` devuelve lista vacia cuando el label no esta en el mapa,
  filtrar por "Pendiente" siempre da un listado vacio.
- Severidad: bloqueante — es uno de los cuatro valores explicitos del
  criterio de aceptacion.

### Casos de prueba
`DEMO-5001-TC1` y `DEMO-5001-TC2` corresponden a la funcionalidad
documentada. `DEMO-5001-TC3` prueba un estado "Cancelado" que no existe en la
documentacion ni en el dominio (`EstadoAviso` no lo contempla): es un caso de
prueba a revisar, no una funcionalidad faltante.

### Limitaciones de esta revision
Ninguna — Historia de backend con documentacion y codigo disponibles.

### Recomendacion
No pasar esta Historia a QA todavia. Agregar
`"Pendiente", EstadoAviso.PENDIENTE` a `ESTADO_POR_LABEL` y volver a correr
esta revision antes del pase. Aparte, revisar `DEMO-5001-TC3` con quien
escribio el caso de prueba: probablemente deba corregirse o darse de baja.
