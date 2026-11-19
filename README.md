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

Open the page with `#tune` at the end of the URL, for example `http://localhost:8000/#tune`, to show the tuning panel. It controls the layout, cards, motion, intro, theme, responsive behaviour and more. Changes are saved in the browser.

## Structure

```
index.html   the whole page: markup, styles and script
fonts/       Jeju Myeongjo, Geist Mono and Geist Pixel
works/       work images (WebP, 1280px)
vendor/      DialKit (tuning panel) and Lenis (smooth scroll)
```

## Deploy

The site is plain static files, so it can be hosted on GitHub Pages, Vercel, Netlify or any static host. For GitHub Pages: Settings → Pages → deploy from the `main` branch, root folder.
