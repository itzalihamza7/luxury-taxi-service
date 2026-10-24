# SignatureMile

A booking platform for a private chauffeur service in Madrid, in English and Spanish.

Customers price a journey, compare every vehicle at a fixed fare and book in a couple of minutes,
as a guest or with an account. The business runs everything from its own admin panel: bookings
(including those taken by phone or WhatsApp), the fleet and its rates, the website's content and
the company's contact details.

| Part | Technology | Folder |
| --- | --- | --- |
| Website | Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4 | [`frontend/`](frontend/) |
| API | Node.js 24, Express 5, Drizzle ORM, Zod | [`backend/`](backend/) |
| Database | PostgreSQL 17 | — |
| Environments | DDEV for development, Docker Compose for production | [`.ddev/`](.ddev/), [`docker-compose.yml`](docker-compose.yml) |

## Features

**Website**

- A one-page home that opens with a film of the car arriving, played by the scroll, followed by the
  services, the car and a booking request sent through WhatsApp.
- Instant fixed-price quotes for one-way, return, hourly, city-to-city and airport rides, with
  airport, station and address suggestions.
- A five-step booking flow that keeps the customer's progress on the device, prefills details for
  signed-in customers and handles an expired price without losing the booking.
- Booking tracking and cancellation with the reference and the email address or phone number.
- Customer accounts with their bookings and profile, an account menu in the header, and password
  reset by email (a one-time link valid for an hour).
- Service, fleet, route, event and journal pages, all edited from the admin panel.
- Optional online payment through PayPal Checkout.
- Search-friendly: server-rendered pages, `hreflang` alternates, canonical links, structured data,
  sitemap and link previews.

**Admin panel** (`/admin`)

| Page | Purpose |
| --- | --- |
| Overview | Pending confirmations, the next rides and the day's numbers |
| Bookings | Search and filter, confirm, start and complete rides, record payments, cancel |
| New booking | Enter a ride for a customer who phoned or wrote, with an agreed price and a ready-to-send WhatsApp confirmation |
| Messages | Contact-form messages |
| Users | Search, edit and delete accounts; assign roles (customer, admin, super admin) |
| WhatsApp clicks | Who opened WhatsApp from the website: approximate location, device, browser and page |
| Fleet | Vehicles, capacities, rates, photos, display order and visibility |
| Content | Services, routes, events, journal articles, questions, reviews and legal pages, in both languages |
| Business details | Phone, WhatsApp, email, social profiles, company details and booking options |

## Architecture

```text
Browser ──► Next.js (frontend:3000) ──/api/*──► Express API (backend:4000) ──► PostgreSQL
               │  server-rendered pages              │  quotes, bookings, accounts,
               │  image optimisation                  │  content, media, admin
               └─ gateway: the browser never talks to the API directly
```

- **One origin.** The website forwards `/api/*` to the API, so cookies stay first-party and the
  API and database are never exposed to the internet.
- **Rendering.** Pages are prerendered as static shells and stream their data-driven parts. Data
  read from the API is cached for a few minutes and refreshed immediately after an edit in the
  admin panel.
- **Prices are computed on the server.** A booking is always made from a stored *quote*: the API
  works out the distance, prices every vehicle (`base fare + per km`, never below the minimum;
  hourly hire is `hours × rate`; a return is two journeys) and keeps the quote for 30 minutes. The
  browser never sends a price.
- **Distances.** Journeys between central Madrid and the airport or a listed city use measured road
  distances; other journeys are estimated from the straight-line distance. Setting `ROUTER_URL` to
  an [OSRM](https://project-osrm.org)-compatible server gives exact door-to-door distances.
- **Addresses.** A built-in catalogue of airports, stations, venues and cities is combined with
  street addresses from a Photon-compatible geocoder (OpenStreetMap data).
- **Content in the database.** Pages are stored as typed, validated JSON per collection, so the
  admin panel needs no developer for day-to-day changes. Uploaded photos are resized in the
  browser, stored in PostgreSQL and served immutably, so one database backup holds everything.
- **Accounts and security.** scrypt password hashing, HttpOnly session cookies, role-based access
  to the admin API (only a super admin can appoint or change a super admin; role changes, email
  changes and deletions require the acting admin's password, and the last super admin cannot be
  removed), rate limits on sensitive endpoints, input validation with stable error codes
  that the website translates.
- **Phone bookings and accounts.** A booking entered by the team joins the customer's account when
  they sign up with the same email address or phone number. This is a setting in *Business
  details*.
- **Languages.** Every page exists under `/en` and `/es`; the bare domain redirects to the
  visitor's language. Interface text lives in `frontend/src/i18n/messages/`, content in the database.

## Home page

The home page ([`frontend/src/components/landing/`](frontend/src/components/landing/)) is one
scrolling page. It opens with a ten-second film of the car arriving, played by the scroll rather
than by time, and continues with the services, the car, a booking request that opens WhatsApp with
the details filled in, and the contact details from *Business details*.

- **The film.** It is downloaded in full behind a progress loader and played from memory, so every
  seek is instant; phones get a 720p version. Every frame is a keyframe, so any moment can be shown
  without decoding the frames before it.
- **One frame loop.** A single `requestAnimationFrame` loop advances the smooth scroll
  ([Lenis](https://github.com/darkroomengineering/lenis)), eases the film towards the scroll
  position and fades the text in and out. These values are written straight to the DOM, so
  scrolling does not re-render React components.
- **Less motion.** Visitors whose system asks for reduced motion get a still picture, native
  scrolling and no film download.
- **Fonts and policy.** Typefaces are self-hosted from `frontend/src/fonts/` (SIL Open Font
  License), so pages make no requests to a font service. The Content Security Policy allows the
  in-memory film (`media-src 'self' blob:` in [`frontend/next.config.ts`](frontend/next.config.ts)).

To use another clip (1920×1080, 24 fps, about ten seconds), encode it into `frontend/public/video/`
under the same names:

```bash
cd frontend/public/video
ffmpeg -i clip.mp4 -an -c:v libx264 -preset slow -tune film -crf 28 -pix_fmt yuv420p \
  -profile:v high -g 1 -keyint_min 1 -sc_threshold 0 -r 24 -movflags +faststart maybach-hero.mp4
ffmpeg -i clip.mp4 -an -vf scale=1280:720:flags=lanczos -c:v libx264 -preset slow -tune film \
  -crf 28 -pix_fmt yuv420p -profile:v high -g 1 -keyint_min 1 -sc_threshold 0 -r 24 \
  -movflags +faststart maybach-hero-mobile.mp4
ffmpeg -i clip.mp4 -frames:v 1 -q:v 6 maybach-poster.jpg            # first frame, until the film plays
ffmpeg -ss 9.4 -i clip.mp4 -frames:v 1 -q:v 3 maybach-interior.jpg  # closing still: reduced motion, the car
```

`-g 1` makes every frame a keyframe and `-crf 28` keeps the desktop film at about 10 MB. The text
appears at fixed points of the scroll (the `fade(...)` calls in
[`Drive.tsx`](frontend/src/components/landing/Drive.tsx)), so a clip with different timing needs
those points moved. Browsers keep files under `/video/` for a week: returning visitors can see the
previous film until then, unless the new files get new names.

## Getting started

Requirements: [DDEV](https://ddev.com) and Docker.

```bash
ddev start
```

This starts PostgreSQL, installs dependencies, applies migrations, loads the starting data and runs
both apps with hot reload.

- Website: <https://luxury-taxi-service.ddev.site>
- Admin panel: <https://luxury-taxi-service.ddev.site/en/admin>, with the development account
  `admin@signaturemile.com` / `admin-dev-password` (set in [`.ddev/config.yaml`](.ddev/config.yaml))

```bash
ddev logs -f                                          # output of both apps
ddev psql                                             # SQL prompt on the development database
ddev mailpit                                          # emails the site sent (caught locally)
ddev exec -d /var/www/html/backend npm test           # API test suite (separate test database)
ddev exec -d /var/www/html/backend npm run typecheck
ddev exec -d /var/www/html/frontend npm run lint
ddev exec -d /var/www/html/frontend npm run typecheck
ddev exec -d /var/www/html/frontend npm run build     # production build
```

Install packages inside the container so platform-specific binaries match:
`ddev exec -d /var/www/html/frontend npm install <package>`. The website's build output stays in
the container and is excluded from file sync ([`.ddev/mutagen/mutagen.yml`](.ddev/mutagen/mutagen.yml)).

## Production

On a server, [`deploy/setup-server.sh`](deploy/setup-server.sh) installs Docker and a swap file on
a fresh Ubuntu host. [`docker-compose.prod.yml`](docker-compose.prod.yml) adds Caddy in front of the
website, with automatic HTTPS certificates and a `www` redirect:

```bash
cp .env.example .env          # set POSTGRES_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD, SITE_URL, DOMAIN
                              # and TRUST_PROXY=2
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

The domain's A record must point at the server, with ports 80 and 443 open. On start, the API
container applies pending migrations and adds any missing starting data, so a release is `git pull`
followed by the same command. Without the second file the stack runs plain HTTP on port 3000.

- `SITE_URL` is read at build time for canonical links, the sitemap and payment return links.
- Pages are streamed; proxies should not buffer responses (`X-Accel-Buffering: no` is sent).
- Back up the `db-data` volume: it holds bookings, accounts, content and uploaded photos.

## Configuration

Development values are in `.ddev/config.yaml`; production values come from `.env`.

| Variable | Service | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | backend | PostgreSQL connection |
| `SITE_URL` | frontend | Public address of the site (build time) |
| `APP_URL` | backend | Public address, for payment return links |
| `API_URL` | frontend | Internal address of the API |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | backend | Administrator account, created on start if missing |
| `TRUST_PROXY` | backend | Number of proxies in front of the API (default 1) |
| `GEOCODER_URL` | backend | Address search; empty disables it |
| `ROUTER_URL` | backend | Road distances; empty uses the built-in estimate |
| `GEOIP_DB` | backend | City-level IP geolocation database (MMDB); the Docker image downloads DB-IP Lite at build time |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_API_BASE` | backend | Online payment, enabled when both credentials are set |
| `MAIL_TRANSPORT`, `MAIL_FROM` | backend | How emails are sent: `graph` (Microsoft 365), `smtp` or `log` (not sent) |
| `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET` | backend | Microsoft Entra app allowed to send as `MAIL_FROM` (`Mail.Send` application permission) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | backend | SMTP server, when `MAIL_TRANSPORT=smtp` |
| `MIN_LEAD_MINUTES`, `FREE_CANCEL_HOURS`, `QUOTE_TTL_MINUTES` | backend | Booking rules (defaults 120, 24, 30) |

## Project structure

```text
backend/
  src/app.ts             Express app: middleware and routes
  src/config.ts          Environment and business rules
  src/db/                Schema, migrations runner, seed and starting data
  src/lib/               Pricing, distances, validation, passwords, references
  src/modules/           auth, vehicles, places, quotes, bookings, payments,
                         content, media, contact, admin
  src/test/              API tests against a real PostgreSQL database
  drizzle/               SQL migrations

frontend/
  src/app/[locale]/      (landing)/ home page, (site)/ other public pages, admin/ admin panel
  src/app/api/           Gateway to the API
  src/components/        Home page, booking flow, account, admin panel, layout, UI kit
  src/i18n/              Locale routing and interface text
  src/lib/               API client, server data loaders, formatting, SEO
  public/images/         Photography (sources in CREDITS.md)
  public/video/          Home page film, its first frame and closing still
```

## Database changes

1. Edit [`backend/src/db/schema.ts`](backend/src/db/schema.ts).
2. Generate the migration: `ddev exec -d /var/www/html/backend npm run db:generate`.
3. Review and commit the new file in `backend/drizzle/`. It is applied on the next start, in
   development and in production.
