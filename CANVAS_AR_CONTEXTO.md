# Canvas AR: contexto para continuar el proyecto

Este documento se carga solo al abrir Claude Code en esta carpeta, porque `CLAUDE.md` lo importa.
**Mantenlo al día:** al terminar un cambio, actualiza las secciones de estado, decisiones y límites.
Última actualización: 2026-11-07.

## Objetivo

CANVAS AR es un lienzo de trabajo en realidad aumentada para Lens Studio y Specs (Spectacles).
La especificación funcional completa está en `canvas_ar_especificacion_funcional.md`: léela antes de añadir una función nueva.
Pide no inventar APIs y verificar las capacidades de la plataforma.

## Alcance que fijó el usuario

- Se presenta **solo en la Preview de Lens Studio**. No hay gafas para probar.
- Un solo usuario: la conexión entre dispositivos queda fuera.
- Guardar versiones y Snap Cloud quedan fuera por ahora.
- Plazo: 4 días desde el 2026-11-04. Se acepta no llegar a todo.
- La identidad visual sigue `indicaciones/design.md` en texto, selección y avisos, y `apple-brand-package/tokens.json` en lo demás. `apple-brand-package/DESIGN.md` está vacío.
- El usuario se comunica en español: responde y escribe los textos de la interfaz en español.

## Guías de producto (`indicaciones/`)

`AGENTS.md`, `prd.md`, `srd.md` y `design.md` son guías del proyecto: léelas antes de añadir una función. `indicaciones/AGENTS.md` fija las reglas de trabajo y es distinto del `AGENTS.md` de la raíz. No usar `/verify-preview` tal cual: recurre a `CaptureRuntimeViewTool`, que aquí bloquea el editor.
**Decisiones del usuario (2026-11-05), que mandan sobre las guías:**
- Versiones (P-04 a P-06) y almacenamiento local quedan fuera por ahora; quizá se añadan más adelante. Reiniciar la Lens borra el contenido.
- Superficie: mesa y pared.
- Colores: siguen los tokens de `design.md`, aplicados en `CanvasTheme.ts`. `#73D8FF` es el único color de foco: selección y botones activos. `#FFD27A` para confirmaciones y avisos, `#FF9DA4` para errores. La etiqueta de un botón activo es oscura (`onAccent`, que no es de `design.md`) porque el texto principal no se lee sobre ese color. `#8FE3B0` (guardado) no se usa porque no hay guardado.
- (2026-11-07) Alba Anton revisó `design.md` (ahora en inglés) después de aplicar esos colores. Siguen valiendo los cuatro aplicados, pero **aún no está aplicado lo nuevo**: `#C8D2DE` para texto secundario y botones secundarios, `#A0B1C5` para contornos neutros y bordes de canvas, pulsado `#59BFE8` y `#B3BFCD`, contraste mínimo de 4,5:1 y etiqueta de botón en `#F4F7FA`. Falta que el usuario decida si se aplica.
- (2026-11-07) No avisar de la superficie simulada ni llevar registro de pruebas por ahora, aunque las guías lo pidan.
- Categorías, imágenes, comentarios y captura quedan fuera por ahora. No mostrar «Modo individual».
- Voz: no intentarla por ahora. El botón Escribir con el teclado la simula. Se escribe en inglés y las limitaciones del teclado se quedan así.
- Escribir no lleva botones Listo ni Cancelar: se termina deseleccionando.
- El objetivo es la Preview; el usuario grabará el vídeo por su cuenta y no hay que preparar nada para él. Reiniciar la Lens borra el contenido.
- Vocabulario: el «canvas» de las guías es toda la superficie de trabajo; lo que en el código y con el usuario llamamos «canvas» equivale a la «nota» de las guías. El proyecto sigue como estaba. Ojo: `ElementKind "note"` es otra cosa, un elemento dentro de un canvas nuestro.

No quites funciones ya hechas por el hecho de que el PRD las excluya sin confirmarlo con el usuario.
Citan documentos que no están en el proyecto: `sources.md`, `decisions.md`, `technical-spec.md`, `test-plan.md`, `ux-research.md`, `docs/hackathon.md` y `devpost/design-brief.md`.

## Qué funciona hoy

- **Colocar un canvas:** se pellizcan dos esquinas sobre una mesa o una pared, y se detecta la superficie real. Tamaño mínimo 12×8 unidades. Pulsar fuera de los canvas empieza otro sin borrar los anteriores, salvo con Dibujar activo, donde solo avisa. «Colocar delante» pone un canvas vacío sin marcar esquinas.
- **Cambiar el tamaño:** con Seleccionar, arrastrar el borde mueve ese lado y deja fijo el opuesto; desde una esquina, dos lados. Hay una franja de 2 unidades a cada lado del borde, que se ilumina al apuntarla. Mínimo 12×8, máximo 260, y nunca deja contenido fuera. Un elemento o botón encima del borde tiene prioridad.
- **Barra del borde de cada canvas:** Mover, Dibujar, Escribir, Flecha, Forma y ×. Agrupar o Separar aparecen en una fila aparte cuando tienen sentido.
- **Escribir:** edita el elemento seleccionado o crea un texto nuevo, y se escribe con el teclado. Pulsar fuera termina y deselecciona, sin empezar otro canvas. Si no se escribió nada, el texto nuevo desaparece. Máximo 80 caracteres; un texto o nota vaciado recupera el anterior; la caja crece hacia abajo. Borrar un elemento pide una segunda pulsación en 3 segundos.
- **Mover:** el contenido viaja con el canvas. Al apuntar a una superficie de otra orientación, gira y se pega a ella con todo su contenido, también en grupo.
- **Formas:** Rectángulo, Óvalo, Triángulo y Rombo, con un menú desplegable. Dibujo, clics y flechas respetan la forma real.
- **Varios canvas:** flechas entre ellos que siguen a sus canvas, y Agrupar al juntarlos para moverlos a la vez.
- **Borrar un canvas (×):** directo si está vacío; con contenido pide una segunda pulsación en 3 segundos.
- **Panel principal:** notas, texto, pantallas, figuras, diagramas de flujo, puertas lógicas, marcadores, stickers, plantillas, capas, agrupar elementos, conectar bloques.

## Pendiente de la especificación

Imágenes, comentarios, captura y alineación con objetos físicos. Nada de esto está empezado.

## Arquitectura (`Assets/Scripts/`)

| Archivo | Papel |
|---|---|
| `CanvasApp.ts` | Controlador: colocación, entrada, herramientas, mover, grupos, borrado |
| `CanvasInstance.ts` | Un canvas: documento, pose, escala, grupo, barra |
| `CanvasDocument.ts` | Modelo de datos de elementos y conexiones de un canvas, con eventos. No dibuja |
| `CanvasRenderer.ts` | Dibuja el documento y la superficie. Forma, límites y `retire()` para destruir objetos |
| `CanvasGeometry.ts` | Contornos, rellenos, trazos y tubos con `MeshBuilder` |
| `CanvasLinks.ts` | Flechas entre canvas: guardan quién enlaza con quién y se recalculan según las poses |
| `CanvasDockUI.ts`, `CanvasEdgeBarUI.ts`, `CanvasPill.ts` | Interfaz con UIKit |
| `CanvasTemplates.ts`, `CanvasTheme.ts` | Plantillas y colores de marca |

La escena es `Assets/Scene.scene`: el objeto `CanvasAR` lleva `CanvasApp`, y su hijo `CanvasDock` lleva `CanvasDockUI`. Los canvas y sus barras se crean en ejecución.

## Decisiones que no hay que deshacer

- **Entrada:** se usan los eventos del interactor y la intersección del rayo con el plano, no `InteractableManipulation`.
- **Detección de superficie:** `WorldQueryModule` con `filter = false` y una consulta nueva por cada clic. Con filtro o con un resultado guardado, un clic en la mesa daba un canvas vertical.
- **Escala por distancia:** la raíz del canvas escala según `distancia / 135`, entre 0,6 y 3, para que no se vea diminuto en una pared lejana.
- **Colisionador rectangular:** la superficie conserva un colisionador de caja. Las esquinas fuera de la forma se filtran en `onTriggerStart` con `contains()`.
- **Destruir objetos:** usar `retire()`, nunca `destroy()` directo en algo con `Interactable`. El cursor de SIK guarda objetos en caché y lanza "Object is null" si ya no existen. Además, borrar un canvas se aplaza fuera del evento de su propio botón.
- **Cambio de superficie:** exige 0,15 s apuntando entre mesa y pared, y 0,5 s entre dos paredes, para que el canto de un marco no tuerza el canvas.
- **Crecer con el contenido:** un rectángulo crece por el lado necesario. Las demás formas crecen lo mínimo y se desplazan lo mínimo (`fitShapeToContent`). El triángulo apoya el contenido en la base. `shapeBase` recupera el tamaño al volver a otra forma.
- **Barra en canvas estrechos:** si el canvas es más estrecho que la barra (64 unidades, `BAR_HALF_WIDTH` en `CanvasInstance.ts`), solo se muestra en el canvas activo, para no pisar la de los vecinos.
- **Pantalla aditiva:** los colores oscuros casi no se ven, por eso `CanvasTheme.ts` aclara los grises de la marca.
- **UIKit:** `FlexLayout` descubre sus elementos solo y `addItems` antes de iniciarse falla. `BackPlate` en lugar de `Frame`, que salía sobredimensionado. Los colores sólidos de `CapsuleButton` se consiguen con degradados de un solo color.

## Correcciones ya hechas (no reintroducir)

- El canvas no terminaba al segundo clic: la superficie recién creada se tomaba por una pulsación en el panel.
- El panel tapaba mesas y canvas: es compacto al colocar, y elige el lado que menos tapa.
- Letras de los botones cortadas: `LABEL_Z = 0.35`.
- Separar quedaba oculto por la barra vecina: va en su propia fila.
- Clic fuera demasiado sensible: el margen se limita a la franja real de botones.
- Excepciones del cursor al borrar: se resuelve con `retire()`.
- Triángulo sin base visible: `subdivide()` en el contorno.
- Barra tapada por notas vecinas: va en z = 1,4 sobre una pared.
- Triángulo unas 3 veces mayor que el rectángulo al meter una nota: ahora unas 1,6 veces.

## Límites conocidos

- Las flechas enlazan canvas, no bloques de canvas distintos. Entre canvas casi pegados se reducen a un punto.
- Agrupar mide la cercanía con el rectángulo que envuelve la forma, y solo entre canvas casi paralelos.
- Girar y Colocar de nuevo se rechazan mientras un canvas está en un grupo.
- Marcar o soltar sobre el canto de un objeto orienta el canvas según esa cara. Se corrige moviéndolo.
- Mover no salta entre superficies de la misma orientación a distinta altura, como de una mesa al suelo. Es a propósito, para que no se caiga al pasar por el borde.
- Un triángulo no puede contener un rectángulo con menos del doble de su área: es geometría, no un fallo.
- Cambiar el tamaño solo funciona con Seleccionar: con Mover, Dibujar o Flecha, la franja interior del borde hace lo propio de esa herramienta, y la exterior no hace nada. Si el panel tapa un borde, ese borde no se puede agarrar.
- `retire()` no cubre del todo la caché del cursor de SIK: una vez saltó `Object is null` en `blendCachedInteractables`, 7 minutos después de Vaciar, sin más efecto visible. No reproducido.
- En Preview, lo virtual solo se ve en una franja central (x entre 0,27 y 0,73 aprox.), y la barra de un canvas pequeño cerca del borde puede quedar fuera.
- En Preview, `KeyPressEvent` solo da letras A-Z, números, espacio, retroceso, flechas y modificadores: ni ñ, ni tildes, ni puntuación, ni Enter.
- Sin probar: Escribir con teclado y ratón reales, sobre una mesa o dentro de una forma no rectangular; plantillas dentro de una forma no rectangular, llevar de mesa a pared un canvas con forma, una flecha entre un canvas con forma y otro bien separado.

## Cómo probar sin romper nada

**No usar nunca `QueryRuntimeSceneTool`, `PreviewInteractTool` ni `CaptureRuntimeViewTool`.** Instalan paquetes (`AiPreviewAgentInspect`, `Icons`, `Motion`) que no compilan y bloquean el editor con "Invalid transition from Immutable to Mutable". Hubo que cerrar Lens Studio y borrarlos a mano. En `Packages/` solo deben estar SIK y UIKit.

Usar `RecompileTypeScriptTool`, `RunAndCollectLogsTool`, `InjectPreviewGesture` y `CapturePanelScreenshotTool`. Buscar en el log `[CanvasAR]` y `Object is null`.

Particularidades de los clics simulados, que pueden parecer fallos sin serlo:

- No generan hover. Para pulsar de forma fiable: `touch move` dos veces en el punto, `touch start` + `end` (solo actualiza el objetivo), y otro `touch start` + `end` (pulsa de verdad). Para arrastrar, ese segundo `start` va seguido de los `move` y el `end`.
- Entre dos llamadas pasan segundos: las dobles pulsaciones con plazo, como Borrar, deben ir en un mismo envío. Dos pulsaciones sobre un elemento cuentan como doble clic y abren la edición.
- Tras marcar la primera esquina hay que dejar unos 500 ms, porque la consulta de superficie es asíncrona.
- La renovación del token de sesión de Lens Studio reinicia la Lens. Si una prueba pierde su estado, mirar el log (`OAuthController ... refreshTokens`) y repetir la secuencia.
- El usuario puede mover la cámara de la Preview entre pruebas: toma coordenadas de una captura reciente, nunca de una anterior.
- Escena recomendada: Evening Room. En la escena "Plane" la detección de superficies no devuelve nada.

Di siempre qué se probó con clics simulados y qué no: el usuario prueba con su ratón real, y esa diferencia ya ocultó un fallo.

## Otras normas

- Nunca acceder a Lens Studio por HTTP, `curl` o `fetch`: solo las herramientas MCP (ver `AGENTS.md`).
- `.mcp.json` contiene un token local: no repetirlo ni publicarlo.
- No modificar `Cache/`.

## Repositorio

`https://github.com/AEduGV/App-GafasAR-SmartCanvas.git`, rama `main`. El usuario pidió ir subiendo los cambios: al terminar y probar un cambio, haz commit y `git push`.
Nunca subir claves ni credenciales (`*.pem`, `.mcp.json`, `mcp.json`, `.codex/`, `.claude/`). Antes de añadir un tipo de archivo nuevo, comprueba `.gitignore`.
