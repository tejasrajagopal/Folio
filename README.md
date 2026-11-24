# Tejas Rajagopal — Portfolio

Personal portfolio of Tejas Rajagopal, brand-led generalist designer for fintech, AI and crypto.

A single static page with no build step:

- **Hero:** selected work orbits the name on a tilted 3D ring, which you can drag to spin and which flies in from the camera on load.
- **Statement:** a paragraph that reads in as you scroll, with a gradient wave passing through the letters.
- **Work grid:** filterable by All, Projects and Experiments, with a top bar on desktop and a bottom bar on mobile.
- **Light and dark themes:** a toggle switches between them, with a short blur during the switch.
- **Small screens:** below 1024px wide, the orbit is replaced by a simple list layout.

## Run locally

Any static file server works:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly from disk also mostly works, but a server is recommended so the fonts and images load reliably.

## Tuning

Open the page with `#tune` at the end of the URL, for example `http://localhost:8000/#tune`, to show the tuning panel. It controls the layout, cards, motion, intro, theme, responsive behaviour and more. Changes are saved in the browser and only apply while `#tune` is on; to ship a value, change its default in the `cfg` block of `index.html`. DialKit itself only loads with `#tune`, so visitors never download it.

## Structure

```
index.html   the whole page: markup, styles and script
fonts/       Jeju Myeongjo, Geist Mono and Geist Pixel (WOFF2, subset to Latin)
works/       work images (WebP, 1280px)
vendor/      DialKit (tuning panel) and Lenis (smooth scroll)
404.html     real 404 page (stops every unknown URL returning the homepage)
robots.txt, sitemap.xml, llms.txt, favicon.svg, apple-touch-icon.png, og-image.jpg   search and sharing
_headers     cache rules for Cloudflare
```

## Deploy

The site is plain static files, so it can be hosted on GitHub Pages, Vercel, Netlify or any static host. For GitHub Pages: Settings → Pages → deploy from the `main` branch, root folder.

## SEO

The head carries the description, canonical URL (`https://tejasrajagopal.com/`), Open Graph and Twitter tags, and a JSON-LD graph (WebSite, ProfilePage, Person, and the work as an ItemList). The subtitle, statement and work grid are also written into the initial HTML, so crawlers that don't run JavaScript still see them; the script then rebuilds them as before. If you change the name, subtitle, statement or works in `cfg`/`WORKS`, update the matching head tags, JSON-LD, initial HTML and `llms.txt` too.

## Working on the site

`index.html` is **built**: don't edit it by hand. The source is in `src/`:

- `src/index.html` — the page; lines like `@@include css/base.css@@` pull in the files below
- `src/css/` — `base.css` (shared), `desktop.css`, `phone.css`
- `src/js/` — `config` (settings), `state`, `favicon`, `cards`, `theme`, `apply`, `input`, `sections`, `case-view`,
  `orbit-gl` (the WebGL orbit), `frame` (the per-frame loop), `band` (the gradient band), `boot`.
  They are joined into one script in that order and share one scope.

After any change:

```
node build.mjs          # rebuild index.html from src/
node tests/smoke.cjs    # load it at desktop + phone sizes and check it (needs Playwright with Chromium)
```

The smoke test fails if `index.html` is out of date with `src/`, on any page error, on sideways scrolling, and on the
band, bars, filters, images and theme switch misbehaving.
