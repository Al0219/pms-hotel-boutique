# Local Demo Dataset — fotografías y licencias

## Galerías activas sin atribución visual obligatoria (2026-10-06)

Se sustituyeron las referencias a las 14 fotos Commons por diez fotografías
Pexels locales, con tres vistas por código (algunas compartidas). Se verificaron
las páginas individuales, enlaces de descarga y la
[licencia Pexels](https://www.pexels.com/license/): permite descargar, usar y
modificar estas imágenes en una web/app sin atribución obligatoria. No se usan
la API ni un servicio externo en runtime. No se afirma public domain/CC0.

Los JPEG de 1280 px se descargaron del CDN enlazado por las páginas originales,
con resize/compresión del proveedor. Son presentación editorial de interiores,
no una promesa de capacidad ni fotografías del Hotel Boutique Demo. Identidad,
precios y ATS no dependen de las imágenes.

| Archivo local bajo public/ | Fuente / página original | Licencia |
|---|---|---|
| `/images/rooms/local-demo/pexels-7061675.jpg` | [Pexels 7061675](https://www.pexels.com/photo/bedroom-interior-with-bed-near-window-with-curtains-7061675/) | [Pexels License](https://www.pexels.com/license/) |
| `/images/rooms/local-demo/pexels-6186819.jpg` | [Pexels 6186819](https://www.pexels.com/photo/interior-of-bright-room-in-hotel-6186819/) | [Pexels License](https://www.pexels.com/license/) |
| `/images/rooms/local-demo/pexels-30075355.jpg` | [Pexels 30075355](https://www.pexels.com/photo/elegant-minimalist-bedroom-in-los-angeles-hotel-30075355/) | [Pexels License](https://www.pexels.com/license/) |
| `/images/rooms/local-demo/pexels-23916838.jpg` | [Pexels 23916838](https://www.pexels.com/photo/beds-in-hotel-room-23916838/) | [Pexels License](https://www.pexels.com/license/) |
| `/images/rooms/local-demo/pexels-20666872.jpg` | [Pexels 20666872](https://www.pexels.com/photo/beds-in-a-hotel-room-20666872/) | [Pexels License](https://www.pexels.com/license/) |
| `/images/rooms/local-demo/pexels-29000012.jpg` | [Pexels 29000012](https://www.pexels.com/photo/modern-hotel-room-with-twin-beds-and-elegant-decor-29000012/) | [Pexels License](https://www.pexels.com/license/) |
| `/images/rooms/local-demo/pexels-5883725.jpg` | [Pexels 5883725](https://www.pexels.com/photo/modern-hotel-bedroom-interior-5883725/) | [Pexels License](https://www.pexels.com/license/) |
| `/images/rooms/local-demo/pexels-5883728.jpg` | [Pexels 5883728](https://www.pexels.com/photo/interior-of-a-hotel-room-5883728/) | [Pexels License](https://www.pexels.com/license/) |
| `/images/rooms/local-demo/pexels-17948132.jpg` | [Pexels 17948132](https://www.pexels.com/photo/interior-of-an-elegant-hotel-room-17948132/) | [Pexels License](https://www.pexels.com/license/) |
| `/images/rooms/local-demo/pexels-18285947.jpg` | [Pexels 18285947](https://www.pexels.com/photo/elegant-hotel-bedroom-18285947/) | [Pexels License](https://www.pexels.com/license/) |

La UI no muestra créditos, licencias ni el copy de fotografías ilustrativas.
Las asociaciones exactas por RoomType.code viven en `public-room-metadata.ts`;
el fallback sin foto sigue funcionando. Mock conserva los assets generados de
`public/images/rooms/demo/README.md`.
