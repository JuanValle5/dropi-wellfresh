# Activar el receptor de WellFresh

El código ya contiene el ID de la hoja proporcionada por el usuario. El usuario desplegó el receptor y proporcionó su URL `/exec` el 2026-10-10; ya está configurada en sheets-config.js.

1. En la hoja, abrir **Extensiones → Apps Script**.
2. Reemplazar todo el contenido de `Código.gs` por `Code.gs` de esta carpeta. Guardar.
3. **Implementar → Nueva implementación → Aplicación web**.
4. **Ejecutar como: Yo**. **Quién tiene acceso: Cualquier usuario** (incluidos usuarios no conectados, no solo usuarios de la organización).
5. Implementar y autorizar con la cuenta propietaria de la hoja. Mantener privada la hoja: el acceso público es al receptor, no a los datos.
6. Copiar la URL de aplicación web terminada en `/exec` y enviarla a este chat. No usar `/dev`.

No ejecutar `doPost` desde el editor: necesita los datos enviados por el formulario. El receptor crea su pestaña `Pedidos WellFresh` y las cabeceras al primer pedido válido sin borrar otras pestañas.

## Activación de la landing

Pegar la URL `/exec` en `sheets-config.js`. Para la prueba local usar `http://localhost:4173/`, no abrir con `file://`. El sitio sigue siendo estático, sin npm ni servidor de aplicación.

Cuando exista dominio público, añadir su origen exacto a `WF_ALLOWED_ORIGINS` en Apps Script y actualizar la implementación a una versión nueva. Actualmente se admite https://dropi-wellfresh.pages.dev y, para pruebas, localhost y 127.0.0.1 en puerto 4173. Cambiar precios exige actualizar el catálogo en `script.js` y `Code.gs` y desplegar de nuevo.

## Verificación pendiente

Hacer un pedido claramente marcado PRUEBA NO DESPACHAR. Verificar una fila con el total correcto ($59.900 o $89.900, envío cero) y la misma referencia mostrada en pantalla. Reintentar la misma solicitud no debe duplicar la fila. Hasta comprobar la hoja real, la integración solo tiene pruebas con servicios simulados.

## Diseño

POST de formulario a iframe oculto, respuesta HTML de Google y acuse `postMessage` al origen exacto de la landing. La landing exige origen de Google válido, nonce aleatorio por intento y referencia/oferta/total coincidentes. La carga del iframe no se interpreta como éxito. No usa fetch opaco ni expone secretos. Ante timeout mantiene datos y referencia; no recargar hasta aclarar si el pedido quedó registrado.

El receptor valida precios/campos, protege celdas contra fórmulas y bloquea escrituras concurrentes. La deduplicación usa referencia y huella del contenido. Hay límite básico por teléfono; el endpoint de compra es público y la lista de orígenes declarados no autentica ni evita por sí sola bots. Evaluar protección adicional si aparece abuso. Las funciones internas terminan en `_` para no exponerlas por google.script.run.

Fuente: [despliegue de aplicaciones web de Apps Script](https://developers.google.com/apps-script/guides/web).
