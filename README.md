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

- Instant fixed-price quotes for one-way, return, hourly, city-to-city and airport rides, with
  airport, station and address suggestions.
- A five-step booking flow that keeps the customer's progress on the device, prefills details for
  signed-in customers and handles an expired price without losing the booking.
- Booking tracking and cancellation with the reference and the email address or phone number.
- Customer accounts with their bookings and profile, and an account menu in the header.
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
  src/app/[locale]/      (site)/ public website, admin/ admin panel
  src/app/api/           Gateway to the API
  src/components/        Booking flow, account, admin panel, layout, UI kit
  src/i18n/              Locale routing and interface text
  src/lib/               API client, server data loaders, formatting, SEO
  public/images/         Photography (sources in CREDITS.md)
```

## Database changes

1. Edit [`backend/src/db/schema.ts`](backend/src/db/schema.ts).
2. Generate the migration: `ddev exec -d /var/www/html/backend npm run db:generate`.
3. Review and commit the new file in `backend/drizzle/`. It is applied on the next start, in
   development and in production.
