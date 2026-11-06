# SRD · Requisitos del software

SRD significa aquí Software Requirements Document. Se incluye porque se ha solicitado; es un contrato técnico compacto, no una segunda copia del PRD. Estado: PROPUESTO, excepto hechos externos citados. Arquitectura en `technical-spec.md`.

## Restricciones y contratos

| ID | Requisito técnico verificable | PRD |
| --- | --- | --- |
| S-01 | Proyecto Lens Studio dirigido al target SPECS elegido; compila sin errores propios con editor y paquetes registrados. | P-08 |
| S-02 | Cada canvas, categoría, nota y snapshot usa ID estable. Un renombrado o movimiento no cambia el ID. | P-02–06 |
| S-03 | Configuración MVP: 1 canvas activo, 3 categorías, 12 notas, 5 snapshots, 80 caracteres Unicode por nota, nombre de versión 40 y comentario 160. Contar puntos de código, no bytes; probar tildes y emoji. Rechazar controles no admitidos, trim y vacío. | P-02,04 |
| S-04 | Validar schemaVersion, referencias, unicidad, números finitos y límites antes de aplicar o persistir datos. Datos inválidos no sustituyen estado válido. | P-04–06 |
| S-05 | Persistir working state confirmado y snapshots con un protocolo que permita detectar escrituras incompletas. Acusar éxito solo tras escritura y verificación. Memoria RAM no satisface persistencia. | P-04 |
| S-06 | Snapshot = copia independiente de contenido, layout relativo y metadatos; nunca referencias mutables del estado vivo. Recuperación preserva historial y añade nuevo snapshot antes de cambiar current. | P-04,06 |
| S-07 | Diff por ID; una nota modificada puede acumular campos cambiados. Posición cambió si distancia local supera 0,01 m; no comparar transformaciones globales del anclaje. | P-05 |
| S-08 | Entrada de interacción mediante componentes SIK compatibles; lógica de dominio invocable sin gesto real para pruebas. Edición de texto debe demostrar un mecanismo admitido por la versión instalada. | P-02,03,08 |
| S-09 | Colocación usa una transformación canvas→mundo separada de los datos. Recolocar no cambia diff, categoría ni contenido. Al reiniciar se solicita nueva colocación. | P-01,07 |
| S-10 | COLLAB requiere autoridad de sesión, orden total de commits, deduplicación por opId y rechazo de baseRevision obsoleta. | P-09 |
| S-11 | Exclusión de edición por nota; lease de 10 s renovada cada 3 s con reloj de autoridad. Expiración, salida o pérdida de referencia cancelan edición y liberan lock. Valores propuestos. | P-09,10 |
| S-12 | Sin autoridad o sin alineación compartida, ninguna escritura COLLAB se confirma. Reentrada aplica snapshot actual antes de habilitar input. Sin merge offline ni migración de anfitrión en MVP. | P-09,10 |
| S-13 | Cámara, micrófono, red y mapeado se solicitan solo si una capacidad activa los necesita. Sin carga de notas a proveedores de IA; logs sin texto de notas por defecto. | P-07–10 |
| S-14 | Distinguir `idle`, `pending`, `saved` y `error`; cancelar es accesible sin temporizador. El color nunca es el único indicador. | P-02,04,07 |
| S-15 | Medir feedback local: objetivo p95 ≤150 ms en 30 acciones; convergencia COLLAB: objetivo p95 ≤1 s tras commit en 30 operaciones de dos clientes. Registrar entorno y fallos; no son garantías del SDK. | P-03,09 |
| S-16 | Con carga máxima, registrar profiler y frame time en preview; en gafas comparar con el presupuesto del target confirmado. No declarar rendimiento de hardware a partir del ordenador. | P-08 |

## Recuperación y límites

Al alcanzar cinco snapshots, bloquear guardar/recuperar con explicación y permitir eliminar uno elegido, previa confirmación; no purgar automáticamente. No borrar el snapshot activo ni uno que se esté comparando; salir de comparación permite gestionarlo. Conservar baseSnapshotId como procedencia histórica aunque su snapshot se elimine; no usarlo como dependencia necesaria para leer snapshots completos.

Una operación es confirmada cuando se cumple su contrato de durabilidad (CORE) y, en COLLAB, la autoridad la acepta y persiste. Un movimiento visual provisional no cuenta como guardado. Escritura fallida deja el último estado confirmado y ofrece reintentar.

## Evidencia requerida

Todos los requisitos S se verifican mediante `test-plan.md`. G1 resuelve plataforma; G2 almacenamiento/entrada; G3 red y alineación. Hasta resolverlas, arquitectura y contratos no prueban que el SDK soporte la implementación propuesta.

