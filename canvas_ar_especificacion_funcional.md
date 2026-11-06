# CANVAS AR --- Especificación funcional para implementación

> **Objetivo:** describir qué debe poder hacer la aplicación y cómo
> deben comportarse sus herramientas. Guía de implementación para Lens
> Studio y gafas SPECS/Spectacles.
>
> Este documento convierte el concepto del proyecto en requisitos
> funcionales y comportamientos observables. No presupone que las
> funciones estén ya implementadas.

## 1. Objetivo del producto

Crear un **canvas colaborativo en realidad aumentada** donde varias
personas puedan construir y modificar contenido visual en un espacio
compartido.

La aplicación debe permitir: - Crear superficies de trabajo o pantallas
flotantes. - Escribir y editar texto directamente en ellas. - Crear
notas y elementos gráficos. - Construir diagramas de flujo mediante
bloques conectados por flechas. - Organizar elementos en dos dimensiones
y en profundidad. - Visualizar relaciones y conexiones en 3D. - Mover,
agrupar, reorganizar y editar elementos. - Guardar versiones y recuperar
estados anteriores. - Colaborar en tiempo real.

La mesa o una superficie real puede servir como punto de anclaje común.
El canvas se despliega sobre ella y puede relacionarse visualmente con
objetos físicos.

## 2. Crear el espacio de trabajo

### 2.1 Canvas o superficie de trabajo

El usuario debe poder crear un canvas para empezar a trabajar. El canvas
es una superficie visual situada en el espacio real o aumentado, similar
a una pizarra sobre la que se colocan elementos.

Comportamiento esperado: - Mostrar una superficie de trabajo reconocible
y estable. - Permitir colocar elementos sobre ella. - Permitir mover y
reorganizar elementos. - Mantener los elementos en su posición espacial
mientras el usuario trabaja. - Permitir ampliar el trabajo más allá de
una única zona cuando sea necesario. - Mantener el contenido legible y
mostrar detalles bajo demanda.

### 2.2 Pantallas y paneles

El usuario debe poder crear **pantallas o paneles de contenido** dentro
del espacio de trabajo. Cada pantalla es una zona donde organizar
información.

Cada pantalla debe poder: - Crearse dentro del canvas. - Contener texto
y elementos visuales. - Editarse después de crearla. - Moverse y
reorganizarse en el espacio. - Agruparse con otros elementos cuando
tenga sentido.

El diseño concreto de los controles para crear, seleccionar y editar
pantallas queda pendiente de definir. No limitar la aplicación a una
única pantalla fija.

### 2.3 Escribir y editar

El usuario debe poder añadir texto al canvas y a las pantallas.

Operaciones necesarias: - Crear un bloque de texto o nota. - Escribir y
modificar su contenido. - Seleccionar y mover el bloque. - Cambiar su
ubicación dentro de la composición. - Organizar varias notas o bloques
como un grupo. - Utilizar post-its para ideas breves.

El texto debe permanecer legible en AR. Evitar que la profundidad, el
tamaño o la distribución dificulten su lectura.

## 3. Crear diagramas

### 3.1 Figuras y bloques

El usuario debe poder crear elementos visuales para representar
información y procesos: - Figuras básicas. - Bloques o nodos para
diagramas. - Símbolos de diagramas de flujo. - Puertas lógicas. -
Flechas. - Notas y post-its.

Cada elemento debe poder seleccionarse, moverse y editarse. También debe
poder agruparse con otros elementos.

### 3.2 Diagramas de flujo

La aplicación debe permitir construir diagramas de flujo directamente en
el espacio de trabajo.

Comportamiento esperado: 1. Crear bloques o símbolos que representen
pasos, procesos o decisiones. 2. Colocar los bloques en el canvas. 3.
Conectar bloques mediante flechas. 4. Mover los bloques y reorganizar el
diagrama. 5. Mantener las conexiones asociadas a los elementos
correspondientes cuando estos se muevan. 6. Crear caminos alternativos y
representar decisiones.

Las flechas deben comunicar la dirección del flujo. Si representan una
conexión entre dos bloques, deben conservar la relación entre sus
extremos al reorganizar el diagrama; no deben ser dibujos
independientes.

### 3.3 Otros diagramas

La aplicación debe contemplar plantillas editables para: - **Card
sorting:** organizar notas o contenidos en grupos y categorías. - **User
journey:** representar etapas, acciones, dificultades y oportunidades. -
**Arquitectura de sistemas:** representar componentes, servicios y
conexiones. - **Diagramas de secuencia:** representar el orden de las
interacciones entre personas y componentes.

Las plantillas son puntos de partida editables y utilizan las
herramientas generales del canvas.

## 4. Organización espacial y visualización 3D

### 4.1 Distribución en el espacio

El contenido no debe limitarse a una pizarra plana. La aplicación debe
permitir organizar información utilizando posición, profundidad y
distintas capas.

Comportamiento esperado: - Colocar elementos en diferentes posiciones
del espacio. - Distribuir contenido en capas. - Separar visualmente
grupos o partes de un sistema. - Permitir que las personas rodeen la
superficie y observen la composición desde distintas perspectivas. -
Mantener relaciones visuales comprensibles entre elementos.

### 4.2 Conexiones tridimensionales

La aplicación debe representar conexiones entre elementos en el espacio
3D.

Usos previstos: - Mostrar cómo se relacionan componentes de una
arquitectura de sistemas. - Visualizar conexiones entre partes de un
objeto o maqueta. - Representar estructuras con diferentes capas o
niveles. - Mostrar relaciones espaciales entre elementos que no están en
un mismo plano.

Las conexiones deben ayudar a comprender la estructura representada. La
profundidad no debe añadirse como decoración: debe comunicar relaciones,
niveles o agrupaciones útiles.

### 4.3 Relación con objetos físicos

El canvas puede utilizarse junto a objetos reales, como una maqueta o
una placa electrónica. Debe contemplarse la posibilidad de situar
anotaciones y alternativas cerca de partes concretas de esos objetos.

**Límite:** una superposición precisa requiere alinear correctamente el
contenido AR con el objeto. El concepto no define todavía el método
técnico de alineación.

## 5. Dibujo y marcado

El usuario debe disponer de herramientas para marcar y destacar
información: - Dibujo libre. - Tres grosores de trazo. - Subrayado. -
Colores básicos. - Stickers. - Imágenes.

Estos elementos deben poder añadirse al canvas y organizarse junto al
resto del contenido.

## 6. Selección, movimiento y organización

Las herramientas de edición deben permitir: - Seleccionar un elemento. -
Moverlo a otra posición. - Editar su contenido cuando corresponda. -
Agrupar varios elementos. - Mover grupos. - Conectar elementos mediante
flechas o conexiones. - Reorganizar la composición sin perder las
relaciones entre elementos conectados.

La interacción concreta para seleccionar, arrastrar, agrupar, editar o
borrar elementos debe adaptarse a las posibilidades de las gafas y de
Lens Studio. Este documento define el comportamiento deseado, no un
gesto técnico específico.

## 7. Colaboración en tiempo real

El canvas debe ser un espacio compartido por varias personas.

Funciones necesarias: - Permitir que varias personas editen
simultáneamente. - Reflejar los cambios realizados por los
participantes. - Mostrar qué elemento manipula cada participante. -
Permitir mencionar a otras personas. - Permitir comentar el canvas en
general. - Permitir comentar elementos concretos.

La experiencia debe mantener un contexto de trabajo común para todos.

La forma de crear o unirse a una sesión, identificar participantes y
gestionar permisos no está especificada y debe definirse durante el
diseño técnico.

## 8. Guardado, versiones y recuperación

El sistema debe conservar la evolución del trabajo.

### 8.1 Guardar una versión

El usuario debe poder guardar el estado actual del canvas como una
versión. Cada versión debe permitir: - Asignar un nombre. - Añadir una
nota que explique el estado o el motivo de guardarlo.

### 8.2 Consultar y comparar

El usuario debe poder revisar versiones anteriores y comparar cambios
entre estados para comprender cómo ha evolucionado el trabajo y explorar
alternativas.

### 8.3 Recuperar una versión

El usuario debe poder recuperar un estado anterior para continuar
trabajando desde él.

**Requisito importante:** recuperar una versión no debe borrar las
versiones posteriores. Debe ser posible volver a un estado anterior y
explorar una alternativa conservando el historial existente.

La comparación a nivel de elemento ---identificar qué notas, figuras o
conexiones han cambiado--- es una oportunidad de diferenciación y debe
considerarse en el diseño.

## 9. Capturas, fotografías y compartir

Funciones contempladas: - Capturar una imagen del canvas AR. - Añadir
fotografías del entorno físico al espacio de trabajo. - Compartir
resultados.

La conversión automática de una composición física fotografiada en
elementos editables es una posibilidad adicional pendiente de validar.
No debe confundirse con tomar, guardar o compartir una fotografía.

## 10. Plantillas

La aplicación debe contemplar plantillas editables para acelerar la
creación de distintos tipos de trabajo:

  -----------------------------------------------------------------------
  Plantilla                           Contenido que debe facilitar
  ----------------------------------- -----------------------------------
  Card sorting                        Notas o tarjetas organizables en
                                      grupos y categorías.

  Diagrama de flujo                   Bloques, símbolos de decisión y
                                      flechas para procesos y caminos
                                      alternativos.

  User journey                        Etapas, acciones, dificultades y
                                      oportunidades.

  Arquitectura de sistemas            Componentes, servicios y
                                      conexiones; posibilidad de
                                      aprovechar la distribución 3D.

  Diagrama de secuencia               Participantes o componentes y orden
                                      de sus interacciones.
  -----------------------------------------------------------------------

Las plantillas deben poder modificarse y utilizar las herramientas
generales del canvas.

## 11. Criterios de calidad

-   **Legibilidad:** el texto debe poder leerse cómodamente en AR.
-   **Claridad visual:** figuras, flechas y conexiones deben comunicar
    su función.
-   **Relaciones persistentes:** mover un bloque conectado no debe
    destruir la relación representada por la flecha.
-   **Utilidad del 3D:** la profundidad debe expresar estructura, capas
    o relaciones.
-   **Edición flexible:** los elementos deben poder moverse, agruparse y
    reorganizarse.
-   **Colaboración comprensible:** debe ser posible reconocer qué está
    haciendo cada participante.
-   **Historial seguro:** recuperar una versión no debe eliminar
    versiones posteriores.

## 12. Funciones definidas y aspectos pendientes

### Funciones descritas en el concepto

-   Crear canvas y guardar plantillas propias reutilizables.
-   Crear y editar post-its, figuras, símbolos de flujo, puertas lógicas
    y flechas.
-   Mover, agrupar y conectar elementos.
-   Dibujar con tres grosores, subrayar y utilizar colores básicos.
-   Añadir stickers e imágenes.
-   Editar simultáneamente y ver qué manipula cada participante.
-   Mencionar personas y comentar el canvas o elementos concretos.
-   Capturar el canvas AR, añadir fotografías del entorno y compartir
    resultados.
-   Guardar versiones con nombre y notas, comparar cambios y recuperar
    estados anteriores.
-   Organizar contenido en el espacio 3D.

### Aspectos que requieren decisiones o validación

No asumir una solución técnica sin revisarla primero: - Cómo crear,
abrir y organizar pantallas o paneles. - Cómo seleccionar y manipular
elementos mediante las gafas. - Cómo crear y compartir una sesión
colaborativa. - Cómo sincronizar cambios entre participantes. - Cómo
anclar el canvas a una mesa o superficie compartida. - Cómo alinear
anotaciones con objetos físicos. - Cómo comparar visualmente dos
versiones. - Cómo transformar una fotografía de una composición física
en elementos editables.

## 13. Prioridad de implementación y MVP

El concepto original define la visión del producto, pero no establece
qué funciones deben entrar en la demo de la hackatón.

Como propuesta inicial de orden de trabajo, valorar primero el flujo
esencial de creación y edición: 1. Crear una superficie de trabajo. 2.
Crear pantallas, notas y bloques de contenido. 3. Escribir y editar
texto. 4. Crear figuras y diagramas de flujo. 5. Conectar bloques
mediante flechas. 6. Mover y reorganizar elementos conservando sus
conexiones. 7. Representar relaciones espaciales en 3D.

La colaboración simultánea, el historial avanzado, las plantillas
adicionales y la integración precisa con objetos físicos pueden
priorizarse según el tiempo disponible y las capacidades verificadas de
la plataforma.

Esta lista es una propuesta de orden de trabajo, no una confirmación de
que todas esas funciones estén implementadas o sean técnicamente
triviales.

## 14. Contexto técnico

-   **Plataforma:** Lens Studio.
-   **Dispositivo objetivo:** gafas SPECS/Spectacles.
-   **Tipo de aplicación:** experiencia colaborativa de realidad
    aumentada.
-   La mesa o una superficie real puede funcionar como anclaje
    compartido.

Antes de implementar funcionalidades específicas, comprobar las APIs,
capacidades y restricciones reales de la versión de Lens Studio y del
dispositivo objetivo. No inventar APIs ni dar por hecho que una
interacción está soportada.

## 15. Referencias del concepto original

-   [SupAR Board --- proyecto e
    historial](https://devpost.com/software/supar-board)
-   [Noda](https://noda.io/)
-   [Noda + Miro](https://marketplace.miro.com/marketplace/noda/)
-   [ShapesXR --- documentación](https://learn.shapesxr.com/)
-   [ShapesXR ---
    colaboración](https://learn.shapesxr.com/collaboration)
-   [Code Snap](https://devpost.com/software/code-snap)
-   [Post-It para
    Spectacles](https://devpost.com/software/post-it-jrswqx)
-   [Figmin XR --- guías](https://www.figmin.com/learn.html)
-   [Figmin XR para Tilt Five](https://www.tiltfive.com/games/figmin-xr)
-   [Hackatón Learn AR with SPECS](https://learn-specs.devpost.com/)

------------------------------------------------------------------------

## Instrucciones para el agente de desarrollo

Lee este documento completo antes de proponer o modificar código.

1.  Trata las secciones funcionales como descripción del comportamiento
    esperado.
2.  Distingue los requisitos definidos de los aspectos pendientes de
    decisión.
3.  No sustituyas las funciones por una demo meramente visual: cuando
    una función forme parte del MVP acordado, debe permitir realizar la
    acción descrita.
4.  Comprueba qué capacidades ofrece realmente Lens Studio y el
    dispositivo SPECS/Spectacles.
5.  Si una función no está soportada o necesita una solución
    alternativa, explícalo y propón opciones antes de cambiar el
    comportamiento esperado.
6.  No añadas funciones no descritas sin justificar su utilidad y pedir
    confirmación.
7.  Empieza proponiendo una arquitectura y un plan incremental. No
    implementes todo de golpe sin validar primero el alcance del MVP.
