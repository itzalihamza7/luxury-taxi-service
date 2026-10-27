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
  airport, station and address suggestions: a fixed price inside the M-30, plus each km beyond it
  (see [Prices and the booking flow](#prices-and-the-booking-flow)).
- A five-step booking flow that keeps the customer's progress on the device, prefills details for
  signed-in customers and handles an expired price without losing the booking.
- A page for each booking, opened with its reference and the guest code from the booking email
  (or the customer's account): status, payment links, the history of every change, cancellation.
- Customer accounts with their bookings and profile, an account menu in the header, and password
  reset by email (a one-time link valid for an hour).
- Service, fleet, route, event and journal pages, all edited from the admin panel.
- A home page that opens on the Mercedes-Maybach in 3D, against the city's lights at night: the
  camera walks around the car as the visitor scrolls, a chapter bar shows the way, and the instant
  price follows.
- An Experience page (`/experience`): a film of the car's arrival, played by the scroll, and what a
  journey includes, moment by moment.
- Optional online payment through PayPal Checkout.
- Search-friendly: server-rendered pages, `hreflang` alternates, canonical links, structured data,
  sitemap and link previews.

**Admin panel** (`/admin`)

| Page | Purpose |
| --- | --- |
| Overview | Pending confirmations, the next rides and the day's numbers |
| Bookings | Search and filter; edit a booking with a note the customer sees; ask for an advance or the full amount through a payment link (email, and WhatsApp with one tap); record payments; confirm, start, complete and cancel |
| New booking | Enter a ride for a customer who phoned or wrote, with an agreed price and a ready-to-send WhatsApp confirmation |
| Messages | Contact-form messages |
| Users | Search, edit and delete accounts; assign roles (customer, admin, super admin) |
| WhatsApp clicks | Who opened WhatsApp from the website: approximate location, device, browser and page |
| Fleet | Vehicles, capacities, rates, photos, display order and visibility |
| Content | Services, routes, events, journal articles, questions, reviews and legal pages, in both languages |
| Business details | Phone, WhatsApp, email, social profiles, company details, booking options and AI phone agent keys |

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

## Experience page

The Experience page ([`frontend/src/components/experience/`](frontend/src/components/experience/))
opens with a ten-second film of the car arriving, played by the scroll rather than by time, with
three moments of text over it.

- **The film.** It comes in two versions, each downloaded in full and played from memory, so seeks
  never wait for the network. A light 640×360 version (0.5 MB) loads first. The full-quality 1080p
  version (5.8 MB, on phones too) follows at low priority and fades in at the same frame; the light
  one is then released. The film's first frame is in the page as a sharp still, so the page never
  waits for the film.
- **Scrubbing.** One `requestAnimationFrame` loop advances the smooth scroll
  ([Lenis](https://github.com/darkroomengineering/lenis)), eases the film towards the scroll
  position and asks for a new frame only when the frame changes, chaining the next seek on the
  previous one's `seeked`. The words fade with opacity and transforms only, so nothing over the
  film has to be repainted while it plays. Values are written to the DOM, not React state.
- **Less motion.** Visitors who prefer reduced motion get a still picture, native scrolling and no
  film download.
- **Type.** The page sets its words in Cormorant Garamond and Manrope, bundled in
  `frontend/src/fonts/` (SIL Open Font License); the rest of the site keeps its own.
- **Policy and caching.** The Content Security Policy allows the in-memory film (`media-src 'self'
  blob:` in [`frontend/next.config.ts`](frontend/next.config.ts)), and browsers keep files under
  `/video/` for a week.

To use another clip (1920×1080, 24 fps, about ten seconds), encode it into `frontend/public/video/`
under the same names:

```bash
cd frontend/public/video
# Full quality.
ffmpeg -i clip.mp4 -an -c:v libx264 -preset slow -tune film -crf 28 -pix_fmt yuv420p \
  -profile:v high -g 8 -keyint_min 8 -sc_threshold 0 -bf 0 -r 24 -movflags +faststart maybach-hd.mp4
# Light version, shown only until the full one has arrived: denoised and scaled down.
ffmpeg -i clip.mp4 -an -vf hqdn3d=4:3:6:4.5,scale=640:360:flags=lanczos -c:v libx264 -preset slow \
  -tune film -crf 32 -pix_fmt yuv420p -profile:v high -g 24 -keyint_min 24 -sc_threshold 0 -bf 0 \
  -r 24 -movflags +faststart maybach-preview.mp4
ffmpeg -i clip.mp4 -frames:v 1 -q:v 6 maybach-poster.jpg            # first frame, until the film moves
ffmpeg -ss 9.4 -i clip.mp4 -frames:v 1 -q:v 3 maybach-interior.jpg  # closing still: reduced motion, the car
```

`-g 8` puts a keyframe every eight frames, so a seek decodes at most seven frames before the one it
shows, well within a screen refresh; compared with a keyframe on every frame, the file is about half
the size at a higher quality. The text appears at fixed points of the scroll (the `fade(...)` calls
in [`ExperienceFilm.tsx`](frontend/src/components/experience/ExperienceFilm.tsx)), so a clip with
different timing needs those points moved. Returning visitors can see the previous film for up to a
week, unless the new files get new names.

## Home page 3D showroom

The home page opens on the fleet's Mercedes-Maybach at night, against the out-of-focus lights of
the city, drawn with [three.js](https://threejs.org) through React Three Fiber and drei
([`frontend/src/components/showroom/`](frontend/src/components/showroom/)). The section is pinned
while the visitor scrolls: the camera walks from the front three-quarter view to the side and the
rear, three short blocks of words take turns (one is always on screen), and the price widget
follows. A chapter bar at the bottom names the three parts, shows how far along the visitor is,
jumps to any of them and offers a way straight to the prices.

- **Framing.** The page measures the room each block of words leaves for the car (beside it on a
  landscape screen, below it on a portrait one, clear of the header and the chapter bar), and the
  camera stands back until the car's outline fits that room, using a shifted lens rather than
  turning. The car stays whole and beside or below the words, from a phone held sideways to a wide
  monitor.
- **Loading.** The opening frame is a still (`showroom-night.jpg`, 3:2, and `showroom-mobile.jpg`,
  about 1:2), cropped to the screen, so the page shows at once. three.js and the model load only on
  this page, after the page itself, and the 3D view fades in when it is ready. Visitors who prefer
  reduced motion, devices without WebGL and data-saver mode keep the still. When the scene changes,
  render new stills from it and give them new names, so no cache keeps showing the old ones.
- **Cost.** The model is 0.74 MB, its decoder 0.25 MB (both cached for a week). Nothing is drawn
  while the section is off screen, the resolution drops on a struggling GPU, and phones get a
  lighter scene.
- **Night.** Lighting comes from soft boxes and street lamps reflected in the paint (no image
  files); one light sweeps along the car on larger screens. From 1024 px the city is a few hundred
  soft discs of light on a ring behind the car, mirrored in the wet floor; on phones and tablets they
  read as coloured dots around the words, so there a warm glow that follows the camera sets the
  night alone. The floor and sky are drawn in exact colours, outside the tone mapping the car gets,
  so they meet without a line.
- **The model** is "Mercedes-Benz Maybach 2022" by Mpgs Studios, under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): the credit is on the site's Credits page,
  linked from every footer, and listed in `frontend/public/images/CREDITS.md`. It was reduced from 2.4 million to 185,000
  triangles and compressed with Draco:

```bash
npx @gltf-transform/cli optimize scene.gltf frontend/public/models/maybach.glb \
  --compress draco --simplify-error 0.001 --palette false --instance false
```

  The Draco decoder in `frontend/public/draco/` is copied from
  `three/examples/jsm/libs/draco/gltf/`; the Content Security Policy allows it to run
  (`'wasm-unsafe-eval'` and `worker-src blob:` in [`frontend/next.config.ts`](frontend/next.config.ts)).

## AI phone agent

An AI phone agent (for example [Vesper](https://github.com/itzalihamza7/Voice-agent-for-businesses))
can quote, book, find and cancel rides through the same public API the website uses. With a key it
gets a little more:

- **Keys** are created and revoked under Business details. Only a SHA-256 hash and the first
  characters are stored; the key is shown once. The agent sends it as
  `Authorization: Bearer smk_…`. A wrong or revoked key is refused (401); requests without a key
  work exactly as before.
- **Rate limits** for requests with a key are counted per key, at 20 times a visitor's limit, since
  one key serves many callers.
- **`GET /api/agent/bookings?phone=`** (key only) lists the upcoming bookings made with a phone
  number. The agent fills the number in from the line the call comes from, so a caller only hears
  about their own rides.
- **Bookings** the agent makes are marked `agent` and show an "AI agent" badge in the admin panel.

## Website chat

Every public page carries a chat with the same kind of agent, from
[Vesper](https://github.com/itzalihamza7/Voice-agent-for-businesses) (business "SignatureMile"
at https://13-61-49-4.sslip.io). It answers from 25 of the site's pages, quotes and books rides
through `/api`, and can pass a visitor on to WhatsApp or a phone call.

- **On the page.** [`WebsiteChat`](frontend/src/components/layout/WebsiteChat.tsx) loads Vesper's
  script as soon as the page works. Its round button shows from 1024 px; below that it would cover
  the bar of buttons at the bottom, which gets a Chat button instead. The address and the chat's id are
  in [`frontend/src/lib/website-chat.ts`](frontend/src/lib/website-chat.ts); the Content Security
  Policy and the microphone permission (for voice) allow that address only.
- **Bookings.** Vesper lets the chat change data (a quote, a booking) once the site has proven it
  is the business's: the token in `frontend/public/.well-known/vesper-verify.txt` does that. An
  agent key from Business details can also be added to the connection in Vesper, so the chat's
  bookings get the "AI agent" badge and their own rate limits.
- **Settings** (which sites may show it, colour, WhatsApp and phone hand-off, a daily AI cost cap
  of $5) are in Vesper under Agents → the agent → Website chat.

## Prices and the booking flow

**Prices** come from each vehicle's three rates (Fleet in the console), from the price list of
26 October 2026:

- **Transfers** inside the M-30 ring road, or between the airport (T1–T4S) and the M-30, cost the
  vehicle's fixed price. Each road kilometre beyond the M-30 adds its price per km. Without a
  routing server the road is not known, so the share of the straight line outside the M-30 (and
  the airport) is applied to the road distance. The M-30's outline is in
  [`backend/src/lib/zone.ts`](backend/src/lib/zone.ts), traced from OpenStreetMap.
- **Hourly hire** is the hours at the hourly rate. A vehicle without one (the Sprinter) can still
  be booked: the price is "on request", and the team sets it afterwards.
- **Return trips** cost two transfers.
- **Shown just under the round figure**: each price is quoted and charged 10–90 cents below the
  whole euro (€89.30 rather than €90), picked from the vehicle and the journey, so the same trip
  always gets the same price. The vehicle step shows what the price is for: the ride type, road
  distance and drive time (each way for a return), or the hours.

**A booking** goes through these steps, each with an email to the customer in their language:

1. **Received.** The email has the booking, a link to its page and a **guest code**. A guest opens
   the page with the reference and that code; a booking in an account opens after logging in.
2. **Payment requested.** In Bookings the team asks for an advance, the full amount or the balance,
   pasting a payment link from their provider. The email carries the booking's page and guest code,
   not the link, and says what remains after an advance; the console offers a WhatsApp message with
   the link itself, with one tap. On the booking's page the link is a "Pay" button.
3. **Proof.** Having paid, the customer taps "Payment done" on the booking's page, which only works
   with a screenshot or PDF of the confirmation attached (up to 8 MB). The console marks the booking
   "Proof to check" and opens the file for the team.
4. **Paid.** The team checks the proof and marks the payment received; the booking is partly paid or
   paid.
5. **Confirmed.** The team confirms the booking and the customer is told.

The team can **edit** a booking at any step (date and time, places, vehicle, price, passengers,
contact). A note is required: the customer gets the changes and the note by email, and the
booking's page keeps the whole history, with who made each change. Customers cannot change a
booking; they can cancel it free of charge up to 24 hours before pickup.

**Accounts.** A customer confirms their email address with a six-digit code sent at sign-up; then
every booking made with that address, as a guest too, appears in their account. A booking made
with another email or phone number joins with its reference and guest code. Neither happens before
the proof, so nobody can read someone else's bookings by signing up with their details.

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
- After a release that adds pages, `bash deploy/indexnow.sh` sends every page in the live sitemap to
  Bing and the other IndexNow search engines. Google takes the sitemap through Search Console.

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
  src/app/[locale]/      (site)/ public website, admin/ admin panel
  src/app/api/           Gateway to the API
  src/components/        Booking flow, account, admin panel, 3D showroom, Experience page, layout, UI kit
  src/i18n/              Locale routing and interface text
  src/lib/               API client, server data loaders, formatting, SEO
  public/images/         Photography (sources in CREDITS.md)
  public/video/          The Experience page's film (light and full quality) and two stills from it
  public/models/         The 3D showroom's car (Draco-compressed glTF); its decoder is in public/draco/
```

## Database changes

1. Edit [`backend/src/db/schema.ts`](backend/src/db/schema.ts).
2. Generate the migration: `ddev exec -d /var/www/html/backend npm run db:generate`.
3. Review and commit the new file in `backend/drizzle/`. It is applied on the next start, in
   development and in production.
