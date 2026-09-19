# YaToy

Prototipo académico de una aplicación web para rastrear buses urbanos simulados en Arequipa, Perú.

## Estado actual

La Fase 1 está implementada:

- Mapa Leaflet con tiles de OpenStreetMap.
- Tres trazados académicos aproximados: C-2, Troncal 1 y C-10.
- Nueve buses moviéndose localmente mediante interpolación lineal.
- Filtros por ruta y bus.
- Selección de paraderos desde el formulario o directamente en el mapa.
- ETA local por segmentos y tiempo promedio configurable.
- Geolocalización opcional para calcular la distancia al paradero.
- Diseño responsive, con panel inferior en móvil y panel lateral en escritorio.
- Pruebas del motor de simulación y validación de datos.

Firebase, autenticación y persistencia se incorporarán en fases posteriores. El seguimiento actual es **local y simulado**: cada navegador ejecuta su propia simulación. La sincronización central llegará con Firebase Realtime Database.

## Datos y limitaciones

Los trazados, paraderos y coordenadas de este prototipo son aproximaciones académicas plausibles de Arequipa; no son datos oficiales ni GPS real. Las rutas se basan conceptualmente en referencias públicas de transporte, pero no deben usarse para tomar decisiones de viaje.

El mapa utiliza datos cartográficos de [OpenStreetMap](https://www.openstreetmap.org/copyright).

## Requisitos

- Node.js 20 o superior.
- npm.

## Ejecutar localmente

```bash
npm install
npm run dev
```

Vite mostrará una URL local, normalmente `http://localhost:5173`.

## Scripts

```bash
npm run dev      # Servidor de desarrollo
npm test         # Pruebas unitarias
npm run build    # Compilación de producción
npm run preview  # Vista previa del build
```

## Estructura principal

```text
src/js/data/                 Datos locales de rutas, buses y empresas
src/js/core/simulation-engine.js  Motor puro de interpolación y movimiento
src/js/services/             Fuentes de posiciones
src/js/map/                  Integración de Leaflet
src/js/ui/                   Controles de interfaz
src/css/                     Estilos responsive y accesibles
tests/                       Pruebas unitarias
```

## Simulación

Cada bus conserva un segmento y un progreso entre `0` y `1`. Cada tres segundos se avanza el progreso y se interpola su latitud y longitud entre el punto actual y el siguiente. Al terminar el último segmento, el bus vuelve al primero para formar un circuito continuo.

La interfaz consume una fuente de posiciones desacoplada. Actualmente usa `LocalPositionSource`; en una fase posterior se añadirá `FirebasePositionSource` para que todos los usuarios vean las mismas posiciones.

## ETA y ubicación

El ETA usa los segmentos restantes del circuito y un promedio configurable de 90 segundos por segmento. No considera tráfico ni condiciones reales de operación.

La ubicación se solicita únicamente al presionar `Usar mi ubicación`. Se usa en el navegador para calcular la distancia al paradero seleccionado y no se guarda ni se transmite.

## Plan del proyecto

Consulta [`PLAN.md`](./PLAN.md) para ver las fases, criterios de aceptación, modelo de datos futuro, seguridad Firebase y el registro de avance.

## Firebase

El proyecto Firebase configurado para este prototipo es `yatoy-arequipa-2026`. La Realtime Database usa la instancia predeterminada en `us-central1`.

### Activación manual de Authentication

Antes de implementar el login, abre la [consola de Authentication](https://console.firebase.google.com/project/yatoy-arequipa-2026/authentication/providers), pulsa **Get started**, activa **Email/Password**, habilita la primera opción y guarda los cambios.

### Datos y reglas

- `data/seed-data.json` contiene empresas, rutas, buses y posiciones iniciales.
- `database.rules.json` expone lectura de información pública del mapa, deniega todas las escrituras públicas y aísla `usuarios/{uid}` por cuenta autenticada.
- `.env.local` contiene la configuración local de Firebase y está ignorado por Git.
- `.env.example` sirve como plantilla para otros entornos.

Para publicar reglas y restaurar los datos iniciales con Node 24:

```bash
eval "$(fnm env)"
fnm use 24
npx -y firebase-tools@latest deploy --only database --project yatoy-arequipa-2026
npx -y firebase-tools@latest database:set / data/seed-data.json --project yatoy-arequipa-2026 --force
```

> El segundo comando reemplaza toda la base de datos. Úsalo únicamente para restaurar el estado académico inicial.
