# CARÁTULA

**Universidad Nacional de San Agustín de Arequipa**  
**Facultad de Ingeniería de Producción y Servicios**  
**Escuela Profesional de Ingeniería de Sistemas**

**Curso:** Plataformas Emergentes (E)  
**Laboratorio 03:** Desarrollo de aplicaciones móviles web

## YaToy: prototipo web de rastreo simulado de buses urbanos en Arequipa

**Docente:** M. Sc. Ing. Rene Alonso Nieto Valencia  
**Integrantes:**
- [Nombre completo 1]
- [Nombre completo 2]
- [Nombre completo 3]

**Grupo:** [Número de grupo]  
**Semestre:** 2026-B  
**Fecha:** [Fecha de entrega]

# Índice

> Actualizar esta sección automáticamente al convertir el documento a PDF.

1. Descripción general del proyecto
2. Resumen
3. Funcionalidades
4. Descripción del proceso de desarrollo
5. Interfaces de la aplicación
6. Lecciones aprendidas
7. Anexos
8. Referencias

# Índice de Figuras

- Figura 1. Vista general de la aplicación YaToy.
- Figura 2. Visualización de rutas y buses simulados en el mapa.
- Figura 3. Selección de ruta, bus y paradero.
- Figura 4. Cálculo de tiempo estimado de llegada y distancia.
- Figura 5. Registro e inicio de sesión.
- Figura 6. Gestión de favoritos e historial.
- Figura 7. Panel administrativo de simulación.
- Figura 8. Arquitectura general de la aplicación.
- Figura 9. Diseño responsive en dispositivo móvil.
- Figura 10. Diseño responsive en escritorio.

# Índice de Tablas

- Tabla 1. Rutas y cantidad de buses simulados.
- Tabla 2. Estrategia de pruebas aplicada al proyecto.

# 1. Descripción general del proyecto

YaToy es una aplicación web responsive orientada al seguimiento simulado de buses urbanos en la ciudad de Arequipa. El proyecto surge como respuesta a la necesidad de contar con una herramienta digital que permita a los usuarios consultar rutas de transporte, identificar paraderos y conocer un tiempo estimado de llegada de un bus.

La aplicación presenta un mapa interactivo de Arequipa en el que se visualizan tres rutas de transporte: C-2, Troncal 1 y C-10. Asimismo, muestra nueve buses que se desplazan de manera continua mediante una simulación centralizada. Esta simulación permite que diferentes usuarios observen las mismas posiciones de los buses desde sus respectivos dispositivos.

YaToy fue desarrollado como un prototipo académico; por ello, las rutas, coordenadas, paraderos y posiciones de los buses son aproximaciones utilizadas únicamente con fines demostrativos. La aplicación no utiliza GPS real ni información oficial de empresas de transporte.

El sistema permite seleccionar una ruta, un bus y un paradero para calcular un tiempo estimado de llegada. También ofrece la opción de utilizar la geolocalización del navegador para calcular la distancia aproximada entre el usuario y el paradero seleccionado. Adicionalmente, los usuarios registrados pueden guardar rutas o paraderos favoritos y revisar su historial de búsquedas.

**[Insertar Figura 1. Vista general de la aplicación YaToy mostrando el mapa, las rutas y el panel de selección.]**

## 1.1 Problema identificado

Los usuarios del transporte público urbano suelen tener dificultades para conocer la ubicación aproximada de los buses y estimar el tiempo de espera en un paradero. Esta falta de información puede ocasionar incertidumbre, tiempos de espera prolongados y dificultades para planificar los desplazamientos diarios.

Aunque YaToy no emplea datos GPS reales, demuestra cómo una aplicación móvil web podría centralizar y presentar información de transporte de forma clara, accesible y adaptable a dispositivos móviles.

## 1.2 Objetivo general

Desarrollar una aplicación móvil web que permita visualizar y rastrear de manera simulada buses urbanos de Arequipa, mostrando rutas, paraderos, ubicación estimada de buses y tiempo aproximado de llegada.

## 1.3 Objetivos específicos

- Visualizar rutas de transporte en un mapa interactivo.
- Simular el movimiento continuo de buses sobre rutas predefinidas.
- Permitir filtrar la información por ruta, bus y paradero.
- Calcular el tiempo estimado de llegada de un bus a un paradero.
- Calcular la distancia entre la ubicación del usuario y un paradero seleccionado.
- Implementar autenticación, favoritos e historial de búsquedas.
- Mantener la información sincronizada para los usuarios mediante una base de datos en tiempo real.

# 2. Resumen

El presente proyecto desarrolla **YaToy**, una aplicación móvil web orientada al rastreo simulado de buses urbanos en Arequipa. La solución propone una interfaz basada en mapas que permite visualizar rutas de transporte, buses en movimiento, paraderos y tiempos estimados de llegada.

La aplicación fue implementada con HTML5, CSS3 y JavaScript modular, utilizando Vite como herramienta de desarrollo. Para la visualización cartográfica se empleó Leaflet con datos cartográficos de OpenStreetMap. La persistencia y sincronización de datos se implementó mediante Firebase Realtime Database, mientras que Firebase Authentication permite gestionar el registro e inicio de sesión de los usuarios.

Entre las funcionalidades principales se encuentran el filtrado por rutas y buses, la selección de paraderos desde el formulario o el mapa, el cálculo de ETA, la geolocalización opcional, la gestión de favoritos, el historial de consultas y un panel administrativo que controla la simulación centralizada de los buses.

El proyecto cumple con los criterios de una aplicación móvil web al ofrecer una interfaz responsive, de fácil aprendizaje y adaptable a pantallas móviles y de escritorio. Finalmente, se declara que los datos mostrados son académicos y simulados, por lo que no deben ser considerados como información oficial para la toma de decisiones de viaje.

**Palabras clave:** aplicación web, transporte urbano, simulación, geolocalización, Firebase, Leaflet, Arequipa.

# 3. Funcionalidades

La aplicación YaToy integra funcionalidades enfocadas en facilitar la consulta de información simulada sobre el transporte urbano.

## 3.1 Visualización de rutas y buses

La aplicación muestra un mapa interactivo centrado en la ciudad de Arequipa. En este mapa se representan las rutas C-2, Troncal 1 y C-10 con colores diferenciados, además de los paraderos asociados a cada recorrido.

Los buses se visualizan mediante marcadores que se actualizan periódicamente, simulando un desplazamiento continuo a lo largo de cada ruta.

**[Insertar Figura 2. Mapa con las rutas C-2, Troncal 1 y C-10, incluyendo buses y paraderos.]**

## 3.2 Filtro por ruta y bus

El usuario puede seleccionar una ruta específica para reducir la información visible en el mapa. Luego, puede elegir uno de los buses pertenecientes a dicha ruta para consultar sus datos y calcular su tiempo estimado de llegada.

| Ruta | Cantidad de buses simulados |
|---|---:|
| C-2 | 2 |
| Troncal 1 | 5 |
| C-10 | 2 |
| **Total** | **9** |

**Tabla 1. Rutas y cantidad de buses simulados.**

**[Insertar Figura 3. Panel de filtros con la selección de ruta y bus.]**

## 3.3 Selección de paraderos

La aplicación permite seleccionar un paradero desde el panel de controles o directamente desde el mapa. Esta selección se sincroniza en la interfaz y se utiliza para calcular el tiempo estimado de llegada del bus seleccionado.

## 3.4 Cálculo de tiempo estimado de llegada

YaToy calcula un ETA o tiempo estimado de llegada tomando en cuenta la posición simulada del bus, el segmento de la ruta en el que se encuentra y el paradero seleccionado. El resultado se muestra en minutos como una estimación referencial.

El cálculo no considera tráfico vehicular, semáforos, congestión ni condiciones reales de operación. Por ello, el sistema muestra claramente que se trata de una simulación académica.

**[Insertar Figura 4. Resultado del tiempo estimado de llegada para un bus y paradero seleccionados.]**

## 3.5 Geolocalización y cálculo de distancia

La aplicación solicita la ubicación del usuario únicamente cuando este presiona el botón correspondiente. Con dicha información, se calcula la distancia aproximada entre la posición actual del usuario y el paradero seleccionado.

La ubicación se procesa localmente en el navegador y no se almacena en Firebase, protegiendo la privacidad del usuario.

**[Insertar Figura 5. Uso de geolocalización y visualización de la distancia hacia un paradero.]**

## 3.6 Registro e inicio de sesión

Los usuarios pueden crear una cuenta utilizando correo electrónico y contraseña. Una vez autenticados, pueden iniciar sesión, mantener su sesión activa después de recargar la página y cerrar sesión cuando lo requieran.

El sistema valida los datos ingresados y muestra mensajes claros cuando existe algún error en el registro o inicio de sesión.

**[Insertar Figura 6. Formulario de registro e inicio de sesión de YaToy.]**

## 3.7 Favoritos e historial

Los usuarios autenticados pueden guardar rutas y paraderos como favoritos para acceder rápidamente a ellos en futuras consultas. También pueden visualizar un historial de búsquedas recientes, el cual registra la ruta, bus, paradero y fecha de consulta.

Cada usuario solo puede acceder a sus propios datos, debido a las reglas de seguridad configuradas en Firebase.

**[Insertar Figura 7. Sección de favoritos e historial de búsquedas del usuario.]**

## 3.8 Simulación centralizada

La aplicación cuenta con un panel administrativo que permite iniciar, pausar y reiniciar la simulación de los buses. Este panel está restringido a un usuario administrador.

Firebase Realtime Database almacena el estado global y el instante de inicio de la simulación. Cada navegador calcula las posiciones a partir de ese reloj compartido, permitiendo que todos los usuarios conectados observen el mismo movimiento sin depender de que el panel administrativo permanezca abierto.

**[Insertar Figura 8. Panel administrativo utilizado para controlar la simulación centralizada.]**

# 4. Descripción del proceso de desarrollo

## 4.1 Planificación

El desarrollo comenzó con la identificación del problema y la definición del alcance del proyecto. Se determinó que la solución sería una aplicación web responsive enfocada en el rastreo simulado de buses urbanos.

Se estableció que el proyecto debía mantener transparencia respecto a sus limitaciones: las rutas, paraderos y posiciones son aproximados, y el movimiento de los buses es simulado. Esta decisión evitó presentar información académica como si fuera un servicio oficial de transporte.

## 4.2 Diseño de la arquitectura

Se diseñó una arquitectura modular para separar las responsabilidades principales de la aplicación. Los datos de rutas, buses y paraderos se mantienen independientes de la interfaz gráfica. El motor de simulación se encarga del movimiento de los buses, mientras que Firebase sincroniza el estado global que permite a cada cliente reconstruir esas posiciones.

```text
Datos de rutas, buses y paraderos
              |
              v
      Motor de simulación
              |
              v
Firebase Realtime Database
              |
              v
    Aplicación web YaToy
              |
      +-------+-------+
      |               |
      v               v
Mapa interactivo   Panel de controles
```

**[Insertar Figura 9. Diagrama o captura que represente la arquitectura de YaToy.]**

## 4.3 Implementación de la interfaz

La interfaz fue diseñada siguiendo un enfoque minimalista y responsive. En dispositivos móviles, los controles se organizan en un panel inferior para mantener el mapa visible. En pantallas de escritorio, los controles se muestran en un panel lateral.

Se aplicaron criterios de accesibilidad como contraste adecuado, etiquetas visibles en formularios, navegación mediante teclado y botones con tamaños apropiados para interacción táctil.

## 4.4 Implementación del mapa y simulación

Se utilizó Leaflet para integrar el mapa interactivo y OpenStreetMap como proveedor de datos cartográficos. Las rutas fueron representadas mediante líneas de colores y los buses mediante marcadores personalizados.

El movimiento de los buses se implementó mediante interpolación entre puntos consecutivos de cada ruta. Cada navegador calcula periódicamente una nueva posición a partir del tiempo transcurrido desde el inicio global y actualiza su marcador en el mapa.

## 4.5 Implementación de persistencia y autenticación

Firebase Realtime Database fue utilizado para almacenar datos de rutas, buses, el estado global de la simulación, favoritos e historial. Firebase Authentication permitió implementar el registro e inicio de sesión con correo electrónico y contraseña.

Las reglas de seguridad fueron configuradas para proteger la información privada de los usuarios. De esta forma, cada usuario solo puede leer y modificar sus propios favoritos e historial.

## 4.6 Pruebas realizadas

Se realizaron pruebas unitarias para validar los cálculos principales de la aplicación, tales como la interpolación de posiciones, el avance de buses, el cierre de rutas, el cálculo de distancia mediante Haversine y el cálculo del ETA.

| Tipo de prueba | Elementos evaluados |
|---|---|
| Pruebas unitarias | Simulación, ETA, cálculo geográfico y validadores |
| Pruebas funcionales | Filtros, selección de paraderos, favoritos e historial |
| Pruebas de interfaz | Diseño responsive en móvil y escritorio |
| Pruebas de sincronización | Visualización de posiciones en múltiples clientes |
| Pruebas de seguridad | Acceso privado a datos de usuarios |

**Tabla 2. Estrategia de pruebas aplicada al proyecto.**

**[Insertar Figura 10. Captura de la ejecución correcta de pruebas o compilación del proyecto.]**

# 5. Interfaces de la aplicación

## 5.1 Interfaz principal

La interfaz principal presenta el mapa como elemento central. Sobre este se muestran las rutas, buses simulados y paraderos. El usuario puede interactuar con los elementos del mapa y utilizar el panel de controles para realizar consultas.

**[Insertar Figura 11. Interfaz principal de YaToy.]**

## 5.2 Panel de filtros

El panel de filtros permite seleccionar una ruta, un bus y un paradero. A partir de estas selecciones, el sistema calcula el tiempo estimado de llegada y muestra información relevante para el usuario.

**[Insertar Figura 12. Panel de filtros y cálculo de ETA.]**

## 5.3 Interfaz de autenticación

La interfaz de autenticación permite a los usuarios registrarse e iniciar sesión. Los formularios incluyen validaciones y mensajes de error comprensibles para facilitar el proceso.

**[Insertar Figura 13. Ventana de autenticación de usuarios.]**

## 5.4 Interfaz de favoritos e historial

Esta sección permite consultar los elementos guardados por el usuario y revisar las búsquedas realizadas anteriormente. El historial puede reutilizarse para repetir una consulta de manera rápida.

**[Insertar Figura 14. Vista de favoritos e historial.]**

## 5.5 Panel administrativo

El panel administrativo está orientado al control de la simulación central. Desde esta interfaz, el administrador puede iniciar, pausar o reiniciar el movimiento de los buses, además de observar el estado de sincronización.

**[Insertar Figura 15. Panel administrativo de control de simulación.]**

## 5.6 Diseño responsive

La aplicación adapta su distribución según el tamaño de pantalla. En móvil, el panel se ubica en la parte inferior para priorizar la interacción táctil; en escritorio, se muestra lateralmente para aprovechar el ancho disponible.

**[Insertar Figura 16. Comparación entre la vista móvil y la vista de escritorio.]**

# 6. Lecciones aprendidas

Durante el desarrollo de YaToy se obtuvieron las siguientes lecciones:

- La separación de responsabilidades facilita el mantenimiento del proyecto. Al independizar el motor de simulación, la interfaz y la persistencia de datos, fue posible trabajar cada componente sin afectar innecesariamente a los demás.
- Firebase Realtime Database permite sincronizar un estado global entre varios usuarios de manera eficiente, incluso cuando cada cliente calcula localmente la parte visual de una simulación.
- La autenticación y las reglas de seguridad son fundamentales para proteger los datos privados de los usuarios, especialmente en funcionalidades como favoritos e historial.
- La geolocalización debe solicitarse únicamente con autorización explícita del usuario y su uso debe comunicarse de forma clara.
- El diseño responsive es indispensable para una aplicación móvil web, ya que los usuarios pueden acceder desde teléfonos, tabletas o computadoras.
- Las pruebas unitarias ayudan a verificar la confiabilidad de cálculos importantes, como el tiempo estimado de llegada y la distancia geográfica.
- Es importante informar de manera transparente las limitaciones del sistema. En este caso, YaToy utiliza datos y movimientos simulados, por lo que no debe interpretarse como una fuente oficial de transporte.

# 7. Anexos

## 7.1 Repositorio del proyecto

- GitHub: <https://github.com/GonzaloRail/YaToy>

## 7.2 Aplicación desplegada

- Aplicación web: <https://gonzalorail.github.io/YaToy/>
- Panel administrativo: <https://gonzalorail.github.io/YaToy/admin.html>

## 7.3 Video de demostración

- Video de uso de la aplicación: [Insertar enlace de YouTube, Google Drive o similar]

## 7.4 Consideraciones para la demostración

Durante la demostración se recomienda realizar las siguientes acciones:

1. Abrir el panel administrativo e iniciar la simulación.
2. Abrir YaToy en uno o más dispositivos.
3. Mostrar que las posiciones de los buses se actualizan de forma sincronizada.
4. Seleccionar una ruta, un bus y un paradero.
5. Mostrar el cálculo del tiempo estimado de llegada.
6. Activar la geolocalización, si el navegador lo permite, y mostrar la distancia al paradero.
7. Registrar o iniciar sesión con un usuario.
8. Guardar una ruta o paradero como favorito.
9. Mostrar el historial de búsquedas.
10. Explicar que la información presentada es una simulación académica.

# 8. Referencias

1. OpenStreetMap. (s. f.). *OpenStreetMap: datos cartográficos abiertos*. <https://www.openstreetmap.org/copyright>

2. Leaflet. (s. f.). *Leaflet: biblioteca JavaScript para mapas interactivos*. <https://leafletjs.com/>

3. Firebase. (s. f.). *Firebase Documentation*. <https://firebase.google.com/docs>

4. WikiRoutes. (s. f.). *Catálogo de rutas de transporte de Arequipa*. <https://wikiroutes.info/es/arequipa/catalog>

5. Mozilla Developer Network. (s. f.). *Geolocation API*. <https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API>
