# Ejemplo de informe generado

Este es el informe que produce un agente (Claude Code, con el MCP
`hu-bug-analyzer` conectado y el skill `analizar-historia-bug` activo) al
recibir el pedido:

> Analiza el bug DEMO-5042 contra su historia, la documentacion, el codigo en
> sample-repo (main vs feature/DEMO-5001-filtro-estado) y sus casos de prueba.

Generado siguiendo el flujo del skill paso a paso contra las tools reales
(`jira_get_issue`, `jira_get_documentation`, `jira_get_test_cases`,
`git_get_diff`). No es un texto escrito a mano para la demo: es el resultado
real de razonar sobre la salida de cada tool.

---

## Informe de analisis — DEMO-5042 / DEMO-5001

### Resumen
La Historia DEMO-5001 pide poder filtrar el listado de avisos de obra por
estado (Pendiente, Aprobado, Rechazado, Anulado). El bug DEMO-5042 reporta que
el filtro "Pendiente" no devuelve resultados, aunque existen avisos en ese
estado.

### Documentacion tecnica relevante
`DOC-FILTROS-AVISO` establece que los estados validos del dominio son
exactamente cuatro — Pendiente, Aprobado, Rechazado, Anulado — y que el filtro
debe comparar el estado persistido contra el valor elegido usando el mismo
enum `EstadoAviso`. Explicita ademas que no existe un estado "Cancelado".

### Codigo analizado
`AvisoObraFilterService.java` (agregado en la rama
`feature/DEMO-5001-filtro-estado`) resuelve el label de UI a un `EstadoAviso`
mediante un mapa fijo:

```java
private static final Map<String, EstadoAviso> ESTADO_POR_LABEL = Map.of(
    "Aprobado", EstadoAviso.APROBADO,
    "Rechazado", EstadoAviso.RECHAZADO,
    "Anulado", EstadoAviso.ANULADO
);
```

El mapa **no tiene entrada para `"Pendiente"`**. Como `filtrarPorEstado`
devuelve lista vacia cuando el label no esta en el mapa (`estado == null` →
`return List.of();`), cualquier filtro por "Pendiente" devuelve siempre una
lista vacia, sin importar los datos. Esto coincide exactamente con lo
reportado en el bug.

### Casos de prueba
- **DEMO-5001-TC1** (filtrar por Pendiente): correcto respecto de la
  documentacion — es justamente el caso que hoy falla por el bug.
- **DEMO-5001-TC2** (filtrar por Aprobado): correcto y consistente con el
  codigo (ese label si esta en el mapa).
- **DEMO-5001-TC3** (filtrar por "Cancelado"): **cuestionable**. La
  documentacion es explicita en que ese estado no existe en el dominio, y el
  enum `EstadoAviso` tampoco lo contempla. Este caso de prueba no corresponde
  a la funcionalidad documentada.

### Veredicto
**Bug real.**

### Justificacion
El codigo contradice directamente la documentacion: el mapa
`ESTADO_POR_LABEL` deberia cubrir los cuatro estados documentados pero omite
`"Pendiente"`, y esa omision produce el comportamiento exacto descripto en
DEMO-5042 (lista vacia para ese filtro). No es un cambio funcional: la
documentacion nunca contemplo excluir "Pendiente" del filtro.

### Recomendacion
1. Agregar `"Pendiente", EstadoAviso.PENDIENTE` al mapa `ESTADO_POR_LABEL` en
   `AvisoObraFilterService.java`.
2. Revisar `DEMO-5001-TC3`: dar de baja o corregir el caso de prueba, ya que
   prueba un estado ("Cancelado") que no existe en el dominio. Si el negocio
   efectivamente necesita ese estado, primero hay que actualizar
   `DOC-FILTROS-AVISO` y el enum `EstadoAviso` antes de mantener ese caso de
   prueba.
