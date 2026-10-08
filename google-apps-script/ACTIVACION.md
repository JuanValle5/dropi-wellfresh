# Conectar Google Sheets más adelante

Estado actual: **local para pruebas**, por instrucción del usuario. No se creó hoja, no se desplegó Apps Script y no se enviaron pedidos a Google. Este archivo describe la activación futura; no indica que ya se haya realizado.

## Flujo

Navegador → servidor de WellFresh `/api/orders` → aplicación web de Apps Script → hoja privada → acuse de guardado → navegador.

Se utiliza un servidor intermediario para mantener el secreto fuera del navegador y comprobar la respuesta JSON de Google. No hay `no-cors`, iframe de confirmación ni parámetros con datos personales en URL. Esta implementación necesita un servidor Node o adaptar el mismo contrato a una función del proveedor de hosting; no basta publicar `public/` como archivos estáticos.

## Preparación

1. Crear una hoja privada de Google para WellFresh. Abrir Extensiones → Apps Script y copiar `Code.gs`.
2. En Configuración del proyecto → Propiedades del script, definir:
   - `WELLFRESH_SPREADSHEET_ID`: ID de esa hoja.
   - `WELLFRESH_SECRET`: secreto aleatorio exclusivo de este receptor (mínimo 32 bytes aleatorios recomendados). No enviarlo por chat ni ponerlo en frontend.
3. Desplegar una nueva versión como aplicación web, ejecutada con la cuenta propietaria, accesible para las solicitudes del servidor. Autorizar Sheets con la cuenta propietaria. No volver pública la hoja. Copiar la URL terminada en `/exec`.
4. Configurar en el servidor, nunca en `public/`:
   - `GOOGLE_SCRIPT_URL`: URL `/exec`.
   - `GOOGLE_SCRIPT_SECRET`: el mismo secreto.
   - `PUBLIC_ORIGIN`: origen exacto de la landing, sin barra final.
   - `SUPPORT_WHATSAPP=573160958557`.
5. Mantener `ORDERS_ENABLED=false` hasta haber verificado operación, cobertura, tarifas, condiciones de posventa, aviso completo de privacidad e identidad de responsable, y la prueba de guardado real autorizada. La configuración de ejemplo mantiene simulación y recepción real desactivadas.
6. Cuando se autorice y configure la prueba real, cambiar `LOCAL_TEST_MODE=false` y `ORDERS_ENABLED=true`, reiniciar el servidor y enviar un registro ficticio claramente identificado **PRUEBA NO DESPACHAR**. Verificar referencia, valores y una sola fila en la hoja antes de admitir clientes. El usuario aún no ha autorizado esa prueba externa.

Cambiar el código de Apps Script requiere actualizar la versión desplegada; editar el archivo no actualiza automáticamente el receptor público. Si cambian precios o promociones, mantener sincronizados `lib/catalog.mjs` y `WF_CATALOG` en `Code.gs`, actualizar `WF_VERSION` y volver a probar. No usar el endpoint de otro producto.

## Contrato y protecciones

- El servidor valida campos, UUID, catálogo, total y ausencia de promociones no aprobadas. Apps Script repite la validación y obtiene unidades y desglose del catálogo propio.
- El secreto compartido autentica la comunicación con Apps Script. La comprobación de origen en el servidor es protección adicional, no autenticación suficiente contra bots.
- Apps Script usa `LockService` y busca `request_id` antes de escribir. La huella SHA-256 detecta reintentos con contenido diferente.
- La hoja `Pedidos WellFresh` se crea con cabeceras al primer pedido válido. No editar su estructura sin actualizar el receptor. No escribir manualmente IDs de pedidos en filas ajenas al sistema.
- Las celdas de texto se protegen contra prefijos de fórmula. No se imprimen datos personales ni secretos en logs.
- El éxito solo se devuelve tras guardar/flush o encontrar el mismo pedido previamente guardado.
- El servidor local limita intentos por dirección de conexión; en hosting con proxy o múltiples instancias se debe adaptar esta protección a IP confiable y almacenamiento compartido, o usar controles del proveedor. El límite en memoria no constituye defensa completa contra abuso.
- Verificar cuánto tiempo se conservan los datos y cómo se atienden solicitudes de titulares antes de producción. El aviso local explica finalidad de pedidos, pero no sustituye la política definitiva del responsable.

## Fuentes técnicas consultadas

- [Aplicaciones web de Apps Script](https://developers.google.com/apps-script/guides/web): `doPost` y despliegue.
- [Content Service](https://developers.google.com/apps-script/guides/content): respuestas y redirecciones; el servidor sigue la redirección y valida el JSON.
