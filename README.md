# Ram Hair Studio — Turnero online

Sistema de turnos para **Ram Hair Studio**: reservas online, gestión de turnos por link, fidelidad con tarjeta de sellos, planes de exclusividad y panel de administración.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · MongoDB (Mongoose) · Vercel.

## Qué incluye

**Sitio público**
- `/` — inicio con logo, servicios, precios y horarios.
- `/reservar` — reserva paso a paso: teléfono → servicio → barbero → día y hora → confirmación.
- `/turno/[token]` — ver, reprogramar o cancelar un turno desde el link que recibe el cliente.
- `/mis-turnos` — buscar turnos por teléfono.
- `/fidelidad` — tarjeta de sellos (descuentos en el 2°, 4°, 6° corte y 50% + regalo en el 8°), canje de regalos y planes mensuales.

**Panel `/admin`** (protegido con contraseña)
- Agenda diaria por barbero, turnos manuales, marcar asistió / no vino / cancelar / reprogramar.
- Listado de turnos con filtros y exportación CSV.
- Clientes: historial, sellos, regalos y membresías.
- Barberos con horarios semanales, servicios, sucursales, bloqueos (vacaciones/feriados).
- Fidelidad (reglas, regalos, planes) y configuración general.

**Seguridad y robustez**
- Imposible el doble turno: un índice único en MongoDB bloquea cada franja de 5 minutos por barbero, incluso con reservas simultáneas.
- Sesión de admin con cookie `httpOnly` firmada (JWT); la API de admin está protegida en el middleware y en cada ruta.
- Límite de pedidos por IP en los endpoints públicos (guardado en MongoDB, funciona en serverless).
- Ningún secreto se envía al navegador.

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `MONGODB_URI` | Cadena de conexión de MongoDB Atlas |
| `MONGODB_DB` | Nombre de la base (ej. `ram-hair-studio`) |
| `ADMIN_PASSWORD` | Contraseña del panel `/admin` |
| `AUTH_SECRET` | String aleatorio de 32+ caracteres para firmar la sesión |
| `NEXT_PUBLIC_SITE_URL` | URL pública (ej. `https://ram-barber.vercel.app`) |

Ver `.env.example`.

## Deploy en Vercel (paso a paso)

1. **MongoDB Atlas**
   - En *Database Access*, creá un usuario con contraseña.
   - En *Network Access*, agregá `0.0.0.0/0` (Vercel usa IPs dinámicas).
   - En *Connect → Drivers*, copiá la URI y reemplazá `<db_username>` y `<db_password>`.
2. **Vercel**: *Add New → Project*, importá el repo `Ram-barber` de GitHub. Framework: Next.js (se detecta solo).
3. En *Settings → Environment Variables*, cargá las 5 variables de la tabla.
4. Hacé clic en **Deploy**.
5. Entrá a `https://TU-DOMINIO/admin`, iniciá sesión y andá a **Configuración → Datos iniciales**. Eso carga la sucursal, los servicios con precios y el barbero con sus horarios. Después ajustá lo que quieras desde el panel.

> Las funciones corren en São Paulo (`gru1`, ver `vercel.json`). Para menor latencia, creá el cluster de Atlas en la región `sa-east-1` (São Paulo).

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completá los valores
npm run seed                 # opcional: carga los datos iniciales
npm run dev                  # http://localhost:3000
```

## Estructura

```
src/
  app/                 páginas y API (app router)
    api/public/*       endpoints públicos (reservas, disponibilidad, fidelidad)
    api/admin/*        endpoints del panel (requieren sesión)
    admin/             panel de administración
  components/          UI compartida, ornamentos (rosas, halo, Virgen), panel
  lib/                 base de datos, modelos, disponibilidad, reservas, fidelidad, auth
scripts/seed.ts        carga inicial de datos
```
