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
- La identidad visual sigue `indicaciones/design.md`, que Alba Anton revisó el 2026-11-07. `apple-brand-package/` queda solo como referencia, y su `DESIGN.md` está vacío.
- El usuario se comunica en español: responde y escribe los textos de la interfaz en español.

## Guías de producto (`indicaciones/`)

`AGENTS.md`, `prd.md`, `srd.md` y `design.md` son guías del proyecto: léelas antes de añadir una función. `indicaciones/AGENTS.md` fija las reglas de trabajo y es distinto del `AGENTS.md` de la raíz. No usar `/verify-preview` tal cual: recurre a `CaptureRuntimeViewTool`, que aquí bloquea el editor.
**Decisiones del usuario (2026-11-05), que mandan sobre las guías:**
- Versiones (P-04 a P-06) y almacenamiento local quedan fuera por ahora; quizá se añadan más adelante. Reiniciar la Lens borra el contenido.
- Superficie: mesa y pared.
- Colores: aplicado el `design.md` revisado, en `CanvasTheme.ts`. Botones con fondo `#182230`, etiqueta `#F4F7FA` y el estado en el borde: `#C8D2DE` en reposo, `#73D8FF` y más grueso si está activo, `#FFD27A` en una confirmación, y al pulsar `#B3BFCD` o `#59BFE8` y aún más grueso. Canvas con `#182230` al 25 % y borde `#A0B1C5`. Avisos y errores llevan los prefijos «Aviso:» y «Error:».
- Fuera de `design.md`: el amarillo de notas pasa a `#806a00` para llegar a 4,5:1, el ámbar pulsado es `#E0B662`, y avisos y errores llevan texto pero no icono. Sin uso porque sus funciones están fuera: `#8FE3B0` (guardado) y los colores de categoría.
- (2026-11-07) Los botones del panel y del menú radial llevan iconos de Material Symbols sacados de `google/material-design-icons` (ver `THIRD_PARTY_NOTICES.md`), y su nombre aparece en la línea de estado al apuntarlos. Siguen en texto las puertas lógicas y los colores, que no tienen un icono que los distinga.
- (2026-11-07) `README.md` y `EyeCanvas-AppIcon.png`, en la raíz, son de Alba Anton: no tocarlos ni tomarlos como referencia. Su nombre (EyeCanvas), su demo con versiones y sus enlaces no describen este proyecto ni mandan sobre el alcance.
- (2026-11-07) No hay herramienta Mover: sin otra herramienta activa, agarrar un canvas por el borde lo estira y por el interior lo mueve. No avisar de la superficie simulada ni llevar registro de pruebas por ahora, aunque las guías lo pidan.
- Categorías, imágenes, comentarios y captura quedan fuera por ahora. No mostrar «Modo individual».
- Voz: no intentarla por ahora. El botón Escribir con el teclado la simula. Se escribe en inglés y las limitaciones del teclado se quedan así.
- Escribir no lleva botones Listo ni Cancelar: se termina deseleccionando.
- El objetivo es la Preview; el usuario grabará el vídeo por su cuenta y no hay que preparar nada para él. Reiniciar la Lens borra el contenido.
- Vocabulario: el «canvas» de las guías es toda la superficie de trabajo; lo que en el código y con el usuario llamamos «canvas» equivale a la «nota» de las guías. El proyecto sigue como estaba. Ojo: `ElementKind "note"` es otra cosa, un elemento dentro de un canvas nuestro.

No quites funciones ya hechas por el hecho de que el PRD las excluya sin confirmarlo con el usuario.
Citan documentos que no están en el proyecto: `sources.md`, `decisions.md`, `technical-spec.md`, `test-plan.md`, `ux-research.md`, `docs/hackathon.md` y `devpost/design-brief.md`.

## Qué funciona hoy

- **Colocar un canvas:** se pellizcan dos esquinas sobre una mesa o una pared, y se detecta la superficie real. Si la superficie está a más de 1,5 m, o no se detecta ninguna con la orientación Vertical, las esquinas se marcan igual pero sobre un plano vertical a 75 cm delante del usuario: el canvas queda flotando de frente, quieto en la escena, y no te sigue. Tamaño mínimo 12×8 unidades. Pulsar fuera de los canvas empieza otro sin borrar los anteriores, salvo con Dibujar o la goma activos, donde solo avisa. «Colocar delante» pone un canvas vacío sin marcar esquinas.
- **Cambiar el tamaño:** sin otra herramienta activa, arrastrar el borde mueve ese lado y deja fijo el opuesto; desde una esquina, dos lados. Hay una franja de 2 unidades a cada lado del borde, y se ilumina en cian solo el lado que se agarraría (en una esquina, sus dos lados; en otra forma, el tramo que mira hacia ahí), también mientras se arrastra. Mínimo 12×8, máximo 260, y nunca deja contenido fuera. Un elemento o botón encima del borde tiene prioridad.
- **Goma:** junto a Dibujar, en el panel y en el menú radial. Arrastrarla borra solo la parte de los trazos que toca y los parte si hace falta; los trozos son trazos normales. No afecta a notas ni figuras, pero sí a subrayados y a las líneas de vida de la plantilla de secuencia, que también son trazos. Un anillo muestra su alcance (radio de 1,5 unidades).
- **Menú radial de cada canvas:** un botón + en la esquina superior derecha (en otras formas, en su borde en esa dirección). Al pulsarlo, gira y despliega un cuarto de círculo hacia dentro del canvas, en dos anillos: Dibujar, Goma y Escribir en el interior; Flecha, Forma y papelera en el exterior, en los huecos de los anteriores. Forma abre un tercer arco por fuera con las formas. Se cierra al elegir una herramienta o al pulsar fuera; con el menú cerrado, el + muestra en cian la herramienta activa.
- **Escribir:** edita el elemento seleccionado o crea un texto nuevo, y se escribe con el teclado. Pulsar fuera termina y deselecciona, sin empezar otro canvas. Si no se escribió nada, el texto nuevo desaparece. Máximo 80 caracteres; un texto o nota vaciado recupera el anterior; la caja crece hacia abajo. Borrar un elemento pide una segunda pulsación en 3 segundos.
- **Mover un canvas:** sin otra herramienta activa, arrastrar su interior; un toque sin arrastrar solo deselecciona. Un elemento o una conexión bajo el cursor tienen prioridad: se arrastra el elemento. El contenido viaja con el canvas. Al apuntar a una superficie de otra orientación, gira y se pega a ella con todo su contenido, también en grupo.
- **Agarrar:** mantener pulsado medio segundo el interior sin mover la mano recoge el canvas, o su grupo, en una bola que sigue al cursor a 75 cm. Al soltar, reaparece con su tamaño, centrado en la dirección de la bola: pegado a la superficie cercana a la que se apunta (hasta 1,5 m) o, si no hay, flotando de frente a la distancia a la que estaba. Si nunca se alejó de donde empezó (unos 0,8 grados), vuelve exactamente a su sitio y no se engancha a un canvas vecino. Arrastrar en cuanto se pulsa desliza como siempre.
- **Formas:** Rectángulo, Óvalo, Triángulo y Rombo, en el segundo arco del menú radial. Dibujo, clics y flechas respetan la forma real.
- **Varios canvas:** flechas entre ellos que siguen a sus canvas.
- **Botón de agrupar:** cuando dos canvas casi paralelos están a menos de 15 unidades (o se solapan), aparece un botón flotante en el centro del hueco. Una pulsación los agrupa, y al mover uno se mueven juntos; el botón cambia de icono y se pone en cian. Otra pulsación los separa. Si el grupo tiene más canvas, separa todo el grupo. Se oculta con el menú radial de uno de los dos abierto y mientras se lleva uno en la bola. Cada pareja tiene su botón.
- **Borrar un canvas (papelera del menú radial):** directo si está vacío; con contenido pide una segunda pulsación en 3 segundos.
- **Menú principal, pegado a la vista:** un botón fijo en la esquina superior izquierda de la franja visible abre y cierra un panel plano debajo de él, que sigue a la cámara. Tiene notas, texto, pantallas, figuras, diagramas de flujo, puertas lógicas, marcadores, stickers, plantillas, capas, agrupar elementos y conectar bloques. Al colocar un canvas solo muestra Horizontal, Vertical, Colocar delante y Cancelar. Empieza cerrado. Sigue abierto al cambiar de pestaña, color, grosor, capa, orientación o Varios, y con Borrar y Vaciar (que piden confirmar). Se cierra con lo demás, al pulsar fuera (que no hace nada más), o al usar un menú radial.
- **Línea de estado:** junto a ese botón, siempre visible y ajustada al mensaje. Ahí salen las indicaciones, los avisos y el nombre del botón apuntado.

## Pendiente de la especificación

Imágenes, comentarios, captura y alineación con objetos físicos. Nada de esto está empezado.

## Arquitectura (`Assets/Scripts/`)

| Archivo | Papel |
|---|---|
| `CanvasApp.ts` | Controlador: colocación, entrada, herramientas, mover, cambiar el tamaño, goma, grupos, borrado |
| `CanvasInstance.ts` | Un canvas: documento, pose, escala, grupo, menú radial |
| `CanvasDocument.ts` | Modelo de datos de elementos y conexiones de un canvas, con eventos. No dibuja |
| `CanvasRenderer.ts` | Dibuja el documento y la superficie. Forma, límites y `retire()` para destruir objetos |
| `CanvasGeometry.ts` | Contornos, rellenos, trazos y tubos con `MeshBuilder` |
| `CanvasLinks.ts` | Flechas entre canvas: guardan quién enlaza con quién y se recalculan según las poses |
| `CanvasDockUI.ts`, `CanvasEdgeBarUI.ts`, `CanvasPill.ts` | Interfaz con UIKit: botón, estado y menú pegados a la vista, menú radial de cada canvas (conserva el nombre de cuando era una barra) y botones |
| `CanvasTemplates.ts`, `CanvasTheme.ts`, `CanvasIcons.ts` | Plantillas, colores e iconos |

La escena es `Assets/Scene.scene`: el objeto `CanvasAR` lleva `CanvasApp`, y su hijo `CanvasDock` lleva `CanvasDockUI`, que al arrancar pasa a ser hijo de la cámara. Los canvas y sus menús radiales se crean en ejecución.

## Decisiones que no hay que deshacer

- **Entrada:** se usan los eventos del interactor y la intersección del rayo con el plano, no `InteractableManipulation`.
- **Detección de superficie:** `WorldQueryModule` con `filter = false` y una consulta nueva por cada clic. Con filtro o con un resultado guardado, un clic en la mesa daba un canvas vertical.
- **Escala por distancia:** la raíz del canvas escala según `distancia / 135`, entre 0,6 y 3. Un canvas flotante a 75 cm usa el mínimo, 0,6.
- **Canvas flotante (2026-11-07):** a petición del usuario, para no crear canvas gigantes en paredes lejanas. Solo cambian posición y tamaño: el gesto de dos esquinas es el mismo. `FAR_SURFACE_DISTANCE` (150, «para probar», según el usuario) y `FLOATING_DISTANCE` (75, la longitud de un brazo). Una superficie lejana da siempre un canvas vertical, también si es un suelo. El menú pegado a la vista queda a 50 cm, por delante. «Colocar delante» y Mover no se han cambiado.
- **Colisionador rectangular:** la superficie conserva un colisionador de caja. Las esquinas fuera de la forma se filtran en `onTriggerStart` con `contains()`.
- **Destruir objetos:** usar `retire()`, nunca `destroy()` directo en algo con `Interactable`. El cursor de SIK guarda objetos en caché y lanza "Object is null" si ya no existen. Además, borrar un canvas se aplaza fuera del evento de su propio botón.
- **Cambio de superficie:** exige 0,15 s apuntando entre mesa y pared, y 0,5 s entre dos paredes, para que el canto de un marco no tuerza el canvas.
- **Crecer con el contenido:** un rectángulo crece por el lado necesario. Las demás formas crecen lo mínimo y se desplazan lo mínimo (`fitShapeToContent`). El triángulo apoya el contenido en la base. `shapeBase` recupera el tamaño al volver a otra forma.
- **Menú pegado a la vista (2026-11-07):** a petición del usuario, sustituye al panel que flotaba en el mundo. Es hijo de la cámara, plano y mirando hacia ella, a 50 cm para que ningún canvas se interponga. Se escala para verse como un panel a 105 cm. No usa una cámara ortográfica de pantalla porque SIK apunta con colisionadores en el mundo. Todo se coloca en la esquina de la franja visible de la Preview, medida en `CanvasDockUI.ts`.
- **Distancia al soltar la bola (2026-11-07):** el canvas vuelve a la distancia que tenía, no a la de la bola: sin cambiar de tamaño, a 75 cm uno de escala 1 llenaba toda la vista. Mientras dura el agarre sigue activo con escala 0,005 en lugar de desactivarse, y así sus flechas siguen a la bola.
- **Arco del menú radial:** un cuarto de círculo hacia dentro del canvas (180° a 270° en `CanvasEdgeBarUI.ts`), pedido por el usuario el 2026-11-07 para que quede entero sobre el canvas; antes era un semicírculo. Dos anillos (radios 7,5 y 13) y las formas en un tercero (19). El + va dentro de la esquina (`HUB_INSET`). Sobre una mesa se inclina 40° y se eleva: plano se hundiría en la superficie.
- **Añadir un icono:** bajar el SVG `symbols/web/<nombre>/materialsymbolsrounded/<nombre>_wght600_48px.svg` de la revisión anotada en `THIRD_PARTY_NOTICES.md`, añadirle `fill="#ffffff"`, copiarlo a `Assets/Icons/`, convertirlo con `ConvertSvgToTexture` a 128 px, borrar el SVG y añadirlo a `CanvasIcons.ts`. Los botones de solo icono se pintan con `Component.Image` y el material `Image.mat` de UIKit.
- **Git LFS (2026-11-07):** el repositorio sigue el `.gitattributes` de Lens Studio, así que imágenes, fuentes y paquetes de `Assets/` y `Packages/` van en LFS. Basta con un `git add` normal, sin ningún paso especial. Clonar sin Git LFS instalado da archivos de texto en lugar de binarios. Alba no abre el proyecto en su ordenador: solo edita documentos en GitHub.
- **Grosor de lámina (2026-11-07):** a petición del usuario, para que el canvas no desaparezca al verlo de canto. `SHEET_DEPTH` (0,4 unidades) hacia detrás de la cara: un canto y una línea en la cara trasera, del mismo color que el borde y cambiando con él (`setBorderColor`), sin rellenar la cara trasera. Los botones del menú radial llevan el mismo canto (`addPillEdge` en `CanvasPill.ts`), del color de su borde; el panel y el botón de agrupar, no. Una segunda cara rellena oscurecería el canvas de frente y bajaría el contraste. Sobre una pared real, el canto queda dentro de ella.
- **Contraste:** el alfa del panel (0,92) está elegido para que el texto llegue a 4,5:1 aunque detrás haya blanco. El del canvas bajó de 0,75 a 0,25 a petición del usuario (2026-11-07), para que se note solo el borde: el texto suelto da 5,2:1 sobre gris medio y más sobre fondos oscuros, pero 1,6:1 si detrás hay blanco. Notas y pantallas llevan su propio fondo. Medido con la fórmula WCAG, no en gafas. `BackPlate` solo ofrece grises fijos, por eso el panel lleva encima un fondo propio (`PlateFill`).
- **UIKit:** `FlexLayout` descubre sus elementos solo y `addItems` antes de iniciarse falla. `BackPlate` en lugar de `Frame`, que salía sobredimensionado. Los colores sólidos de `CapsuleButton`, también los del borde, se consiguen con degradados de un solo color: `borderDefaultColor` no tiene efecto.

## Correcciones ya hechas (no reintroducir)

- El canvas no terminaba al segundo clic: la superficie recién creada se tomaba por una pulsación en el panel.
- El panel tapaba mesas y canvas: ahora está cerrado salvo que se abra con su botón.
- Letras de los botones cortadas: `LABEL_Z = 0.35`.
- Clic fuera demasiado sensible: el margen se limita a la zona real del menú radial (`onEdgeBar`).
- Excepciones del cursor al borrar: se resuelve con `retire()`.
- Triángulo sin base visible: `subdivide()` en el contorno.
- Menú tapado por notas: va en z = 1,4 sobre una pared.
- Triángulo unas 3 veces mayor que el rectángulo al meter una nota: ahora unas 1,6 veces.

## Límites conocidos

- Las flechas enlazan canvas, no bloques de canvas distintos. Entre canvas casi pegados se reducen a un punto.
- El botón de agrupar mide la cercanía con el rectángulo que envuelve la forma, y solo entre canvas casi paralelos. Puede caer sobre un tercer canvas o sobre el contenido, y tiene prioridad sobre ellos.
- Girar y Colocar de nuevo se rechazan mientras un canvas está en un grupo.
- Marcar o soltar sobre el canto de un objeto orienta el canvas según esa cara. Se corrige moviéndolo.
- Arrastrar un canvas no lo hace saltar entre superficies de la misma orientación a distinta altura, como de una mesa al suelo. Es a propósito, para que no se caiga al pasar por el borde.
- En un canvas de menos de unas 24 unidades de lado, el menú radial (y sobre todo el arco de formas) sobresale de él.
- Un triángulo no puede contener un rectángulo con menos del doble de su área: es geometría, no un fallo.
- Cambiar el tamaño y mover un canvas solo funcionan sin otra herramienta activa: con otra, la franja interior del borde hace lo propio de esa herramienta, y la exterior no hace nada. Si el menú abierto, el botón de menú o la línea de estado tapan un borde, ese borde no se puede agarrar.
- El borde de un canvas inactivo (`#A0B1C5` al 60 %) da 3,55:1 sobre `#182230`, pero baja a 2,11:1 si detrás hay blanco. En gafas, el contraste real está sin medir.
- `retire()` no cubre del todo la caché del cursor de SIK: una vez saltó `Object is null` en `blendCachedInteractables`, 7 minutos después de Vaciar, sin más efecto visible. No reproducido.
- En Preview, lo virtual solo se ve en una franja central (x entre 0,27 y 0,73 aprox.), y el menú radial de un canvas cerca del borde puede quedar fuera. El + cubre la parte interior de la esquina superior derecha: para cambiar el tamaño desde ella, hay que agarrar por fuera. Sobre una mesa, el menú se ve pequeño e inclinado, y queda en la esquina lejana porque no se adapta a quien mira desde el otro lado.
- El rayo de SIK llega a 500 cm: un canvas a más distancia se ve pero no responde. Ya no se crea así, pero arrastrarlo aún puede llevarlo a una pared lejana, donde además crece.
- Un canvas flotante queda fuera de la franja visible de la Preview con poco que se mueva la cámara de lado: a 75 cm, unos 20 cm desde el centro.
- Abierto, el menú tapa la parte alta de la vista, y con ella el + de un canvas alto: hay que cerrarlo para llegar a este. En gafas no se ha visto: su posición está medida para la franja de la Preview.
- En Preview, `KeyPressEvent` solo da letras A-Z, números, espacio, retroceso, flechas y modificadores: ni ñ, ni tildes, ni puntuación, ni Enter.
- Sin probar con el ratón real (todo lo hecho el 2026-11-07 se probó con clics simulados): el menú pegado a la vista, el resaltado por lados al apuntar sin pulsar (en la simulación, un `touch move` también pulsa), el nombre del botón al apuntarlo, y que tras elegir una herramienta del menú radial mover el cursor fuera del canvas no empiece otro, que en la simulación sí ocurre.
- Sin probar en ningún caso: Escribir sobre una mesa o dentro de una forma no rectangular; plantillas dentro de una forma no rectangular; llevar de mesa a pared un canvas con forma; una flecha entre un canvas con forma y otro bien separado; el botón de agrupar con formas no rectangulares, con tres o más canvas, sobre una mesa o entre canvas muy solapados; cerrar el menú radial pulsando fuera; un canvas flotante apuntando a un suelo o una mesa lejanos, o sin ninguna superficie detectada; mover o llenar de contenido un canvas flotante; soltar la bola sobre una superficie cercana, agarrar un grupo, un canvas con contenido o con flechas; el menú principal abierto mientras se escribe, o sobre una mesa; la goma en otras capas o sobre una mesa.

## Cómo probar sin romper nada

**No usar nunca `QueryRuntimeSceneTool`, `PreviewInteractTool` ni `CaptureRuntimeViewTool`.** Instalan paquetes (`AiPreviewAgentInspect`, `Icons`, `Motion`) que no compilan y bloquean el editor con "Invalid transition from Immutable to Mutable". Hubo que cerrar Lens Studio y borrarlos a mano. En `Packages/` solo deben estar SIK y UIKit.

Usar `RecompileTypeScriptTool`, `RunAndCollectLogsTool`, `InjectPreviewGesture` y `CapturePanelScreenshotTool`. Buscar en el log `[CanvasAR]` y `Object is null`.

Particularidades de los clics simulados, que pueden parecer fallos sin serlo:

- Un `touch move` a un sitio nuevo dispara un `onTriggerStart` fantasma con el objetivo anterior y el rayo ya en el punto nuevo. Si el objetivo anterior era un botón no pasa nada, pero si era la superficie y el punto está fuera, empieza otro canvas. Tras cerrarse un menú, no hacer un `touch move` suelto fuera del canvas.
- No generan hover. Para pulsar de forma fiable: `touch move` dos veces en el punto, `touch start` + `end` (solo actualiza el objetivo), y otro `touch start` + `end` (pulsa de verdad). Para arrastrar, ese segundo `start` va seguido de los `move` y el `end`.
- Encadenar dos pulsaciones sobre botones distintos en un mismo envío puede perder la segunda: mejor un envío por pulsación, salvo en las de doble confirmación. Lo más fiable es enviar `move`, `move`, `start`, `end` en una llamada, y `start`, `end` en otra. Tras un reinicio de la Lens, esperar unos segundos, y comprobar en el registro que la pulsación llegó antes de seguir.
- Cada llamada tarda segundos, así que para probar un arrastre rápido el `start` y los `move` deben ir en el mismo envío; si no, cuenta como mantener pulsado.
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
Alba Anton también sube a `main` desde la web de GitHub: haz `git fetch` antes de subir o de apoyarte en una guía, integra con rebase y nunca fuerces. Verifica el commit antes de hacer push, en un paso separado.

## Preguntas abiertas para el usuario

- Si Seleccionar, Flecha y Subrayar deben dejar de iniciar otro canvas al pulsar fuera, como ya hacen Dibujar y la goma.
- Arrastrar un canvas hacia una pared: el usuario anticipó el 2026-11-07 que se moverá sin cambiar de tamaño, pero «lo definiremos después». Hoy, al pegarse arrastrando, sigue cambiando de escala según la distancia; soltando la bola ya no.
- Si «Colocar delante» debe crear también a 75 cm: sigue a 135 cm con escala 1.
- Si añadir Deshacer. No existe, así que lo borrado, también con la goma, no se recupera.
- Si la goma debe respetar subrayados y líneas de vida de la plantilla de secuencia.
- Si el botón de menú y la línea de estado deben ir en otro sitio en gafas, cuya zona visible no se ha medido.
- Regreso de la bola a su sitio: el usuario lo vio «en algunos momentos» con el ratón real. Se corrigió la causa encontrada (se comparaba solo la posición final con la inicial), pero no se reprodujo su caso: confirmar si sigue ocurriendo.
- Si cambiar los iconos menos claros: Lógica, Rombo y Decisión, Agrupar, Colocar de nuevo, Colocar delante, Horizontal y Vertical.
