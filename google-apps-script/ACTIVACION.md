# Actualizar el receptor de WellFresh

La landing ya utiliza la URL `/exec` proporcionada el 2026-10-10. Este cambio requiere actualizar Apps Script: subir archivos a GitHub no cambia el receptor de Google.

1. Abre la hoja de WellFresh → **Extensiones → Apps Script**.
2. Reemplaza todo `Código.gs` por el contenido completo de `Code.gs` de esta carpeta y guarda.
3. Selecciona **prepararHoja** y pulsa **Ejecutar**. Autoriza si Google lo solicita. Se utiliza el ID de la hoja de WellFresh configurado en el código.
4. Abre **Implementar → Gestionar implementaciones → Editar (lápiz)** en la aplicación web existente.
5. Selecciona **Nueva versión → Implementar**, conservando **Ejecutar como: Yo** y acceso **Cualquier usuario**. Así conservas la misma URL `/exec` y no necesitas cambiar la landing.

No ejecutes `doPost` manualmente: requiere los datos del formulario. Mantén la hoja privada.

## Formato de pedidos Aura

Los nuevos pedidos se guardan en **Pedidos**, con estas columnas visibles:

Referencia · Fecha Colombia · Nombre · WhatsApp · Departamento · Municipio · Dirección · Combo · Contenido · Total COP · Envío COP · Recaudo COP · Pago · Estado.

- Individual: 1 frasco de 30 ml, **$59.900**.
- Dúo: 2 frascos de 30 ml, **$89.900**.
- Envío COP: **0** (cargo al comprador, no costo logístico interno).
- Recaudo COP: **0** inicial, siguiendo el ejemplo aportado; es un campo operativo que puedes actualizar manualmente. No representa una integración de cobros ni descuenta automáticamente el total.
- Pago: **Contra entrega**. Estado inicial: **Pendiente de contactar**.
- Fecha en hora de Colombia (`America/Bogota`). No se habilita descuento de salida.

Las columnas O/P (`request_id`, `fingerprint`) se ocultan al crear la pestaña. No las borres: evitan duplicados y detectan cambios en un reintento. Si ordenas filas, incluye también estas columnas.

La pestaña anterior **Pedidos WellFresh** permanece intacta. No se migran ni borran pedidos anteriores; el receptor también consulta sus referencias para evitar duplicarlos. Conserva su nombre y sus columnas. Si ya existe una pestaña **Pedidos** con otra estructura, la preparación se detiene sin sobrescribirla: renómbrala para conservarla y vuelve a ejecutar `prepararHoja`.

## Confirmación y validación

Se conserva el contrato actual de la landing: POST a iframe oculto, acuse `wellfresh-order-result`, nonce y referencia/oferta/total coincidentes. Solo hay éxito después del guardado. Precios y campos se validan en el servidor; se mantiene bloqueo concurrente, huella del pedido, protección contra fórmulas y límite básico por teléfono.

La versión anterior confirmó un pedido ficticio en producción el 2026-10-10. El nuevo formato requiere desplegar esta nueva versión antes de validarse en la hoja real. Los ensayos locales no equivalen a un despliegue en Google.

Orígenes permitidos: https://dropi-wellfresh.pages.dev y localhost/127.0.0.1:4173. No hay cambios de endpoint ni de precios en la landing. La lista de orígenes declarados no autentica visitantes ni evita por sí sola bots.
