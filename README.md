# Luxury Taxi Service

A bilingual (English / Spanish) website for a chauffeur company, with online booking.

Visitors enter a journey, see a fixed price for every vehicle, and book — as a guest or with an
account. They can then track or cancel the booking with their reference.

The operator runs everything from a console at `/admin`: bookings, the fleet (prices, photos, the
order vehicles are shown in), the website's content and the business's contact details. No
developer is needed for day-to-day changes.

| Part | Technology | Folder |
| --- | --- | --- |
| Website | Next.js 16, React 19, Tailwind CSS 4 | [`frontend/`](frontend/) |
| API | Node.js 24, Express 5, Drizzle ORM | [`backend/`](backend/) |
| Database | PostgreSQL 17 | — |


## Start developing (DDEV)

You need [DDEV](https://ddev.com) and Docker. Then:

```bash
ddev start
```

That is the only command. It starts PostgreSQL, installs dependencies, creates the database tables,
adds the starting fleet, and runs both apps with hot reload. The first start takes a few minutes;
it prints `Ready` when the site can be opened:

- Website: <https://luxury-taxi-service.ddev.site>
- Operations console: <https://luxury-taxi-service.ddev.site/en/admin> —
  sign in with `admin@alteza.example` / `admin-dev-password` (development only, set in
  [`.ddev/config.yaml`](.ddev/config.yaml))

If the browser warns about the certificate, run `mkcert -install` once and restart the browser.

Useful commands:

```bash
ddev logs -f                                             # output of both apps
ddev psql                                                # SQL prompt on the development database
ddev exec -d /var/www/html/backend npm test              # API tests (use their own database)
ddev exec -d /var/www/html/backend npm run typecheck
ddev exec -d /var/www/html/frontend npm run lint
ddev exec -d /var/www/html/frontend npm run typecheck
ddev exec -d /var/www/html/frontend npm run build        # production build check
ddev restart                                             # restart everything
ddev stop
```

Install packages inside the container, not on your machine, so the right binaries are installed:
`ddev exec -d /var/www/html/frontend npm install <package>`.

## Run the production build (Docker)

The same images are meant for deployment.

```bash
cp .env.example .env        # then set POSTGRES_PASSWORD, ADMIN_EMAIL and ADMIN_PASSWORD
docker compose up --build -d
```

The site is then on <http://localhost:3000>. The API and the database are only reachable inside the
Docker network; the browser talks to the API through the website at `/api`.

```bash
docker compose logs -f          # follow the logs
docker compose down             # stop (data is kept in the `db-data` volume)
docker compose down --volumes   # stop and delete the database
```

On start, the API container brings the database schema up to date and adds any missing starting
data (the fleet, and the admin account from `.env`), so deploying a new version is
`docker compose up --build -d`.

### Deploying

- Put a reverse proxy that terminates HTTPS (Caddy, nginx, Traefik or a load balancer) in front of
  the `frontend` service, and set `TRUST_PROXY=2` so rate limits see the visitor's address.
- Set `SITE_URL` to the real address **before building**: it is written into canonical links, the
  sitemap and payment return links.
- If the proxy buffers responses, let it stream instead (the site sends `X-Accel-Buffering: no`
  for nginx); pages are delivered in parts.
- Back up the `db-data` volume. It holds everything: bookings, accounts, content and uploaded photos.

## Project layout

```text
.ddev/config.yaml        Development environment (env vars, the two app processes)
docker-compose.yml       Production-style stack: db, backend, frontend
.env.example             Settings for docker compose

backend/
  src/server.ts          Entry point
  src/app.ts             Routes and middleware
  src/config.ts          Environment variables and business limits
  src/db/schema.ts       Database tables        -> `npm run db:generate` writes drizzle/*.sql
  src/db/fleet.ts        Starting fleet and prices  (written once, to a new database)
  src/db/content/        Starting content           (written once, to a new database)
  src/lib/pricing.ts     Fare calculation
  src/lib/geo.ts         Distance: routing server, or the built-in estimate
  src/modules/           auth, vehicles, places, quotes, bookings, payments, content, media,
                         contact, admin
  src/test/              API tests against a real PostgreSQL database
  drizzle/               SQL migrations (committed)

frontend/
  src/app/[locale]/      Pages (`/en/...`, `/es/...`)
  src/app/api/           Gateway that forwards `/api/*` to the backend
  src/content/site.ts    The brand name, as built into the logo and page titles
  src/i18n/messages/     Interface text in both languages
  src/components/        UI: booking form, account, operations console, layout
  public/images/         Photographs that ship with the site (sources in CREDITS.md)
```

## How it works

**Prices.** A booking is always made from a *quote*. The API works out the distance, prices every
vehicle (`base fare + per km`, never below the vehicle's minimum; hourly hire is `hours × rate`; a
return is two journeys), rounds up to a whole euro and stores the quote for 30 minutes. The booking
takes its price from the stored quote, never from the browser. Rates live in the `vehicles` table.

**Distances.** Without a routing server, distances are estimated: journeys between central Madrid
and the airport or a listed city use measured road distances (accurate to a few percent); anything
else is estimated from the straight-line distance (about ±10%) and labelled "estimated" in the
booking form. For exact door-to-door distances set `ROUTER_URL` to an
[OSRM](https://project-osrm.org)-compatible server.

**Addresses.** Suggestions combine a built-in list of airports, stations, venues and cities
([`catalog.ts`](backend/src/modules/places/catalog.ts)) with street addresses from a
Photon-compatible geocoder (OpenStreetMap data). The default is the public Photon service, which is
fine for light use; run your own for a busy site.

**Accounts.** Booking never requires an account. Guests track or cancel a booking with its
reference **and** the email used to book. Accounts keep a profile and list bookings. Passwords are
hashed with scrypt; the session is an HttpOnly cookie.

**Bookings.** New bookings are `pending` until the operator confirms them in `/admin`, then
`confirmed → in_progress → completed` (or `cancelled`). Customers can cancel online until 24 hours
before pickup, and must book at least 2 hours ahead. Both limits are settings.

**Languages.** Every page exists under `/en` and `/es`. The bare address redirects to the visitor's
language. Interface text (buttons, labels, the fixed parts of pages) is in
`frontend/src/i18n/messages/`; everything else is content, edited in the console in both languages.

**The console.** At `/admin`, an operator manages:

| Tab | What it changes |
| --- | --- |
| Bookings, Messages | Confirm rides, record payments, read contact messages |
| Fleet | Vehicles: name, capacity, the four rates, photo, position, shown or hidden |
| Content | Services, routes, events, journal articles, questions, reviews, legal pages |
| Business details | Phone, WhatsApp, email, social profiles, company details |

A save shows on the website straight away. Lists and long texts are typed as plain text: one item
per line, an empty line between paragraphs, `## ` before a heading and `- ` before a bullet point.
Legal texts may contain `{companyName}`, `{taxId}`, `{address}`, `{registry}`, `{licence}`,
`{email}`, `{phone}` and `{brand}`, which are replaced with the saved business details.

**Photos.** Pictures uploaded in the console are made smaller in the browser, stored in the
database and served at `/api/media/…`, so a database backup contains them. The website resizes
every photo for the visitor's screen. A vehicle without a photo is shown as a line drawing.

**Starting data.** A new database is filled with the fleet and content in `backend/src/db/`. That
happens once: afterwards the console is where things change, and what an operator deletes does not
come back.

## Changing the database

1. Edit [`backend/src/db/schema.ts`](backend/src/db/schema.ts).
2. `ddev exec -d /var/www/html/backend npm run db:generate` — writes a new SQL file to `backend/drizzle/`.
3. Review and commit that file. It is applied on the next `ddev restart`, and on deployment.

## Settings

Development values are in `.ddev/config.yaml`; for Docker they come from `.env`.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | backend | PostgreSQL connection |
| `SITE_URL` | frontend | Public address of the site. **Read when the site is built.** |
| `APP_URL` | backend | Same address, for payment return links |
| `API_URL` | frontend | Where the website reaches the API (internal) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | backend | Operator account, created on start if missing |
| `TRUST_PROXY` | backend | Number of proxies in front of the API (default 1) |
| `GEOCODER_URL` | backend | Address search; empty disables it |
| `ROUTER_URL` | backend | Road distances; empty uses the estimate |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_API_BASE` | backend | Online payment; off unless both credentials are set |
| `MIN_LEAD_MINUTES`, `FREE_CANCEL_HOURS`, `QUOTE_TTL_MINUTES` | backend | Booking rules (defaults 120, 24, 30). The site's wording mentions "2 hours" and "24 hours": update the text too if you change them. |
