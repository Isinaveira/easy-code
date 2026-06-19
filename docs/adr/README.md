# Architecture Decision Records (ADR)

Este directorio almacena las decisiones arquitectónicas del proyecto Easy-Code, siguiendo el estándar de **Spec Driven Development (SDD)**.

El objetivo de las ADR es explicar el **por qué** de una decisión técnica, mientras que el código documenta el **cómo**.

## ¿Cuándo crear una ADR?

Es obligatorio crear una ADR cuando se modifique:
- La arquitectura del sistema
- La comunicación entre componentes
- El modelo de datos
- El sistema de agentes o la selección de modelos
- La estrategia de persistencia
- Las APIs públicas
- El sistema distribuido o el flujo principal de ejecución
- Patrones arquitectónicos
- Decisiones técnicas con impacto a largo plazo

No es necesario para bugfixes, refactorizaciones menores, documentación ordinaria o mejoras internas sin impacto arquitectónico.

## Nomenclatura

Las ADR utilizan numeración incremental secuencial y nunca reutilizan identificadores:
- `ADR-0001-nombre-de-decision.md`
- `ADR-0002-otra-decision.md`

## Trazabilidad

Toda ADR debe estar entrelazada con el flujo de desarrollo:
- Debe referenciar a la especificación y tareas que la motivaron.
- Los commits en el repositorio que materialicen esta decisión deben referenciarla explícitamente en el mensaje del commit usando el formato `Refs: ADR-XXXX`.

## Plantilla

Utiliza siempre la plantilla `ADR-template.md` como base para cualquier nueva ADR.
