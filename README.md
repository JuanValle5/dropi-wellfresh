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
- `favicon.svg`
- `assets/` (dos imágenes WebP optimizadas)

No se necesita un comando de build. En un hosting estático usa la raíz del repositorio como directorio público.

## Oferta vigente

- Una unidad de 30 ml: **$59.900, envío gratis**.
- Dos unidades de 30 ml: **$89.900, envío gratis**.
- Segunda unidad por $30.000; ahorro de $29.900 frente a dos compras individuales a $59.900.
- Descuento de salida desactivado.
- WhatsApp: 316 095 8557.

El costo logístico de $18.000 lo asume la tienda; no se cobra al comprador.

## Google Sheets

Pendiente de conexión en el siguiente paso. El formulario deja revisar ofertas y completar datos, pero no envía información ni simula confirmaciones exitosas. No requiere endpoints `/api` ni un servidor Node.

La integración anterior se conserva solo en el archivo local ignorado para referencia. No está activa ni debe desplegarse. La futura conexión estática deberá validar precios en el receptor, correlacionar el acuse con la solicitud y evitar duplicados; no bastará un envío opaco para mostrar éxito.

## Exclusiones

`.gitignore` conserva fuera de GitHub credenciales, investigación y costos, manuales, imágenes originales y capturas locales.
