# PRD · Canvas colaborativo AR

Estado: PROPUESTA de producto, pendiente de validación con Alba. Fuente conceptual: [L2] en `sources.md`.

## Problema, usuarios y valor

En talleres presenciales se reorganizan ideas y se discuten alternativas, pero conservar una propuesta física puede interrumpir la siguiente. Queremos explorar una composición compartida en el espacio que permita volver a estados editables y explicar sus diferencias.

Usuario primario: facilitador de UX/producto y un colaborador presencial. Usuario secundario futuro: equipo técnico que modela relaciones y revisa objetos físicos. No hay entrevistas realizadas ni mejora de productividad demostrada.

Trabajo a resolver: «Cuando reorganizo ideas con mi equipo, quiero comparar una propuesta anterior con la actual y explorar una alternativa sin perder el trabajo posterior».

## Por qué AR

El canvas se sitúa respecto a una mesa real para que las personas mantengan una referencia de conversación común. El espacio y la posición de las notas son parte del trabajo. Si una función se resuelve mejor como formulario de escritorio, no trasladar ese formulario entero a las gafas. Esta justificación es una hipótesis de valor que se comprobará con usuarios.

## Alcance propuesto

CORE: un canvas activo, una plantilla de card sorting cerrado, tres categorías editables, hasta 12 notas y cinco snapshots por canvas. Semilla de demo: seis notas distribuidas en «Ahora», «Después» y «Explorar»; no representa datos de investigación.

COLLAB: dos personas presenciales, edición de notas distintas y exclusión de edición del mismo elemento. Su activación depende de la puerta G3 de `decisions.md`. Con CORE se conserva la propuesta de versiones; no se afirma multiusuario.

Los límites son presupuestos de demo elegidos aquí, no límites de SPECS. Los números se centralizan en SRD y configuración al implementar.

## Requisitos y criterios de aceptación

| ID | Prioridad/modo | Comportamiento y aceptación observable |
| --- | --- | --- |
| P-01 | P0 CORE | Al iniciar, ofrecer colocar canvas; confirmar una referencia válida muestra tres categorías y la semilla. Cancelar no crea contenido duplicado. En preview se admite referencia simulada etiquetada. |
| P-02 | P0 CORE | Crear, renombrar y eliminar una nota; confirmar conserva el texto y cancelar conserva el original. Rechazar vacío o exceso de longitud con mensaje claro. Antes de borrar, confirmar. |
| P-03 | P0 CORE | Mover una nota a otra categoría; soltar dentro confirma pertenencia y posición, fuera vuelve al estado previo. Una selección muestra contorno y acciones. |
| P-04 | P0 CORE | Guardar snapshot con nombre y nota de decisión opcional. Solo aparece como guardado tras confirmación del almacenamiento duradero local. Reiniciar conserva snapshots y último estado confirmado. |
| P-05 | P0 CORE | Elegir dos snapshots guardados muestra notas añadidas, eliminadas o modificadas por ID; distingue texto, categoría y posición. Comparar no edita el canvas. |
| P-06 | P0 CORE | Recuperar un snapshot crea una nueva revisión actual desde ese contenido; conserva las versiones posteriores. Cancelar no modifica nada. |
| P-07 | P0 CORE | Mostrar colocación, edición, guardado, comparación y error; ante pérdida de referencia suspender manipulación y ofrecer recolocar sin perder contenido. |
| P-08 | P0 CORE | Todo el flujo principal y su alternativa de error son demostrables en preview con datos semilla. La UI identifica simulación y capacidades no disponibles. |
| P-09 | P1 COLLAB | Tras completar unión y alineación, ambos clientes ven los mismos IDs, textos, categorías y posiciones. Dos notas distintas se editan sin pérdida; la misma nota no admite dos editores a la vez. |
| P-10 | P1 COLLAB | Desconexión bloquea nuevas escrituras; al volver, recuperar estado de la autoridad. Salida del anfitrión cierra sesión de forma explícita y conserva lo ya guardado en su dispositivo. |

## Flujo principal de demo

Colocar canvas → organizar seis notas → editar una → guardar V1 → modificar texto y mover una nota → añadir otra y guardar V2 → comparar V1/V2 → recuperar V1 como alternativa → comprobar que V2 sigue disponible.

Si COLLAB está verificado, insertar antes de V1 una edición por cada participante. No sustituir una sesión real por una animación sin indicarlo.

## Exclusiones del MVP

Dibujo libre; múltiples plantillas; símbolos, puertas lógicas, flechas y diagramación; fotos y OCR; stickers; comentarios y menciones; importación desde herramientas externas; ramificación/merge tipo Git; colaboración remota; más de dos participantes; cuentas propias; sincronización entre dispositivos de snapshots duraderos; recuperación automática de anclajes entre sesiones; IA generativa dentro de la aplicación.

La visión futura conserva estas posibilidades, pero no obliga a implementarlas. Recuperar como revisión nueva aporta exploración de alternativas; no es un sistema completo de ramas.

## Éxito y salida

Éxito funcional: casos CORE del plan de pruebas pasan en preview y almacenamiento real, sin pérdida silenciosa. Objetivo de usabilidad propuesto: 3 de 4 participantes completan organizar/guardar/comparar/recuperar en cinco minutos tras una introducción breve y explican que recuperar conserva V2. Esta muestra es exploratoria, sin pretensión estadística.

Salida de hackatón: flujo consistente y vídeo fiel a lo implementado; usar `docs/hackathon.md` para las condiciones externas. Aprobar el modo final y documentar las funciones pendientes antes de grabar.

