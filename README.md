# Route Planner (RK Service)

Jednoduchý plánovač tras s optimalizací pořadí zastávek (NN + 2-opt), mapou (Leaflet), exportem CSV/GPX.

## Lokální spuštění (HTTPS)
```bash
npm install
npm run dev:https
# Dev server poběží na https://localhost:5173
```
> Pokud by prohlížeč hlásil nedůvěryhodný certifikát, vytvořte si lokální certifikát pomocí `mkcert`:
```bash
# nainstalujte mkcert (Windows: choco install mkcert, macOS: brew install mkcert)
mkcert -install
mkcert localhost
# získáte soubory localhost.pem a localhost-key.pem
vite --host --https --cert localhost.pem --key localhost-key.pem
```

## Nasazení na GitHub Pages (HTTPS)
1. Vytvořte public repo (např. `route-planner`), nahrajte obsah.
2. V Settings → Pages zvolte **Source: GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` provede build a nasazení.
4. Aplikace poběží na `https://<váš-účet>.github.io/route-planner/`.

## Build a statický náhled
```bash
npm run build
npm run preview
# nebo s HTTPS: npm run preview:https
```
