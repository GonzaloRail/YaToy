# YaToy

Prototipo académico de una aplicación web para rastrear buses urbanos simulados en Arequipa, Perú.

## Estado actual

El prototipo funcional incluye:

- Mapa Leaflet con tiles de OpenStreetMap.
- Tres trazados académicos aproximados: C-2, Troncal 1 y C-10.
- Nueve buses simulados y sincronizados con Firebase Realtime Database.
- Filtros por ruta y bus.
- Selección de paraderos desde el formulario o directamente en el mapa.
- ETA local por segmentos y tiempo promedio configurable.
- Geolocalización opcional para calcular la distancia al paradero.
- Diseño responsive, con panel inferior en móvil y panel lateral en escritorio.
- Registro, login, favoritos e historial privado por usuario.
- Panel administrativo con simulador central y lease para impedir duplicados.
- Pruebas del motor de simulación, ETA y cálculos geográficos.

El movimiento continúa siendo **simulado**, no GPS real. Firebase centraliza las posiciones para que todos los navegadores vean la misma simulación.

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

La interfaz consume una fuente de posiciones desacoplada. El despliegue usa `FirebasePositionSource`; `LocalPositionSource` queda disponible para pruebas sin red. Una futura fuente GPS real puede implementar el mismo contrato sin rediseñar el mapa, filtros o ETA.

## ETA y ubicación

El ETA usa los segmentos restantes del circuito y un promedio configurable de 90 segundos por segmento. No considera tráfico ni condiciones reales de operación.

La ubicación se solicita únicamente al presionar `Usar mi ubicación`. Se usa en el navegador para calcular la distancia al paradero seleccionado y no se guarda ni se transmite.

## Plan del proyecto

Consulta [`PLAN.md`](./PLAN.md) para ver las fases, criterios de aceptación, modelo de datos futuro, seguridad Firebase y el registro de avance.

## Firebase

El proyecto Firebase configurado para este prototipo es `yatoy-arequipa-2026`. La Realtime Database usa la instancia predeterminada en `us-central1`.

### Activación manual de Authentication

Antes de implementar el login, abre la [consola de Authentication](https://console.firebase.google.com/project/yatoy-arequipa-2026/authentication/providers), pulsa **Get started**, activa **Email/Password**, habilita la primera opción y guarda los cambios.

### Uso de la autenticación

El botón **Ingresar** abre el diálogo de acceso. Una cuenta nueva requiere nombre, correo y contraseña de seis caracteres como mínimo. Al registrarse se crea `usuarios/{uid}/perfil` en Realtime Database. Las rutas y el mapa continúan disponibles sin iniciar sesión; las siguientes fases usarán la sesión para favoritos e historial.

Prueba manual recomendada:

1. Ejecuta `npm run dev`.
2. Crea una cuenta de prueba desde **Crear cuenta**.
3. Recarga la página y confirma que la sesión persiste.
4. Pulsa **Salir** e ingresa otra vez con la misma cuenta.

### Favoritos e historial

Después de iniciar sesión puedes guardar la ruta o paradero seleccionado. El historial se guarda al completar una selección de ruta, bus y paradero; conserva las diez búsquedas más recientes. Ambos datos se almacenan exclusivamente en `usuarios/{uid}` y no incluyen coordenadas de la ubicación del usuario.

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

## Simulación central

La aplicación lee posiciones desde Realtime Database mediante `FirebasePositionSource`. El panel [`admin.html`](./admin.html) ejecuta el motor de simulación y escribe las posiciones compartidas cada tres segundos.

Para una demostración local:

1. Ejecuta `npm run dev`.
2. Inicia sesión en `index.html` con la cuenta administradora.
3. Abre `http://localhost:5173/admin.html` en la misma sesión.
4. Pulsa **Iniciar simulación**.
5. Abre el mapa en dos pestañas o dispositivos y confirma que todos ven el mismo movimiento.

Solo el UID administrador puede escribir posiciones. El panel usa un lease temporal de diez segundos: una segunda pestaña no puede iniciar otro simulador mientras el lease de la primera continúe vigente. Si se cierra el panel, el lease vence y una nueva sesión puede asumir el control.

## Despliegue en GitHub Pages

El workflow [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) ejecuta tests, compila con Node 24 y publica `dist/` al hacer push a `main`.

Antes del primer despliegue:

1. En GitHub: **Settings > Pages > Build and deployment > Source**, selecciona **GitHub Actions**.
2. En GitHub: **Settings > Secrets and variables > Actions**, crea estos secrets usando los valores de `.env.local`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_ADMIN_UID`
3. En Firebase Authentication: **Settings > Authorized domains**, añade `gonzalorail.github.io`.
4. Sube los cambios a la rama `main`.

La URL prevista es `https://gonzalorail.github.io/YaToy/`. El panel administrativo se publica en `https://gonzalorail.github.io/YaToy/admin.html` y exige la cuenta administradora.

## Fuentes de referencia

- [WikiRoutes Arequipa](https://wikiroutes.info/es/arequipa/catalog), consultada como referencia de nomenclatura de rutas.
- [OpenStreetMap](https://www.openstreetmap.org/copyright), proveedor de los tiles del mapa.

Las coordenadas del repositorio son aproximaciones académicas y no trazados oficiales.
