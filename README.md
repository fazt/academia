# Academia

Plataforma de venta de cursos en video organizados en secciones y capítulos, al estilo Udemy. Es una academia propia: los administradores crean y venden los cursos y los alumnos los compran y los siguen desde el aula.

## Funcionalidades

- **Catálogo público** con búsqueda, filtros por categoría, nivel y precio, y ordenación. Página de detalle con temario, vistas previas gratuitas, instructor, reseñas, SEO (metadata, JSON-LD `Course`) y sitemap.
- **Compra**: carrito (también para invitados, se fusiona al iniciar sesión), cupones (porcentaje o monto fijo, por curso o globales, con límite de usos y caducidad), "comprar ahora", cursos gratis y Stripe Checkout. El precio lo calcula siempre la API.
- **Aula**:
  - Reproductor de Cloudflare Stream con URLs firmadas y progreso que se reanuda.
  - Temario con capítulos completados y recursos descargables.
  - Comentarios y preguntas por capítulo (con respuestas del instructor y preguntas resueltas).
  - Reseñas y certificado PDF verificable al completar el curso.
- **Cuenta**: registro con verificación de email o con Microsoft, login, recuperación de contraseña, perfil (datos, contraseña y avatar), mis cursos, mis compras y mis certificados.
- **Panel de administración**:
  - Dashboard de ventas.
  - CRUD de cursos con constructor de temario (arrastrar y soltar), subida de videos a Stream (tus, reanudable) y recursos.
  - Categorías, cupones, usuarios (rol y accesos manuales), órdenes (con reembolso), moderación de reseñas y bandeja de preguntas sin responder.
- Tema claro/oscuro y paleta de comandos (`Ctrl K`) en toda la aplicación.

## Stack

| Parte | Tecnología |
|---|---|
| Web (`apps/web`, puerto 3010) | Next.js 16 (App Router), Tailwind v4, shadcn/ui, TanStack Query, react-hook-form |
| API (`apps/api`, puerto 3011) | Hono sobre Node, Drizzle ORM, PostgreSQL, Better Auth |
| Compartido (`packages/shared`) | Esquemas Zod, enums y cálculo de precios |
| Servicios | Stripe (pagos), Cloudflare Stream (video), Resend (email), DigitalOcean Spaces (archivos) |

En desarrollo la web reenvía `/api/*` a la API (`rewrites` de Next), así que todo va por el mismo origen y la cookie de sesión no necesita CORS. El cliente de la web está tipado de extremo a extremo con Hono RPC.

## Puesta en marcha

Requisitos: Node 22 o superior, pnpm 10 y Docker.

```bash
pnpm install
docker compose up -d                       # Postgres en localhost:5437
cp apps/api/.env.example apps/api/.env      # revisa los valores
cp apps/web/.env.example apps/web/.env.local
pnpm db:migrate
pnpm db:seed                                # datos de demostración
pnpm dev                                    # web en :3010 y API en :3011
```

El seed crea estos datos:

- Admin: `admin@academia.test` / `admin12345`.
- Alumno: `alumno@academia.test` / `alumno12345`.
- Seis cursos de ejemplo y el cupón `BIENVENIDA20`.

Los capítulos de ejemplo no tienen video reproducible salvo que definas `SEED_STREAM_UID`, que debe ser el uid de un video real de tu cuenta de Stream.

Sin `RESEND_API_KEY`, los emails (verificación, recuperación de contraseña, recibos) se imprimen en la consola de la API. Así puedes copiar los enlaces durante el desarrollo.

## Configurar los servicios

Todas las variables están documentadas en `apps/api/.env.example`.

### Stripe

1. Copia la clave secreta de test a `STRIPE_SECRET_KEY`.
2. En local, reenvía los webhooks con `stripe listen --forward-to localhost:3011/api/webhooks/stripe` y copia el `whsec_…` a `STRIPE_WEBHOOK_SECRET`.
3. En producción, crea un endpoint hacia `https://tu-dominio/api/webhooks/stripe` con estos eventos:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `charge.refunded`
   - `charge.dispute.created`

No hay que crear productos en Stripe: cada Checkout Session se crea con los precios ya calculados por la API.

### Cloudflare Stream

1. Pon en `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_STREAM_API_TOKEN` (permiso *Stream: Edit*) los datos de tu cuenta. En `STREAM_CUSTOMER_CODE` va el código de tu subdominio `customer-<código>.cloudflarestream.com`.
2. Ejecuta `pnpm stream:setup`. Crea la signing key con la que la API firma localmente los tokens de reproducción e imprime las variables que tienes que añadir.
3. En producción, ejecuta `pnpm stream:setup --webhook-url https://tu-dominio/api/webhooks/stream` para registrar el webhook. En local no hace falta: el panel consulta el estado del video mientras se procesa.

Todos los videos se suben con `requireSignedURLs`. Solo se emite un token a quien tiene matrícula activa, a los admins o para capítulos de vista previa.

### DigitalOcean Spaces

1. Crea un bucket y una clave de acceso, y rellena las variables `SPACES_*`. `SPACES_PUBLIC_URL` es la URL pública (o la del CDN) del bucket.
2. Configura el CORS del bucket para permitir `POST` desde el origen de la web, porque las subidas usan POST prefirmado con límite de tamaño.
3. Las portadas y los avatares son públicos. Los recursos de los capítulos son privados y se descargan con URLs temporales.

### Resend

Rellena `RESEND_API_KEY` y `EMAIL_FROM` con un dominio verificado en Resend.

### Microsoft (Entra ID)

Sin `MICROSOFT_CLIENT_ID` y `MICROSOFT_CLIENT_SECRET` el botón "Continuar con Microsoft" no aparece.

1. En el [Microsoft Entra admin center](https://entra.microsoft.com), ve a *App registrations* > *New registration*.
   - En *Supported account types* elige *Accounts in any organizational directory and personal Microsoft accounts*. Debe cuadrar con `MICROSOFT_TENANT_ID=common`. Si solo quieres cuentas de tu organización, elige *Single tenant* y pon el ID del tenant.
   - En *Redirect URI* elige la plataforma *Web* con `http://localhost:3010/api/auth/callback/microsoft`. En producción añade `https://tu-dominio/api/auth/callback/microsoft`.
2. Copia el *Application (client) ID* a `MICROSOFT_CLIENT_ID`. En *Certificates & secrets* crea un *client secret* y copia su **Value** (no el *Secret ID*) a `MICROSOFT_CLIENT_SECRET`. Caduca: apunta la fecha para renovarlo.
3. En *Token configuration* > *Add optional claim* > *ID* marca `email`. Después, en *Manifest*, añade a `optionalClaims.idToken`:

   ```json
   { "name": "xms_edov", "source": null, "essential": false, "additionalProperties": [] }
   ```

`xms_edov` indica que Microsoft ha verificado el email. Solo en ese caso la cuenta nace verificada y entrar con Microsoft se une a una cuenta existente con el mismo email. Sin él (o si Microsoft no lo garantiza), la cuenta se crea pero hay que confirmar el email con el enlace que enviamos antes de entrar. Así evitamos que el admin de otro tenant ponga tu email en su usuario y entre en tu cuenta (ataque *nOAuth*).

Solo se piden los scopes `openid profile email`: la app no accede a Microsoft Graph ni guarda refresh tokens. Quien entra con Microsoft no tiene contraseña; puede crearla desde su perfil con un enlace por email.

## Scripts

| Comando | Descripción |
|---|---|
| `pnpm dev` | Web y API en modo desarrollo |
| `pnpm typecheck` | Comprobación de tipos en todo el monorepo |
| `pnpm lint` | ESLint (web) y comprobación de tipos (api y shared) |
| `pnpm test` | Tests unitarios (precios, reglas de progreso) |
| `pnpm --filter @academia/api test:integration` | Tests de la API contra una base `academia_test` en el Postgres de Docker |
| `pnpm db:generate` | Genera una migración tras cambiar el esquema de Drizzle |
| `pnpm db:migrate` / `pnpm db:seed` | Aplica migraciones / carga los datos de demostración |
| `pnpm stream:setup` | Configura la signing key (y el webhook) de Cloudflare Stream |

## Decisiones de diseño

- **El servidor decide el precio.** El carrito y el checkout usan la misma función (`priceCart` en `packages/shared`). El canje de un cupón se reserva de forma atómica al crear la orden y se libera si la sesión de Stripe expira o falla.
- **Los webhooks son idempotentes.** Se registra cada `event.id` y las matrículas se insertan con `ON CONFLICT`. Una sesión completada sin cobrar (pago asíncrono) no matricula hasta `async_payment_succeeded`.
- **El progreso no se puede falsificar llamando a la API.** Un capítulo solo se completa al llegar al 90 % y si ha pasado al menos la mitad de su duración en tiempo real.
- **El rol no se puede auto-asignar.** `role`, `headline` y `bio` son campos de Better Auth con `input: false`.
- **No nos fiamos del email de Microsoft.** La cuenta de Microsoft se identifica por su `oid` y su email solo cuenta como verificado con el claim `xms_edov`.
- **Las respuestas públicas tienen columnas explícitas.** Nunca exponen uids de Stream, emails ni contenido oculto.

## Antes de producción

- Enruta `/api` con el proxy de delante (Caddy, Cloudflare, etc.) en lugar de los `rewrites` de Next. Así se conserva la IP real (el rate limit de Better Auth la usa) y se evita el límite de tiempo del proxy de Next.
- Adapta los textos de términos, privacidad y reembolsos a tu negocio y a la legislación que te aplique.
- Valora Stripe Tax si vendes en la UE.
- Configura reintentos para los emails, monitorización de errores y backups de la base de datos.
