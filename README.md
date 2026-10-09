# hu-bug-analyzer (MCP)

Servidor MCP que ayuda a analizar un bug de Jira contra su Historia de Usuario,
la documentacion tecnica, el codigo efectivamente desarrollado y los casos de
prueba asociados — para determinar si el bug es real, un cambio funcional, o
si el problema esta en un caso de prueba mal definido.

Pensado para que cualquier equipo de desarrollo lo use desde Claude Code (u
otro cliente MCP): el servidor expone herramientas de lectura (demo de Jira,
git), y el razonamiento/comparacion lo hace el agente, guiado por el skill
incluido. Si el equipo ya tiene un MCP de Jira propio conectado (como
`fedpat-jira`), el skill le indica al agente que lo use a el en vez de las
tools de demo de este servidor — ver "Jira: no reinventar la rueda" abajo.

## Por que un MCP y no un script

Un servidor MCP no "calcula" el veredicto: expone datos (issue, documentacion,
diff de codigo, casos de prueba) como tools. Quien arma el informe es el
agente (Claude), siguiendo el flujo del skill `analizar-historia-bug`. Esto
hace que el sistema razone caso por caso en vez de aplicar una heuristica
rigida, y que cualquiera pueda pedirle al agente que profundice o repregunte.

## Estado actual (PoC para la jornada de IA)

- **Jira**: las tools `demo_jira_*` de este servidor leen fixtures locales
  (`issues.json`, `testCases.json`, `docs.json` en `fixtures/`), no la API
  real de Jira — son solo para poder probar el flujo sin credenciales. No es
  el camino recomendado para uso real: ver la seccion "Jira: no reinventar la
  rueda" mas abajo.
- **Codigo**: se analiza un repo git **local** (parametro `repoPath`), via
  `git diff` entre dos referencias (rama base vs rama/commit de la historia).
  No depende de GitLab ni de ningun token. Esta es la parte que todo equipo
  necesita y que normalmente no tiene ya resuelta via otro MCP.
- Se incluye `sample-repo/`, un repo git de juguete con dos escenarios (ver
  "Demo" abajo), para poder probar el flujo sin tocar ningun repo ni dato de
  ningun cliente.

## Jira: no reinventar la rueda

La mayoria de los equipos que podrian usar este MCP ya tienen conectado un
MCP de Jira propio (en FedPat, `fedpat-jira`; en otro equipo, el que sea).
Por eso este servidor no implementa un cliente real de la API de Jira: el
skill `analizar-historia-bug` le indica al agente que, si hay un MCP de Jira
(o de documentacion tecnica, o de gestion de casos de prueba) conectado en la
sesion, lo use a ese para traer los datos reales — y que recurra a las tools
`demo_jira_*` de este servidor solo como fallback para probar el flujo sin
esa conexion. Si ninguna de las dos fuentes tiene el dato, el skill le pide
directamente al usuario que pegue el texto de la Historia de Usuario y del
bug reportado. Ver el detalle en
`.claude/skills/analizar-historia-bug/SKILL.md`.

## Tools expuestas

| Tool | Que hace |
|---|---|
| `demo_jira_get_issue` | [Demo] Trae un issue (HU o Bug) desde fixtures: resumen, descripcion, estado, issues enlazados, links a documentacion. Usar solo si no hay un MCP de Jira real conectado. |
| `demo_jira_get_test_cases` | [Demo] Trae, desde fixtures, los casos de prueba asociados a una Historia de Usuario. |
| `demo_jira_get_documentation` | [Demo] Trae, desde fixtures, el contenido de una documentacion tecnica enlazada a un issue. |
| `git_get_changed_files` | Lista los archivos modificados entre dos referencias de un repo git local. |
| `git_get_diff` | Trae el diff completo entre dos referencias de un repo git local. |
| `git_get_file_content` | Trae el contenido completo de un archivo en una referencia puntual. |

## Instalacion

```bash
npm install
npm run build
npm run setup:sample-repo   # genera sample-repo/ (no se versiona, ver mas abajo)
```

`sample-repo/` tiene su propio `.git` (es un repo de verdad, con ramas), asi
que no se comitea dentro de este repo: se genera localmente a partir de
`scripts/setup-sample-repo.sh`. Volver a correr ese script en cualquier
momento lo regenera desde cero.

## Uso desde Claude Code

Registrar el servidor (ajustar la ruta absoluta al `dist/index.js` compilado):

```bash
claude mcp add hu-bug-analyzer -- node "C:/ruta/a/mcp-hu-bug-analyzer/dist/index.js"
```

o agregarlo a `.mcp.json` del proyecto donde se quiera usar:

```json
{
  "mcpServers": {
    "hu-bug-analyzer": {
      "command": "node",
      "args": ["C:/ruta/a/mcp-hu-bug-analyzer/dist/index.js"]
    }
  }
}
```

El skill `.claude/skills/analizar-historia-bug/SKILL.md` de este repo describe
el flujo paso a paso. Para usarlo desde otro proyecto, copiar esa carpeta a
`~/.claude/skills/` (nivel usuario) o al `.claude/skills/` del proyecto donde
se quiera invocar.

## Demo

`fixtures/` + `sample-repo/` incluyen dos escenarios, pensados para mostrar
veredictos opuestos. Los identificadores son ficticios (`DEMO-####`): los
casos estan inspirados en situaciones reales pero anonimizados a proposito,
porque este repo es publico.

### Escenario 1 — Bug real

- **Historia `DEMO-5001`**: filtrar avisos de obra por estado (Pendiente,
  Aprobado, Rechazado, Anulado), documentada en `DOC-FILTROS-AVISO`.
- **Bug `DEMO-5042`**: el filtro "Pendiente" no devuelve resultados.
- **Codigo** (`sample-repo`, rama `feature/DEMO-5001-filtro-estado` vs
  `main`): el mapa `ESTADO_POR_LABEL` de `AvisoObraFilterService.java` no
  tiene la entrada `"Pendiente"` → confirma que el bug es real.
- **Caso de prueba `DEMO-5001-TC3`**: prueba un estado `"Cancelado"` que no
  existe ni en la documentacion ni en el codigo → caso de prueba mal
  definido, no un bug.

> Analiza el bug DEMO-5042 contra su historia, la documentacion, el codigo en
> `sample-repo` (main vs feature/DEMO-5001-filtro-estado) y sus casos de
> prueba.

Veredicto esperado: **Bug real**, mas la observacion sobre `DEMO-5001-TC3`.
Ver `EJEMPLO-INFORME.md`.

### Escenario 2 — Bug que contradice la documentacion y la HU

- **Historia `DEMO-6010`**: forzar "Denunciar SRT" a "Sí" cuando el
  seguimiento tiene alguna actividad denunciable cargada (nueva o
  preexistente), documentada en `DOC-DENUNCIA-SRT`.
- **Bug `DEMO-6042`**: reporta como error que, al destildar manualmente
  "Denunciar SRT" con una actividad denunciable ya cargada de antes, el
  sistema lo vuelva a forzar a "Sí".
- **Codigo** (`sample-repo`, rama `feature/DEMO-6010-denuncia-srt` vs
  `main`): `SeguimientoObraService.procesarRequiereDenunciarSrt` hace
  exactamente lo documentado, y un test existente
  (`..._actividadDenunciablePreexistente_fuerzaSi`) certifica ese mismo
  escenario como intencional.
- **Caso de prueba `DEMO-6010-TC3`**: valida el comportamiento documentado —
  contradice directamente lo que el bug espera.

> Analiza el bug DEMO-6042 contra su historia, la documentacion, el codigo en
> `sample-repo` (main vs feature/DEMO-6010-denuncia-srt) y sus casos de
> prueba.

Veredicto esperado: **Cambio funcional** (no es un bug) — el comportamiento
reportado como incorrecto es el documentado, el pedido por la HU y el
certificado por un test existente; lo que correspondería es pedir
confirmación de negocio antes de tocar código. Ver `EJEMPLO-INFORME-2.md`.

Para probar las tools sin pasar por un cliente MCP completo:

```bash
npm run smoke
```

## Proximos pasos (fuera del alcance de hoy)

- Probar el skill con un MCP de Jira real conectado en paralelo (ver "Jira:
  no reinventar la rueda") y ajustar las instrucciones si el agente no elige
  bien entre la tool real y las `demo_jira_*`.
- Tool opcional para traer el diff de un Merge Request via API de GitLab,
  como alternativa a un repo local, para equipos que no quieran clonar el
  repo localmente.
- Si algun equipo no tiene ningun MCP de Jira propio, recien ahi evaluar
  agregar un cliente real a `src/data/jiraStore.ts` (`JIRA_BASE_URL`,
  `JIRA_EMAIL`, `JIRA_API_TOKEN` por variables de entorno) manteniendo la
  misma firma de funciones — no es el camino por defecto.
