// Renders public/og-image.png (1200x630) for link previews, using the app font.
import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const font = fileURLToPath(new URL('../node_modules/@fontsource-variable/archivo/files/archivo-latin-ext-wdth-normal.woff2', import.meta.url))
const fontLatin = fileURLToPath(new URL('../node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2', import.meta.url))
const output = fileURLToPath(new URL('../public/og-image.png', import.meta.url))
const dataUrl = (path: string) => `data:font/woff2;base64,${readFileSync(path).toString('base64')}`

const html = `<!doctype html><html><head><style>
@font-face { font-family: Archivo; src: url(${dataUrl(fontLatin)}) format('woff2'); font-weight: 100 900; font-stretch: 62% 125%; unicode-range: U+0000-00FF; }
@font-face { font-family: Archivo; src: url(${dataUrl(font)}) format('woff2'); font-weight: 100 900; font-stretch: 62% 125%; unicode-range: U+0100-02BA; }
html, body { margin: 0; width: 1200px; height: 630px; background: #15212C; font-family: Archivo; color: #fff; overflow: hidden; }
.rink { position: absolute; right: -120px; top: 45px; width: 620px; height: 540px; border: 10px solid #9AADBE; border-radius: 170px; }
.red { position: absolute; left: 300px; top: 0; bottom: 0; width: 14px; background: #FF5A6E; }
.blue1 { position: absolute; left: 160px; top: 0; bottom: 0; width: 12px; background: #7FA6FF; }
.blue2 { position: absolute; left: 440px; top: 0; bottom: 0; width: 12px; background: #7FA6FF; }
.circle { position: absolute; left: 197px; top: 160px; width: 200px; height: 200px; border: 8px solid #7FA6FF; border-radius: 50%; }
.dot { position: absolute; left: 280px; top: 243px; width: 48px; height: 48px; background: #fff; border-radius: 50%; }
.text { position: absolute; left: 80px; top: 150px; }
h1 { margin: 0; font-size: 150px; font-stretch: 72%; font-weight: 780; letter-spacing: -1px; line-height: 1; }
p { margin: 28px 0 0; font-size: 40px; line-height: 1.3; color: #C9D6E1; max-width: 560px; }
</style></head><body>
<div class="rink"><div class="blue1"></div><div class="red"></div><div class="blue2"></div><div class="circle"></div><div class="dot"></div></div>
<div class="text"><h1>Partička</h1><p>Termíny ľadu, súpiska a platby pre partičkový hokej.</p></div>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(html, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: output })
await browser.close()
console.log(`OG obrázok uložený do ${output}`)
