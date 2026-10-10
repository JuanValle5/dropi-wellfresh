# WellFresh · Aura

Landing estática en HTML, CSS y JavaScript. No requiere npm, Node.js, compilación ni instalación de dependencias.

## Abrir

Abre `index.html` directamente en tu navegador. El estilo, las imágenes y el formulario funcionan con rutas relativas también en `file://`.

Para verla por HTTP opcionalmente, desde la carpeta del proyecto:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Luego abre http://localhost:4173/. Este servidor solo sirve archivos para vista previa; no forma parte de la landing ni procesa pedidos. No expongas el servidor local a Internet: el directorio de trabajo contiene archivos locales ignorados.

## Archivos para publicar

- `index.html`
- `styles.css`
- `script.js`
- `sheets-config.js`
- `favicon.svg`
- `assets/` (imágenes WebP, poster y video MP4 optimizado)

No se necesita un comando de build. En un hosting estático usa la raíz del repositorio como directorio público.

## Oferta vigente

- Una unidad de 30 ml: **$59.900, envío gratis**.
- Dos unidades de 30 ml: **$89.900, envío gratis**.
- Segunda unidad por $30.000; ahorro de $29.900 frente a dos compras individuales a $59.900.
- Descuento de salida desactivado.
- WhatsApp: 316 095 8557.

El costo logístico de $18.000 lo asume la tienda; no se cobra al comprador.

## Google Sheets

Receptor preparado para la hoja indicada por el usuario en `google-apps-script/Code.gs`. URL `/exec` configurada el 2026-10-10; la validación real se registra en la ficha local. Pasos en `google-apps-script/ACTIVACION.md`.

Configurar el endpoint en `sheets-config.js`. La landing continúa estática y valida el acuse de Google antes de mostrar éxito. Los reintentos mantienen referencia y contenido para evitar duplicados. Mientras la URL esté vacía no se envían pedidos. Abrir por HTTP/HTTPS para enviar; `file://` solo permite revisar la landing.

## Exclusiones

`.gitignore` conserva fuera de GitHub credenciales, investigación y costos, manuales, imágenes originales y capturas locales.

El video se reproduce con controles nativos, sin autoplay y con `preload="none"` para no descargarlo hasta que el visitante lo solicite. `assets/video.mp4` es el original local ignorado; se publica `assets/wellfresh-demo.mp4`.
