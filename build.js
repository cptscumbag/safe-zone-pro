const fs = require("fs")
const path = require("path")

const BASE = "https://cptscumbag.github.io/safe-zone-pro/"
const DOWNLOAD = "https://github.com/cptscumbag/safe-zone-pro-plugin/releases/latest"
const DEFAULT_LANG = "en"
const OG_LOCALES = { en: "en_US", ru: "ru_RU", es: "es_ES", "pt-BR": "pt_BR", de: "de_DE", fr: "fr_FR" }

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const locales = fs
  .readdirSync("i18n")
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ key: path.basename(f, ".json"), ...JSON.parse(fs.readFileSync(path.join("i18n", f), "utf8")) }))
  .sort((a, b) => (a.key === DEFAULT_LANG ? -1 : b.key === DEFAULT_LANG ? 1 : a.key.localeCompare(b.key)))

const urlOf = (l) => (l.key === DEFAULT_LANG ? BASE : `${BASE}${l.key}/`)
const dirOf = (l) => (l.key === DEFAULT_LANG ? "." : l.key)
const baseRel = (l) => (l.key === DEFAULT_LANG ? "" : "../")
const hrefBetween = (from, to) => `${baseRel(from)}${to.key === DEFAULT_LANG ? "" : `${to.key}/`}` || "./"

const has_video = fs.existsSync("media/demo.webm") && fs.existsSync("media/demo.mp4")
const template = fs.readFileSync("src/template.html", "utf8")

const hreflangs = [
  ...locales.map((l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${urlOf(l)}">`),
  `<link rel="alternate" hreflang="x-default" href="${BASE}">`,
].join("\n")

const mediaBlock = (l) => {
  const rel = baseRel(l)
  const img = `      <img src="${rel}media/premiere-screenshot.jpg" width="2400" height="1328" alt="${esc(l.alt)}">`

  if (!has_video) return img

  return [
    `      <video autoplay muted loop playsinline preload="metadata" width="2400" height="1328" poster="${rel}media/premiere-screenshot.jpg" aria-label="${esc(l.video_title)}">`,
    `        <source src="${rel}media/demo.webm" type="video/webm">`,
    `        <source src="${rel}media/demo.mp4" type="video/mp4">`,
    img,
    `      </video>`,
  ].join("\n")
}

const jsonld = (l) => {
  const app = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Safe Zone Pro",
    url: urlOf(l),
    inLanguage: l.lang,
    description: l.description,
    applicationCategory: "MultimediaApplication",
    applicationSubCategory: "Adobe Premiere Pro plugin",
    operatingSystem: "macOS, Windows",
    softwareRequirements: "Adobe Premiere Pro 2024 or later",
    downloadUrl: DOWNLOAD,
    image: `${BASE}media/og.jpg`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  }

  if (!has_video) return JSON.stringify(app)

  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      app,
      {
        "@type": "VideoObject",
        name: l.video_title,
        description: l.description,
        inLanguage: l.lang,
        thumbnailUrl: `${BASE}media/premiere-screenshot.jpg`,
        contentUrl: `${BASE}media/demo.mp4`,
        uploadDate: "2026-09-11",
      },
    ],
  })
}

const langsBlock = (current) =>
  locales
    .map((l) => {
      const cur = l.key === current.key ? ' aria-current="page"' : ""
      return `        <li><a href="${hrefBetween(current, l)}" hreflang="${l.hreflang}" lang="${l.lang}"${cur}>${l.name}</a></li>`
    })
    .join("\n")

const render = (l) => {
  const vars = {
    lang: l.lang,
    title: esc(l.title),
    description: esc(l.description),
    url: urlOf(l),
    base: baseRel(l),
    abs: BASE,
    og_locale: OG_LOCALES[l.lang] || l.lang,
    hreflangs,
    jsonld: jsonld(l),
    eyebrow: esc(l.eyebrow),
    h1: esc(l.h1),
    lead: esc(l.lead),
    body: esc(l.body),
    features: l.features.map((f) => `        <li>${esc(f)}</li>`).join("\n"),
    download: DOWNLOAD,
    cta: esc(l.cta),
    meta: esc(l.meta),
    install_note: esc(l.install_note),
    media: mediaBlock(l),
    footer: esc(l.footer),
    lang_label: esc(l.lang_label),
    langs: langsBlock(l),
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vars)) throw new Error(`missing var ${k}`)
    return vars[k]
  })
}

for (const l of locales) {
  const dir = dirOf(l)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, "index.html"), render(l))
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ...locales.map((l) =>
    [
      "  <url>",
      `    <loc>${urlOf(l)}</loc>`,
      ...locales.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${urlOf(a)}"/>`),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}"/>`,
      "  </url>",
    ].join("\n")
  ),
  "</urlset>",
  "",
].join("\n")

fs.writeFileSync("sitemap.xml", sitemap)
fs.writeFileSync("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${BASE}sitemap.xml\n`)

console.log(`built ${locales.length} pages${has_video ? " with video" : ""}`)
