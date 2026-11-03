# pehlione.io – Portfolio (React + TypeScript + Vite)

Modernes, schnelles und barrierearmes persönliches Portfolio. Erstellt mit React, TypeScript, Vite, MUI und Tailwind. Enthält eine optimierte Foto‑Galerie, Zertifikate, Projekte, GitHub‑Repositories und ein Entwickler‑Profil.

## Highlights

- Optimierte Bilder mit Thumbnails (WebP) und Lazy Loading
- Foto‑Galerie mit Pagination und weichen Hover‑Effekten
- Overlay‑Spinner beim ersten Laden und optionale Loader pro Bild
- Zertifikate, Projekte, Repos, Entwickler‑Profil, CV‑Download
- Playwright E2E‑Tests (Chromium, Firefox, WebKit) + GitHub Actions CI
- Bereitstellbar auf GitHub Pages (unterstützt benutzerdefinierten `base`‑Pfad)

## Technologien

- React 19 + TypeScript + Vite
- MUI (Material UI) + Tailwind CSS
- Playwright für E2E‑Tests
- Sharp zur Thumbnail‑Erzeugung
- Optionaler Content‑Server (Express + Multer + JSON API)

## Projektstruktur

```
public/
  certificates/           # Zertifikatsbilder + CV‑PDF
  foto/                   # Foto‑Originale (und thumbs/)
  garten/                 # Garten‑Originale (und thumbs/)
src/
  components/
    OptimizedImage.tsx    # Lazy, async decode, base‑path‑sicher
    ImageWithLoader.tsx   # Overlay mit CircularProgress pro Bild
    PhotoGallery.tsx      # Grid mit Thumbs + Fallback auf Original
    Sections/             # CV, Hobbies, Projects, Repos, usw.
  page/Foto.tsx           # Galerie + Overlay‑Spinner beim Erstladen
  redux/photos.ts         # Generiert aus server/db.json
  constants/constants.ts  # Navigation, Beispieldaten
  App.tsx                 # Haupt‑App + Zustandsnavigation
server/
  server.js               # Optionaler Content‑Server mit Upload + JSON API (Port 3001)
scripts/
  gen-thumbs.mjs          # Erzeugt WebP‑Thumbnails
  generatePhotos.ts       # Build‑Zeit‑Daten aus server/db.json
e2e/
  App.spec.tsx            # Playwright End‑to‑End‑Tests
```

## Bildoptimierung

- Thumbnails werden mit `sharp` in `public/*/thumbs/*.webp` erzeugt.
- Die Galerie lädt zuerst Thumbnails; ein Klick öffnet das Original.
- Komponenten:
  - `OptimizedImage`: Lazy + `decoding="async"` + Base‑Path‑Handling
  - `ImageWithLoader`: Zeigt bis `onLoad` einen CircularProgress an

Thumbnails erzeugen (im Build automatisch enthalten):

```bash
npm run thumbs
# Optionen (PowerShell)
$env:THUMB_WIDTH=480; $env:THUMB_QUALITY=65; $env:THUMB_CONCURRENCY=2; npm run thumbs
```

## Skripte

- `dev`: Vite + Express‑Content‑Server starten
- `build`: Thumbs → Fotos generieren → Typecheck → Vite‑Build
- `preview`: Produktionsbuild lokal ansehen
- `lint`, `lint:fix`: ESLint ausführen
- `thumbs`: WebP‑Thumbnails mit `sharp` erzeugen
- `server`: Express‑Content‑Server starten
- `test:e2e`, `test:e2e:ui`, `test:e2e:headed`: Playwright‑Tests

## Entwicklung

Voraussetzungen: Node.js 22+

Installation & Start:

```bash
npm install
npm run dev
```

Die Galerie versucht, dynamische Inhalte von `http://localhost:3001/api/…` zu laden. Falls nicht verfügbar, wird auf die generierte, statische Datei `redux/photos.ts` zurückgefallen.

Optionaler Content‑Server mit Upload und geschützten Schreibzugriffen:

```bash
npm run server
```

Neue Inhalte werden über ein kurzes JWT geschützt. Benutzername und Passwort werden nur gegen `/auth/login` geprüft; Uploads und neue Einträge verwenden danach `Bearer`‑Token. Lege dazu eine `.env` im Projektwurzel an:

```bash
ADMIN_USERNAME=your-unique-admin-name
ADMIN_PASSWORD=your-long-random-password
JWT_SECRET=your-long-random-signing-secret
JWT_TTL_SECONDS=900
# optional
CLIENT_ORIGIN=http://localhost:5173
```

### Blogbeiträge lokal schreiben

Starte `npm run dev` und öffne `http://localhost:5173/login`. Melde dich mit
`ADMIN_USERNAME` und `ADMIN_PASSWORD` aus der lokalen `.env` an. Wähle im
Admin-Bereich den Tab **Blog**, gib Titel, Kurzbeschreibung und Markdown-Inhalt
ein und speichere den Beitrag. Die Datei entsteht unter `content/blog/`; der
Beitrag ist lokal unter `/blog/<slug>` sichtbar. Auf `/blog` erscheint zuerst
der neueste Beitrag; ältere Beiträge sind über `?page=2`, `?page=3` usw.
erreichbar. Überschriften (`##`, `###`),
Codeblöcke, Listen und Links werden gerendert. Für die Veröffentlichung auf
pehlione.com muss die neue Markdown-Datei über einen PR nach `main` gelangen;
der erfolgreiche Pages-Workflow verteilt sie danach. Der Blog-Schreibzugriff
ist auf lokale Verbindungen beschränkt.

## Umgebung

- `BASE_PATH`: Vite‑Basis‑Pfad für Deployments unter Unterpfaden, z. B. `/pehlione.io/`.
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`: Zugangsdaten für neue Uploads und neue Einträge.
- `JWT_SECRET`: Signierschlüssel für kurzlebige JWTs.
- `JWT_TTL_SECONDS`: Lebensdauer eines JWTs in Sekunden.
- `CLIENT_ORIGIN`: erlaubte Frontend‑Origin für lokale Entwicklung.
- `API_HOST`: Bind-Adresse des Content-Servers (Standard `127.0.0.1`, nur lokal erreichbar).
- `PORT`: Port des Content-Servers (Standard `3001`).
- `TRUST_PROXY_HOPS`: Anzahl vertrauenswürdiger Reverse-Proxy-Hops (Standard `0`). Nur setzen, wenn der Proxy eingehende `X-Forwarded-For`-Header zuverlässig ersetzt; die Login-Sperre verwendet dann die Client-IP.
- `VITE_API_BASE_URL`: optionaler Read/Write‑API‑Pfad für das Frontend.
- `VITE_UPLOAD_API_BASE_URL`: optionaler Upload‑Pfad für das Frontend.

## Tests (Playwright)

Lokal ausführen:

```bash
npx playwright install
npm run test:e2e
```

GitHub Actions: siehe `.github/workflows/e2e.yml` (Chromium/Firefox/WebKit).

## Deployment

Bereitstellung auf GitHub Pages:

```bash
npm run build
npm run deploy
```

Hinweise:

- `vite.config.ts` liest `BASE_PATH` für korrekte Asset‑Pfade.
- `public/CNAME` ist für die benutzerdefinierte Domain enthalten.

## Barrierefreiheit & Performance

- Alle Bilder laden lazy und werden asynchron decodiert.
- Intrinsische Größen reduzieren Layout‑Shifts.
- Nur beim ersten Galerieladen erscheint ein Seiten‑Overlay; per‑Bild‑Loader sind auf die erste Seite begrenzt.

## CMS Magement

App.tsx

  {/* foto uploader */}

    {/*`<div id="foto-uploader">`

    `<UploadForm />`

    `</div>` */}

und constant.ts

/*  ,

  {

    key: "foto-uploader",

    label: "Foto Uploader",

    href: "#foto-uploader",

    icon: CloudUploadIcon,

    detail: "Profil und Skills.",

  }, */

## Roadmap

- Lightbox mit Tastaturnavigation & Zoom
- Progressive Bildladung (LQIP/Blur‑Up)
- Weitere CI‑Checks (Lint/Typecheck) und visuelle Tests

## Lizenz

MIT — siehe [LICENSE](./LICENSE)
