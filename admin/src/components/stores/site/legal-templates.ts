/**
 * Plantillas de páginas legales para una tienda online en Colombia
 * (Ley 1480 de 2011 – Estatuto del Consumidor, Ley 1581 de 2012 – datos
 * personales). Son orientativas: la tienda debe completar los datos entre
 * [CORCHETES] y revisarlas con un abogado antes de publicarlas.
 */

export interface LegalStoreData {
  name: string
  email: string
  phone: string
  address: string
  url: string
}

export interface LegalTemplate {
  slug: string
  title: string
  /** Para qué sirve, en una línea (se muestra en el editor). */
  description: string
  content: (s: LegalStoreData) => string
}

const or = (value: string, placeholder: string) => value.trim() || placeholder

/** Bloque con los datos del responsable, común a varias páginas. */
const owner = (s: LegalStoreData) => `- **Nombre comercial:** ${s.name}
- **Razón social:** [RAZÓN SOCIAL O NOMBRE DEL TITULAR]
- **NIT o cédula:** [NIT]
- **Dirección:** ${or(s.address, "[DIRECCIÓN Y CIUDAD]")}
- **Correo:** ${or(s.email, "[CORREO DE CONTACTO]")}
- **Teléfono / WhatsApp:** ${or(s.phone, "[TELÉFONO]")}`

export const LEGAL_TEMPLATES: LegalTemplate[] = [
  {
    slug: "terminos-y-condiciones",
    title: "Términos y condiciones",
    description:
      "Las reglas de compra: quién vende, precios, pagos, productos personalizados y a quién reclamar.",
    content: (s) => `# Términos y condiciones

Estos términos regulan el uso de ${or(s.url, "este sitio")} y las compras que se hagan en él. Al comprar, aceptas estas condiciones.

## Quién vende

${owner(s)}

## Productos y personalización

Vendemos prendas estampadas con diseños de nuestro catálogo o con diseños enviados por el cliente. Las fotos son de referencia: el color puede variar levemente según la pantalla y la tela.

Si envías un diseño propio, declaras que tienes derecho a usarlo y que no infringe derechos de autor, marcas ni derechos de terceros. Podemos rechazar diseños ofensivos, ilegales o que infrinjan derechos.

## Precios y pagos

Los precios se muestran en pesos colombianos e incluyen los impuestos aplicables, salvo que se indique otra cosa. El costo de envío se informa antes de confirmar la compra.

Medios de pago aceptados: [MEDIOS DE PAGO].

## Confirmación del pedido

Después de comprar recibirás la confirmación del pedido con su resumen. Guarda esta información para cualquier consulta.

## Envíos, cambios y garantías

Las condiciones de entrega, retracto, devoluciones y garantía están en nuestras páginas de [Envíos](/p/envios-y-entregas), [Cambios y devoluciones](/p/cambios-y-devoluciones) y [Garantías](/p/garantias).

## Datos personales

Tratamos tus datos según nuestra [Política de tratamiento de datos](/p/politica-de-privacidad).

## Peticiones, quejas y reclamos

Puedes escribirnos por los canales indicados arriba o en nuestra página de [PQRS](/p/pqrs). También puedes acudir a la [Superintendencia de Industria y Comercio](https://www.sic.gov.co), autoridad de protección al consumidor en Colombia.

## Ley aplicable

Estos términos se rigen por las leyes de la República de Colombia, en especial la Ley 1480 de 2011 (Estatuto del Consumidor).

Última actualización: [FECHA].`,
  },
  {
    slug: "politica-de-privacidad",
    title: "Política de tratamiento de datos personales",
    description:
      "Obligatoria si recoges datos (nombre, correo, dirección). Explica qué datos usas, para qué y cómo ejercer los derechos.",
    content: (s) => `# Política de tratamiento de datos personales

En cumplimiento de la Ley 1581 de 2012 y sus decretos reglamentarios, informamos cómo tratamos tus datos personales.

## Responsable del tratamiento

${owner(s)}

## Datos que recogemos

- Datos de identificación y contacto: nombre, documento, correo, teléfono.
- Datos de entrega: dirección y ciudad.
- Datos de la compra: productos, diseños enviados e historial de pedidos.
- Datos de navegación: cookies y estadísticas de uso (ver [Política de cookies](/p/politica-de-cookies)).

No recogemos datos de medios de pago: los procesa directamente la pasarela de pagos.

## Para qué los usamos

- Procesar, entregar y dar soporte a tus pedidos.
- Comunicarnos contigo sobre tu compra por correo o WhatsApp.
- Cumplir obligaciones legales, contables y tributarias.
- Enviarte novedades y promociones, solo si lo autorizas. Puedes retirar esta autorización cuando quieras.

## Tus derechos

Como titular puedes:

- Conocer, actualizar y rectificar tus datos.
- Solicitar prueba de la autorización que nos diste.
- Ser informado sobre el uso que damos a tus datos.
- Revocar la autorización o pedir que suprimamos tus datos, cuando no exista un deber legal de conservarlos.
- Presentar quejas ante la Superintendencia de Industria y Comercio.

## Cómo ejercerlos

Escríbenos a ${or(s.email, "[CORREO DE CONTACTO]")} indicando tu nombre, documento y lo que solicitas. Respondemos consultas en un máximo de diez (10) días hábiles y reclamos en un máximo de quince (15) días hábiles, según la ley.

## Seguridad y conservación

Aplicamos medidas técnicas y administrativas razonables para proteger tus datos. Los conservamos mientras sean necesarios para las finalidades descritas o por el tiempo que exija la ley.

## Vigencia

Esta política rige desde [FECHA] y puede actualizarse; publicaremos aquí cualquier cambio.`,
  },
  {
    slug: "cambios-y-devoluciones",
    title: "Cambios, devoluciones y derecho de retracto",
    description:
      "Cuándo se puede cambiar o devolver, el derecho de retracto y la reversión del pago.",
    content: (s) => `# Cambios, devoluciones y derecho de retracto

## Derecho de retracto

En compras a distancia tienes derecho a retractarte dentro de los cinco (5) días hábiles siguientes a la entrega del producto (artículo 47 de la Ley 1480 de 2011). El producto debe devolverse sin uso, en las mismas condiciones en que lo recibiste. Los costos de transporte de la devolución corren por tu cuenta.

Si ejerces el retracto, te devolvemos el dinero pagado, sin descuentos ni retenciones, en un plazo máximo de treinta (30) días calendario.

**Excepción — productos personalizados:** según la misma ley, el retracto no aplica a bienes confeccionados según las especificaciones del consumidor o claramente personalizados. Las prendas estampadas con un diseño enviado o elegido a tu medida pueden estar en este caso. Esto no afecta tu derecho a la garantía si el producto llega con defectos.

## Cambios por talla o diseño

[DESCRIBE TU POLÍTICA. Ejemplo: aceptamos cambios de talla en prendas de catálogo dentro de los [N] días siguientes a la entrega, sin uso y con etiquetas. El envío del cambio corre por cuenta de ___.]

## Productos con defectos o errores del pedido

Si el producto llega con defectos de fabricación o estampado, o no corresponde a lo que pediste, escríbenos dentro de los [N] días siguientes a la entrega con fotos del producto. Lo cambiamos o te devolvemos el dinero sin costo para ti. Ver también [Garantías](/p/garantias).

## Reversión del pago

Si pagaste con tarjeta de crédito, débito u otro instrumento de pago electrónico, puedes solicitar la reversión del pago (artículo 51 de la Ley 1480 de 2011) cuando: fuiste objeto de fraude, la operación no fue solicitada, el producto no fue recibido, o el producto no corresponde a lo solicitado o es defectuoso.

Para hacerlo, presenta la queja ante nosotros y avisa a la entidad emisora del medio de pago dentro de los cinco (5) días hábiles siguientes a la fecha en que conociste la situación o recibiste el producto. Si corresponde, devuelve el producto.

## Cómo solicitarlo

Escríbenos a ${or(s.email, "[CORREO DE CONTACTO]")}${s.phone.trim() ? ` o al ${s.phone.trim()}` : ""} con tu número de pedido, el motivo y fotos si aplica.`,
  },
  {
    slug: "envios-y-entregas",
    title: "Envíos y entregas",
    description:
      "Plazos, costos y cobertura de envío. Los productos personalizados tardan más: indícalo aquí.",
    content: (s) => `# Envíos y entregas

## Cobertura

Hacemos envíos a [CIUDADES / TODO EL PAÍS] a través de [TRANSPORTADORA].

## Tiempos

- **Producción:** las prendas se estampan bajo pedido. La producción tarda [N] días hábiles desde la confirmación del pago.
- **Transporte:** [N] días hábiles en ciudades principales y [N] días hábiles en otros destinos.

Si no se acuerda otro plazo, la entrega no superará los treinta (30) días calendario desde el pedido (artículo 50 de la Ley 1480 de 2011). Si no podemos cumplir, te avisaremos y podrás pedir la devolución de tu dinero.

## Costos

[DESCRIBE LOS COSTOS. Ejemplo: el costo del envío se calcula según el destino y se muestra antes de pagar. Envío gratis en compras desde $___.]

## Seguimiento

Cuando despachemos tu pedido te enviaremos el número de guía para que puedas seguirlo.

## Al recibir

Revisa el paquete al recibirlo. Si llega abierto o dañado, déjalo anotado en la guía de la transportadora y escríbenos a ${or(s.email, "[CORREO DE CONTACTO]")} dentro de las [N] horas siguientes.`,
  },
  {
    slug: "garantias",
    title: "Garantías",
    description:
      "La garantía legal de los productos: qué cubre, cuánto dura y cómo reclamarla.",
    content: (s) => `# Garantías

Todos nuestros productos tienen la garantía legal establecida en la Ley 1480 de 2011: respondemos por su calidad, idoneidad, seguridad y buen estado.

## Qué cubre

- Defectos de confección (costuras, tela).
- Defectos del estampado que no se deban al uso o lavado inadecuado (desprendimiento, agrietado prematuro, manchas de impresión).
- Productos que no corresponden a lo pedido (talla, color o diseño distintos).

## Qué no cubre

- Desgaste normal por uso.
- Daños por lavado, secado o planchado que no sigan las instrucciones de cuidado.
- Daños causados por accidentes o mal uso.

## Duración

La garantía es de [N] meses desde la entrega. Si no se indica otro término, aplica el término legal de un (1) año para productos nuevos.

## Cómo reclamar

Escríbenos a ${or(s.email, "[CORREO DE CONTACTO]")} con tu número de pedido, una descripción del problema y fotos. Si la garantía procede, repararemos o cambiaremos el producto, y si no es posible, te devolveremos el dinero.

## Cuidado de las prendas

[INSTRUCCIONES. Ejemplo: lavar al revés con agua fría, no usar blanqueador, no planchar sobre el estampado, secar a la sombra.]`,
  },
  {
    slug: "politica-de-cookies",
    title: "Política de cookies",
    description:
      "Necesaria si usas Google Analytics, Meta Pixel u otras estadísticas (sección Integraciones).",
    content: (s) => `# Política de cookies

${s.name} usa cookies y tecnologías similares en este sitio.

## Qué son

Son pequeños archivos que el navegador guarda para recordar información sobre tu visita.

## Cuáles usamos

- **Necesarias:** para que el sitio funcione (por ejemplo, mantener tu sesión y tu carrito).
- **Estadísticas:** para entender cómo se usa el sitio y mejorarlo, por ejemplo Google Analytics.
- **Publicidad:** para medir nuestras campañas y mostrarte anuncios relevantes, por ejemplo Meta Pixel.

[ELIMINA LOS TIPOS QUE NO USES.]

## Cómo controlarlas

Puedes bloquear o borrar las cookies desde la configuración de tu navegador. Si bloqueas las necesarias, algunas partes del sitio pueden no funcionar.

## Más información

Los datos personales asociados se tratan según nuestra [Política de tratamiento de datos](/p/politica-de-privacidad).`,
  },
  {
    slug: "pqrs",
    title: "Peticiones, quejas y reclamos (PQRS)",
    description:
      "Canal visible para reclamar, con el enlace a la Superintendencia de Industria y Comercio.",
    content: (s) => `# Peticiones, quejas y reclamos (PQRS)

Queremos resolver cualquier inconveniente con tu compra. Puedes enviarnos tu petición, queja, reclamo o sugerencia por estos canales:

- **Correo:** ${or(s.email, "[CORREO DE CONTACTO]")}
- **Teléfono / WhatsApp:** ${or(s.phone, "[TELÉFONO]")}
- **Dirección:** ${or(s.address, "[DIRECCIÓN Y CIUDAD]")}

## Qué incluir

- Tu nombre y documento de identidad.
- El número de pedido.
- Qué ocurrió y qué solicitas.
- Fotos o documentos de soporte, si los tienes.

## Tiempo de respuesta

Respondemos en un máximo de quince (15) días hábiles desde que recibimos tu solicitud.

## Autoridad de protección al consumidor

Si no estás de acuerdo con nuestra respuesta, puedes acudir a la [Superintendencia de Industria y Comercio (SIC)](https://www.sic.gov.co).`,
  },
]
