# Ejemplo de informe generado — bug que contradice la documentacion y la HU

Segundo escenario de demo: a diferencia de `EJEMPLO-INFORME.md` (bug real),
aca el bug reportado **no es un bug**: contradice tanto la documentacion
tecnica como los criterios de aceptacion de la propia Historia de Usuario, y
el codigo (mas un test que certifica el comportamiento) es consistente con
ambas. Inspirado en un caso real de analisis de bug vs. comportamiento de un
sistema de referencia, con identificadores anonimizados (claves `DEMO-####`
ficticias) por tratarse de un repo publico.

Pedido al agente:

> Analiza el bug DEMO-6042 contra su historia, la documentacion, el codigo en
> sample-repo (main vs feature/DEMO-6010-denuncia-srt) y sus casos de prueba.

---

## Informe de analisis — DEMO-6042 / DEMO-6010

### Resumen
La Historia DEMO-6010 exige que "Denunciar SRT" se fuerce a "Sí" cuando el
seguimiento tiene alguna actividad denunciable cargada, sea nueva o
preexistente, y que no pueda destildarse manualmente mientras eso ocurra. El
bug DEMO-6042 reporta que, al destildar manualmente "Denunciar SRT" con una
actividad denunciable ya cargada de antes, el sistema lo vuelve a forzar a
"Sí" y bloquea el pase a NV — y plantea eso como un error.

### Documentacion tecnica relevante
`DOC-DENUNCIA-SRT` es explicita: la regla evalua el conjunto completo de
actividades vigentes en cada guardado, sin distinguir si una actividad
denunciable es nueva o preexistente. Mientras exista alguna, el usuario no
puede destildar manualmente el campo, y el pase a NV debe quedar bloqueado
hasta informar a la SRT. El propio documento aclara que hacer prevalecer el
destilde manual por sobre una actividad denunciable preexistente **es un
cambio de regla de negocio**, no el comportamiento actual.

### Historia de Usuario
Los criterios de aceptacion de DEMO-6010 piden exactamente lo que el bug
reporta como incorrecto: forzar "Sí" ante cualquier actividad denunciable
cargada (nueva o vieja) y bloquear el pase a NV mientras tanto. El bug
contradice directamente su propia Historia.

### Codigo analizado
`SeguimientoObraService.procesarRequiereDenunciarSrt` recibe el listado
completo de actividades vigentes y devuelve `true` si **cualquiera** es
denunciable, sin distinguir antiguedad:

```java
public boolean procesarRequiereDenunciarSrt(List<ActividadObra> actividadesVigentes) {
    return actividadesVigentes.stream().anyMatch(ActividadObra::isDenunciable);
}
```

Esto es exactamente lo documentado y lo pedido por la Historia. Ademas,
`SeguimientoObraServiceTest.procesar_requiereDenunciarSrt_actividadDenunciablePreexistente_fuerzaSi`
certifica puntualmente este escenario — actividad denunciable preexistente,
sin agregar ninguna nueva — y espera `true`. El test ya cubre, a proposito, el
caso que el bug reporta como un error.

### Casos de prueba
- **DEMO-6010-TC1** (sin actividades denunciables, queda en "No"): correcto.
- **DEMO-6010-TC2** (actividad denunciable nueva fuerza "Sí"): correcto.
- **DEMO-6010-TC3** (destildar con actividad denunciable preexistente):
  correcto y es, de hecho, la prueba que contradice directamente la premisa
  del bug: su resultado esperado documentado es que el sistema vuelva a
  forzar "Sí", no que respete el destilde manual.

### Veredicto
**Cambio funcional** (no es un bug).

### Justificacion
El comportamiento reportado como "incorrecto" es exactamente el documentado
en `DOC-DENUNCIA-SRT`, el exigido por los criterios de aceptacion de
DEMO-6010, el implementado en `SeguimientoObraService`, y el validado por un
test existente que cubre puntualmente ese escenario. No hay ninguna fuente
(doc, HU, codigo, test) que respalde el resultado esperado que describe el
bug. Lo que se esta pidiendo — que una actividad denunciable preexistente no
fuerce "Sí" — es un cambio de regla de negocio, tal como ya lo anticipa la
propia documentacion.

### Recomendacion
No implementar un fix de codigo sobre esta base. Antes de tocar
`SeguimientoObraService`, conseguir confirmacion explicita de negocio sobre
si la regla debe cambiar (forzar "Sí" solo ante actividades denunciables
*nuevas* en la edicion actual, dejando pasar el destilde manual cuando no hay
ninguna nueva). Si se confirma el cambio, actualizar en este orden:
`DOC-DENUNCIA-SRT`, los criterios de aceptacion de DEMO-6010 (o una historia
nueva), el test `..._actividadDenunciablePreexistente_fuerzaSi` (que pasaria
a esperar el comportamiento opuesto) y recien despues el codigo.
