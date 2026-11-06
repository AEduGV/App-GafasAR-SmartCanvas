# Diseño de experiencia · Canvas AR

Estado: PROPUESTO. Complementa el futuro `devpost/design-brief.md`; si discrepan, registrar y resolver. No sustituye el brief ni prescribe cifras ópticas del hardware.

## Principios aplicados

Priorizar la escena y el contexto compartido sobre paneles permanentes [F3]. Mostrar detalle bajo demanda y retirar controles tras la acción [F5,F6]. Diseñar alrededor del campo visible y ofrecer reorientación [F7]. Estado visible, cancelación y recuperación se incorporan a cada flujo [F10]. Estas son adaptaciones de principios; ninguna guía de otra plataforma acredita compatibilidad con SPECS.

El espacio facilita conversación y relación con la mesa. La profundidad no representa una métrica en card sorting: las notas permanecen en una superficie virtual próxima a la referencia. El 3D semántico para arquitectura queda fuera del MVP.

## Composición espacial propuesta

- Un marco discreto indica límites del canvas; las tres categorías se reconocen por etiqueta y zona.
- Comenzar con un tamaño que permita reconocer toda la estructura; abrir detalle de una nota al seleccionarla.
- La mesa define referencia y agrupación; no obligar a agacharse para leer texto horizontal. Probar notas/panel de detalle inclinados hacia la persona sin alterar posiciones compartidas.
- Toolbar contextual junto al canvas; un solo panel de edición o historial abierto por persona.
- Evitar paneles que sigan continuamente la cabeza. «Localizar canvas» orienta/revela un indicador y solo recoloca con confirmación.
- El indicador fuera de campo debe conducir hacia el canvas, sin exigir giros bruscos ni ocupar el centro de la visión.

Tamaño físico, inclinación y distancia: pendientes de G1/G2 y prueba de comodidad. No convertir px web a metros sin evaluar tamaño angular. No trasladar a SPECS el plano focal de un modelo de gafas descrito por otra empresa.

## Lenguaje visual y legibilidad

Las referencias Apple, Expo y Figma aportadas inspiran jerarquía, moderación y foco, pero sus fondos blancos/negros, sombras y tamaños web no se trasladan literalmente. En pantallas aditivas el negro puede representar ausencia de luz; superficies brillantes grandes y halos pueden perjudicar lectura [F4]. Confirmar el comportamiento del dispositivo objetivo.

Tokens iniciales de exploración, no valores validados de contraste óptico:

| Rol | Color inicial | Refuerzo no cromático |
| --- | --- | --- |
| Texto principal | `#F4F7FA` | Tipografía sin serif, peso medio |
| Selección | `#73D8FF` | Contorno + rótulo «Seleccionada» |
| Guardado | `#8FE3B0` | Icono + «Guardado» |
| Pendiente/aviso | `#FFD27A` | Icono + explicación |
| Error | `#FF9DA4` | Icono + acción de recuperación |
| Nota neutra | Contorno tenue | Título/etiqueta legibles |

Usar fuente compatible y con licencia comprobada, sin asumir disponibilidad de fuentes propietarias. Texto corto, líneas cómodas y espacio entre objetivos; no tipografía ultrafina. Medir lectura sobre fondos claros, oscuros y visualmente complejos. Una comprobación WCAG de una captura no verifica legibilidad en gafas transparentes.

## Interacción

| Acción | Interacción propuesta | Feedback/cancelación |
| --- | --- | --- |
| Colocar | Apuntar a referencia y confirmar con input admitido | Vista previa del marco; cancelar vuelve a inicio |
| Seleccionar | Targeting + pinch/activación SIK | Contorno, título y acciones |
| Mover | Arrastrar selección y soltar sobre categoría | Ghost y destino resaltado; fuera vuelve al origen |
| Editar texto | Abrir editor compatible, confirmar o cancelar | Original intacto hasta commit |
| Borrar | Acción contextual y confirmación | Nombre de nota en diálogo; cancelar conserva |
| Guardar | Nombre y comentario opcional | «Guardando» hasta confirmación real |
| Comparar | Elegir A y B en historial | Resumen por campo, vista de solo lectura |
| Recuperar | Elegir versión y confirmar copia | Explica qué se reemplaza y que se conserva historial |

Pinch es candidato, no el único gesto disponible garantizado. Evitar gestos personalizados invisibles, pinzas sostenidas, precisión fina y brazos elevados de forma continua. Estas decisiones requieren pruebas propias; el enlace Meta aportado no fue legible y no se atribuyen cifras o reglas concretas a ese documento [F8].

Para preview, una entrada alternativa solo se considera válida si está implementada y etiquetada. El modo de demo no debe dar la impresión de que existe reconocimiento de voz o teclado espacial sin probarlo.

## Componentes y estados

| Componente | Estados mínimos |
| --- | --- |
| Nota | Normal, enfocada, seleccionada, moviéndose, pendiente, bloqueada por otra persona, error |
| Categoría | Normal, destino válido, destino no disponible |
| Estado de sesión | CORE, conectando, alineando, compartido, desconectado, cerrado |
| Historial | Vacío, lista, guardando, límite alcanzado, error |
| Comparador | Selección A/B, sin cambios, diferencias, salir |
| Referencia | Por colocar, válida, perdida, recolocando |

En diff: «Añadida» con +, «Eliminada» con − y «Modificada» con lista de campos. Mostrar fantasma de eliminadas solo en comparación; no permitir manipularlo. Mantener el canvas actual al salir.

## Microcopy de referencia

- «Coloca el canvas sobre una mesa despejada».
- «No se ha guardado. Reintentar».
- «En uso por Participante 2».
- «Referencia perdida. Recoloca el canvas para continuar».
- «Crear alternativa desde V1. Tu composición actual cambiará; las versiones guardadas seguirán disponibles».
- «Modo individual» / «Colaboración simulada» / «Sesión compartida», según evidencia real.

## Validación de experiencia

Comprobar comprensión de selección y guardado, lectura de títulos, localización del canvas, cancelación, recuperación sin pérdida y comodidad con manos relajadas. Detener interacción si aparece molestia y registrar el problema. La demo se plantea en un espacio estacionario despejado; no durante desplazamientos. Protocolo completo: `ux-research.md`.

