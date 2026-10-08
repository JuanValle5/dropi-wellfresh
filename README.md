# WellFresh · Aura

Landing local con checkout modal y receptor de pedidos preparado para Google Sheets. No está publicada. **La recepción de pedidos está desactivada hasta conectar Google Sheets.**

## Ejecutar

Requiere Node.js 20.19 o superior. No requiere instalar dependencias para servir la aplicación.

```sh
npm start
```

Abrir http://localhost:4173. La configuración local `.env` habilita `LOCAL_TEST_MODE=false`, `ORDERS_ENABLED=false` y el WhatsApp de soporte suministrado por el usuario. `.env` no se versiona. Si falta, copiar `.env.example` a `.env` y configurar el teléfono.

Para probar el simulador, habilitar explícitamente `LOCAL_TEST_MODE=true` y reiniciar. No aparece un aviso sobre la landing; el formulario y el resultado sí identifican la simulación para no confundirla con un pedido real. Las pruebas simuladas usan memoria temporal; al reiniciar el servidor desaparecen. Usar solo datos ficticios. Tras confirmar una simulación se puede hacer otra desde el botón correspondiente. No hay caché persistente de datos del comprador en el navegador.

## Oferta implementada para revisión

- 1 frasco: $49.900 + $18.000 envío = $67.900 total.
- 2 frascos: $79.900 total, envío incluido.
- Descuento de salida desactivado: el análisis lo condicionó a confirmar costos y recuperación de mercancía; no existe promoción aprobada.
- Garantía por defectos de 30 días, según confirmación del usuario.
- Teléfono de soporte: 316 095 8557.

Las condiciones de envío del combo y pago contra entrega siguen siendo parte de la propuesta local que debe verificarse para la operación antes de publicar. No se publican porcentajes antibacterianos, duración, naturalidad, ausencia de azúcar, dosis ni testimonios no demostrados. Se usan foto4 para ambientación y foto3 para escala en mano; no se simula aplicación oral.

## Archivos

- `public/`: landing y formulario; imágenes optimizadas de los recursos aportados.
- `lib/catalog.mjs`: catálogo y validación compartidos entre navegador y servidor.
- `server.mjs`: servidor local y ruta `/api/orders`; solo sirve una lista explícita de archivos públicos, nunca `.env`, conocimiento o receptor.
- `lib/orders.mjs`: simulador idempotente y adaptador servidor→Apps Script.
- `google-apps-script/Code.gs`: validación, catálogo del receptor, deduplicación y escritura con bloqueo en Sheets.
- `google-apps-script/ACTIVACION.md`: futura configuración real.

El navegador solo recibe la confirmación de éxito cuando el servidor devuelve `ok`, referencia, oferta y total coincidentes. En modo real, además se exige el acuse de Apps Script después de `SpreadsheetApp.flush()`. Una carga de página, un fetch opaco o un código HTTP 200 por sí solos no se consideran éxito.

Si la confirmación es incierta, el formulario conserva la referencia, bloquea la edición del contenido pendiente y permite reintentar exactamente la misma solicitud. Cerrar el modal sigue permitido. No recargar la página tras una respuesta incierta sin consultar la referencia: se conserva en memoria, no en almacenamiento persistente.

## Validación

```sh
npm test
```

Cinco casos de prueba en `tests/orders.test.mjs`: datos y precios manipulados, idempotencia, acuses falsos/incompletos, escritura única y protección de fórmulas en Apps Script, secreto inválido. Pruebas locales con servicios simulados; no equivalen a validación de una hoja real.

Prueba de interfaz `tests/browser.cjs` requiere Playwright y Chrome. Con Playwright disponible en el entorno y Chrome instalado (ruta configurable mediante CHROME_PATH), ejecutar contra el servidor iniciado con LOCAL_TEST_MODE=true:

```sh
node tests/browser.cjs
```

Capturas locales en `artifacts/` (no versionadas). Móvil 375/430, tablet 768 y escritorio 1440; comprobación de desbordamiento, imágenes, selección de oferta, Escape, persistencia de formulario, privacidad, simulación, acuse inválido y reintento correlacionado.

## Contenido del repositorio

Se versionan código, imágenes optimizadas, pruebas, guía de activación y plantilla de configuración. `.gitignore` excluye credenciales, imágenes originales, investigación, manuales, capturas y contexto local. La casilla de autorización fue retirada a solicitud del usuario; no se registra un consentimiento ficticio en el receptor.

Para verificar el modo habitual sin receptor, ejecutar `node tests/disabled-checkout.cjs` con `LOCAL_TEST_MODE=false`. Comprueba ausencia de aviso y casilla, y que no haya confirmación falsa.
