# FleetIQ - Deployment to Railway

Este repositorio contiene la aplicación FleetIQ (Next.js 15 Fullstack), configurada y optimizada para ser desplegada en **Railway** utilizando **Docker**.

## Estructura del Proyecto

El proyecto está construido con Next.js (App Router), lo que significa que **el frontend y el backend (API) están integrados en el mismo proyecto**. Esto simplifica el despliegue a un único servicio en Railway.

- `app/`: Contiene la lógica del frontend y el backend (API routes).
- `Dockerfile`: Archivo de configuración Docker multi-etapa optimizado para producción.
- `railway.json`: Archivo de configuración de Railway para definir el comportamiento de construcción y despliegue.

## Ejecución Local (Desarrollo)

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Configura las variables de entorno. Copia `.env.example` a `.env.local` y agrega tus credenciales:
   ```bash
   cp .env.example .env.local
   ```

3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Ejecución con Docker (Local)

Para probar la imagen de producción de Docker localmente:

1. Construye la imagen (nota: debes pasar los argumentos de build si son requeridos):
   ```bash
   docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=tu_url --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key -t fleetiq-app .
   ```

2. Ejecuta el contenedor:
   ```bash
   docker run -p 3000:3000 --env-file .env.local fleetiq-app
   ```
   *Nota: La aplicación estará disponible en `http://localhost:3000`.*

También puedes utilizar docker-compose:
```bash
docker-compose up -d --build
```

## Despliegue en Railway

El proyecto está listo para ser desplegado en Railway sin necesidad de configuraciones adicionales.

### Pasos para desplegar:
1. Sube este repositorio a tu cuenta de GitHub.
2. Inicia sesión en [Railway](https://railway.app/).
3. Crea un nuevo proyecto y selecciona **Deploy from GitHub repo**.
4. Selecciona este repositorio (`fleetiq`).
5. **Variables de Entorno**: Ve a la pestaña **Variables** en Railway y agrega todas las variables necesarias basándote en el archivo `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWKS_URL`
6. Railway detectará automáticamente el archivo `Dockerfile` y `railway.json`, construirá la imagen y asignará un puerto dinámico (`process.env.PORT`) de forma automática.
7. Opcional: Ve a la pestaña **Settings** > **Networking** y genera un dominio público.

## Variables de Entorno Requeridas

Consulta el archivo `.env.example` para ver la lista completa de variables requeridas. Es importante **no hacer commit de secretos al repositorio**.

## Posibles Problemas y Soluciones

- **La compilación falla en Railway por variables no encontradas**: Next.js necesita que las variables con prefijo `NEXT_PUBLIC_` estén disponibles durante el proceso de **build**. Asegúrate de agregar las variables en la interfaz de Railway *antes* de que ocurra el primer build o re-despliega si falló.
- **Error de puerto (Port bind error)**: Asegúrate de no tener `ENV PORT=3000` en el Dockerfile; el Dockerfile actual ha sido modificado para evitar fijar este puerto y usar la variable `$PORT` provista por Railway.
- **La aplicación inicia pero las rutas del backend fallan**: Verifica que las variables del lado del servidor (como `SUPABASE_SERVICE_ROLE_KEY`) estén correctamente configuradas en Railway.
