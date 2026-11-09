# Launcher fonts (self-hosted)

These files are loaded by `../fonts.ts` via `next/font/local`, so `next build`
makes no network request for fonts. They are the latin-subset woff2 files that
Google Fonts served on 2026-11-09 for the config `next/font/google` used before.

| File | Source |
|---|---|
| `Anybody-latin-wght.woff2` | https://fonts.gstatic.com/s/anybody/v13/VuJudNvK2Ib2ppdWYq311GH32hxIv0sd5iDrWdTYR-zR.woff2 |
| `ChakraPetch-latin-500.woff2` | https://fonts.gstatic.com/s/chakrapetch/v13/cIflMapbsEk7TDLdtEz1BwkebIl1R5_F_gUk0w.woff2 |
| `ChakraPetch-latin-600.woff2` | https://fonts.gstatic.com/s/chakrapetch/v13/cIflMapbsEk7TDLdtEz1BwkeQI51R5_F_gUk0w.woff2 |
| `ChakraPetch-latin-700.woff2` | https://fonts.gstatic.com/s/chakrapetch/v13/cIflMapbsEk7TDLdtEz1BwkeJI91R5_F_gUk0w.woff2 |
| `Onest-latin-wght.woff2` | https://fonts.gstatic.com/s/onest/v11/gNMKW3F-SZuj7xmf-HYoEoey.woff2 |

All three families (Anybody, Chakra Petch, Onest) are licensed under the
SIL Open Font License 1.1 (https://openfontlicense.org), which permits
bundling and redistribution with software.

To add a weight or subset, download it from the Google Fonts CSS2 API
(`https://fonts.googleapis.com/css2?family=...`, Chrome User-Agent for woff2)
and add it here. Do not go back to `next/font/google`.
