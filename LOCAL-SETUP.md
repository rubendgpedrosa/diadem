# Diadem local test installation

URL: http://192.168.1.253:1081

Installed in `/opt/diadem` using the upstream Docker image and Docker Compose.
The map starts in Leiria. Login is disabled for local testing.

Configuration: `/opt/diadem/config/config.toml`
Database secrets: `/opt/diadem/.env`

Diadem has a separate MariaDB container and persistent volume for its internal
data. Scanner SQL access uses the SELECT-only `diadem_reader` account. Live
Pokemon come from the existing Golbat HTTP API. Gyms, Pokestops and stations use
SQL because the installed Golbat does not expose the newer `/api/status` endpoint.
Scout and coverage tools are disabled; Dragonite and Koji are not configured.

Both containers restart automatically unless explicitly stopped.

Run these commands on the server:

```sh
cd /opt/diadem
docker compose ps
docker compose logs --tail 100 diadem
docker compose restart diadem
```

To stop the test installation while retaining its data:

```sh
cd /opt/diadem
docker compose down
```

Verified HTTP 200 for the map and live API queries around Leiria, including
72 gyms and over 2,000 Pokemon at the time of testing.


## PoGoLeiria branding

The local image `diadem:pogoleiria` includes the existing community logo as its
favicon and loading mark. The custom CSS in `config/custom.css` adapts the
PoGoLeiria ember/gold palette for light and dark modes. Map name and description
remain runtime settings in `config/config.toml`.

Rebuild after changing CSS, the loader HTML, or static assets:

```sh
cd /opt/diadem
docker compose build diadem
docker compose up -d --no-deps diadem
```

Original configuration and assets are preserved in `branding-backup/`.


## Visible logo and initial preferences

`src/components/custom/MapBrand.svelte` displays the logo and wordmark beside the
weather display in both mobile and desktop map layouts. The asset is
`static/pogoleiria-logo.svg`; the map route imports the component.

Fresh visitors start with dark theme and map, Shuffle icons, L icon size (1.25),
and an enabled all-Pokemon filter. Theme, size and Pokemon defaults are in
`src/lib/services/userSettings.svelte.ts`; the first-paint theme is in
`src/app.html`; Shuffle defaults are in `config/config.toml`.
Existing saved preferences take precedence. Use a private window to verify the
fresh-visitor defaults without clearing saved filters or settings.

Default background updated to Voyager; the interface remains dark. Language configuration is unchanged (English base locale). Existing saved preferences still take precedence.
