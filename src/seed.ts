import type { Core } from '@strapi/strapi';
import * as fs from 'fs';
import * as path from 'path';

// Seed v2 con el contenido del diseño de Figma "Avanz Website" y su sitemap.
// Idempotente: solo corre si la base está vacía (no hay productos).
export async function seed(strapi: Core.Strapi) {
  const existing = await strapi.documents('api::product.product').count({});
  if (existing > 0) return;

  strapi.log.info('🌱 Sembrando contenido AVANZ (v2)...');

  const media = await uploadAssets(strapi);

  await seedGlobal(strapi, media);
  await seedProducts(strapi, media);
  await seedArticles(strapi, media);
  await seedPromotions(strapi);
  await seedPages(strapi, media);

  strapi.log.info('✅ Seed AVANZ v2 completado');
}

type MediaMap = Record<string, any>;

async function uploadAssets(strapi: Core.Strapi): Promise<MediaMap> {
  const assetsDir = path.join(__dirname, '..', '..', 'scripts', 'assets');
  const map: MediaMap = {};
  if (!fs.existsSync(assetsDir)) return map;

  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  };

  for (const fileName of fs.readdirSync(assetsDir)) {
    const ext = path.extname(fileName).toLowerCase();
    if (!mimeTypes[ext]) continue;
    const filePath = path.join(assetsDir, fileName);
    const stats = fs.statSync(filePath);
    try {
      const [uploaded] = await strapi
        .plugin('upload')
        .service('upload')
        .upload({
          data: { fileInfo: { name: path.basename(fileName, ext) } },
          files: {
            filepath: filePath,
            originalFilename: fileName,
            mimetype: mimeTypes[ext],
            size: stats.size,
          },
        });
      map[fileName] = uploaded;
    } catch (err) {
      strapi.log.warn(`No se pudo subir ${fileName}: ${err}`);
    }
  }
  return map;
}

async function seedGlobal(strapi: Core.Strapi, media: MediaMap) {
  await strapi.documents('api::global.global').create({
    data: {
      siteName: 'Banco Avanz',
      logo: media['avanz-logo.svg']?.id,
      ebankingUrl: 'https://ebanking.avanzbanc.com',
      usdBuy: 36.1,
      usdSell: 36.62,
      audienceNav: [
        { label: 'Personas', url: '/' },
        { label: 'Empresas', url: '/empresas' },
        { label: 'Sobre nosotros', url: '/sobre-nosotros' },
      ],
      topNav: [],
      mainNav: [
        {
          label: 'Productos',
          url: '/cuentas',
          links: [
            { label: 'Cuentas', url: '/cuentas' },
            { label: 'Tarjetas', url: '/tarjetas' },
            { label: 'Préstamos', url: '/creditos' },
            { label: 'Seguros', url: '/seguros' },
            { label: 'Transferencias', url: '/transferencias' },
            { label: 'Otros Servicios', url: '/servicios' },
          ],
        },
        { label: 'Canales de atención', url: '/canales-de-atencion', links: [] },
        { label: 'Zona digital', url: '/zona-digital', links: [] },
        { label: 'Noticias', url: '/noticias', links: [] },
        { label: 'Promociones', url: '/promociones', links: [] },
      ],
      socialLinks: [
        { name: 'Facebook', url: 'https://www.facebook.com/avanzbanc', icon: media['social-1.svg']?.id },
        { name: 'Instagram', url: 'https://www.instagram.com/avanzbanc', icon: media['social-2.svg']?.id },
        { name: 'YouTube', url: 'https://www.youtube.com/@avanzbanc', icon: media['social-3.svg']?.id },
      ],
      footerColumns: [
        {
          title: 'Acerca de avanz',
          links: [
            { label: '¿Quiénes somos?', url: '/quienes-somos' },
            { label: 'Información Regulatoria', url: '/informacion-regulatoria' },
            { label: 'Información Financiera', url: '/informacion-financiera' },
            { label: 'Trabaja con Nosotros', url: '/trabaja-con-nosotros' },
          ],
        },
        {
          title: 'Nuestros Productos',
          links: [
            { label: 'Cuenta Corriente', url: '/productos/cuenta-corriente' },
            { label: 'Cuentas de Ahorro', url: '/cuentas' },
            { label: 'Tarjeta de Débito', url: '/productos/tarjeta-de-debito' },
            { label: 'Tarjeta de Crédito', url: '/tarjetas' },
            { label: 'Créditos', url: '/creditos' },
            { label: 'Seguros de Vida y Vehicular', url: '/seguros' },
            { label: 'Transferencias', url: '/transferencias' },
            { label: 'Otros Servicios', url: '/servicios' },
          ],
        },
        {
          title: 'Otros enlaces',
          links: [
            { label: 'Canales de Atención', url: '/canales-de-atencion' },
            { label: 'Zona Digital', url: '/zona-digital' },
            { label: 'Educación Financiera', url: '/educacion-financiera' },
            { label: 'Tips de Seguridad', url: '/tips-de-seguridad' },
            { label: 'Noticias', url: '/noticias' },
            { label: 'Promociones', url: '/promociones' },
          ],
        },
      ],
      address: 'Avenida Jean Paul Genie Edificio Avanz',
      phone: '2223 7676',
      copyright: 'Todos los derechos reservados. 2023© Banco Avanz de Grupo Pellas',
    },
  });
}

async function seedProducts(strapi: Core.Strapi, media: MediaMap) {
  const f = (texts: string[]) => texts.map((text) => ({ text }));

  const products: any[] = [
    // ——— Cuentas Personas ———
    {
      name: 'Cuenta Corriente',
      slug: 'cuenta-corriente',
      category: 'cuenta',
      audience: 'personas',
      order: 1,
      shortDescription:
        'Descubre la libertad financiera con AVANZ. Nuestra cuenta corriente estándar te pone en control total de tu dinero, ya sea para tus gastos diarios o para administrar el efectivo de tu negocio.',
      description:
        'AVANZ te ofrece una cuenta corriente segura para tus gastos diarios y negocio. Asegura tu dinero, ahorra y recibe beneficios.',
      benefits: f([
        'Acceso inmediato a tu dinero.',
        'Utiliza cheques para pagos y compras.',
        'Usa tu tarjeta de débito en todo momento.',
        'Realiza transferencias con facilidad.',
        'Gestiona tu cuenta desde cualquier lugar con AVANZ móvil, AVANZ Token, e-banking y áreas 24/7.',
      ]),
    },
    {
      name: 'Cuenta Naranja',
      slug: 'cuenta-naranja',
      category: 'cuenta',
      audience: 'personas',
      order: 2,
      shortDescription:
        'Abrí tu Cuenta Naranja ¡hoy mismo! Sin restricciones de retiro y 3% anual además tenés acceso a todas nuestras plataformas electrónicas y beneficios.',
      description:
        'Abrí tu cuenta naranja para recibir más por tu dinero desde el primer día. Invertí en el futuro de tu familia con una Cuenta Naranja y obtené los mejores beneficios.',
      benefits: f([
        'Sin restricciones de retiro.',
        'Ganás 3% de interés anual.',
        'Usa tu tarjeta de débito en todo momento.',
        'Realiza transferencias con facilidad.',
        'Gestiona tu cuenta desde cualquier lugar con AVANZ móvil, AVANZ Token, e-banking y áreas 24/7.',
      ]),
    },
    {
      name: 'Cuenta Plan ProAhorro',
      slug: 'cuenta-plan-proahorro',
      category: 'cuenta',
      audience: 'personas',
      order: 3,
      shortDescription:
        'Este programa de ahorro mensual te ofrece plazos y montos flexibles, junto con tasas de interés atractivas para tu ahorro. Tú decides el plazo que se adapte a tus metas, y nosotros reconocemos tu dedicación.',
      description: 'Ahorra como quieras, gana con tu constancia. ¡El plan ProAhorro te ayuda a lograr tus metas!',
    },
    {
      name: 'Cuenta MiChanchito',
      slug: 'cuenta-michanchito',
      category: 'cuenta',
      audience: 'personas',
      order: 4,
      shortDescription:
        'MiChanchito está diseñado para educar financieramente a tus hijos y promover el hábito de ahorrar desde una edad temprana. Juntos, construimos un futuro financiero más sólido.',
      description:
        'MiChanchito está diseñado para educar financieramente a tus hijos y promover el hábito de ahorrar desde una edad temprana.',
    },
    {
      name: 'Cuenta MiAhorro',
      slug: 'cuenta-miahorro',
      category: 'cuenta',
      audience: 'personas',
      order: 5,
      shortDescription:
        'Comenzá a ahorrar SIN monto mínimo de depósito, SOLO necesitás tu cédula para abrirla. ¡Pedí tu cuenta de ahorro MiAhorro hoy mismo!',
      description:
        '¡Solicitala en línea, trámitala rápido y sin complicaciones! Comenzá a ahorrar sin monto mínimo de depósito.',
    },
    {
      name: 'Cuenta Ahorro Tradicional',
      slug: 'cuenta-ahorro-tradicional',
      category: 'cuenta',
      audience: 'personas',
      order: 6,
      shortDescription:
        'Descubre la Cuenta de Ahorro Tradicional, una herramienta perfecta para personas y empresas que desean una forma sencilla y cómoda de aumentar sus ahorros. ¿Listo para empezar a hacer crecer tu dinero?',
      description: 'Incrementá tu dinero con 3% de interés anual.',
    },
    {
      name: 'Cuenta ProActiva',
      slug: 'cuenta-proactiva',
      category: 'cuenta',
      audience: 'personas',
      order: 7,
      shortDescription:
        'La cuenta ProActiva es ideal para vos emprendedor o empresario, ya que genera intereses escalonados de acuerdo al monto que depositás.',
      description:
        'La cuenta ProActiva es ideal para vos emprendedor o empresario, ya que genera intereses escalonados de acuerdo al monto que depositás.',
    },
    {
      name: 'Depósito a Plazo Fijo',
      slug: 'deposito-a-plazo-fijo',
      category: 'cuenta',
      audience: 'personas',
      order: 8,
      shortDescription:
        'El Depósito a Plazo Fijo es una inversión realizada a un plazo pactado, que te permite maximizar tus ahorros de una forma fácil y segura generando intereses más altos que otros productos financieros.',
      description:
        'El Depósito a Plazo Fijo es una inversión realizada a un plazo pactado, que te permite maximizar tus ahorros de una forma fácil y segura.',
    },

    // ——— Tarjetas Personas ———
    {
      name: 'Tarjeta de Débito',
      slug: 'tarjeta-de-debito',
      category: 'tarjeta',
      audience: 'personas',
      order: 1,
      photo: media['debito-persona.jpg']?.id,
      cardImage: media['tarjeta-debito-naranja.png']?.id,
      shortDescription:
        'Dispone de los fondos de tu cuenta bancaria en todo momento a través de la Tarjeta de Débito AVANZ',
      description:
        'Aprovecha los mejores beneficios de tu Tarjeta de Débito. Obtienes mayor seguridad al no portar dinero y disponibilidad de tu efectivo 24 horas los 365 días del año. Nuestra tarjeta de débito cuenta con un chip inteligente.',
      features: f([
        'Retiro de efectivo las 24 horas, los 365 días del año.',
        'Acceso a cajeros automáticos a nivel nacional e internacional.',
        'Realizar pagos y compras a través POS de comercios afiliados sin intereses ni comisiones.',
      ]),
      benefits: f([
        'Retirar efectivo las 24 horas del día, los 365 días del año.',
        'Mayor seguridad al no portar dinero en efectivo.',
        'Tarjeta con chip inteligente.',
      ]),
      requirements: f(['Asociada a una cuenta bancaria, ya sea corriente o de ahorro.']),
    },
    {
      name: 'Tarjeta de Crédito Clásica',
      slug: 'tarjeta-de-credito-clasica',
      category: 'tarjeta',
      audience: 'personas',
      order: 2,
      shortDescription: 'Con nosotros... ¡Tus hábitos te recompensan!',
      description:
        'Para vos que buscas algo diferente, porque somos distintos. Elige tu recompensa: Programa de Puntos, Cash Back o Tasa Preferencial.',
      features: f([
        'Nosotros premiamos tus hábitos de consumo.',
        'Te ofrecemos diferentes fechas de pago que se ajustan a tu realidad.',
        'Disfrutá la experiencia de diseñar tu tarjeta a tu medida.',
      ]),
      benefits: f([
        '1.25 puntos por cada dólar de compra en todos los comercios.',
        '2.5 puntos por cada dólar de compra en comercios seleccionados por vos.',
        'Bono de bienvenida: 5,000 puntos (por consumo $750 los primeros 60 días).',
      ]),
    },
    {
      name: 'Tarjeta de Crédito Gold',
      slug: 'tarjeta-de-credito-gold',
      category: 'tarjeta',
      audience: 'personas',
      order: 3,
      shortDescription: 'Con nosotros... ¡Tus hábitos te recompensan!',
      description:
        'Para vos que buscas algo diferente, porque somos distintos. Elige tu recompensa: Programa de Puntos, Cash Back o Tasa Preferencial.',
      features: f([
        'Nosotros premiamos tus hábitos de consumo.',
        'Te ofrecemos diferentes fechas de pago que se ajustan a tu realidad.',
        'Disfrutá la experiencia de diseñar tu tarjeta a tu medida.',
      ]),
      benefits: f([
        'Regalo de bienvenida: 5,000 puntos por consumo USD 750 los primeros 60 días.',
        '2.5 puntos por cada dólar de compra en comercios elegidos por vos.',
        '1.25 puntos por cada dólar de compra en otros comercios.',
      ]),
    },
    {
      name: 'Tarjeta de Crédito Signature',
      slug: 'tarjeta-de-credito-signature',
      category: 'tarjeta',
      audience: 'personas',
      order: 4,
      shortDescription: 'Con nosotros... ¡Tus hábitos te recompensan!',
      description:
        'Acumulá beneficios en todas tus compras del mes. Elegí acumular doble beneficio en los comercios donde realizás tus compras mensuales habituales.',
      features: f([
        'Nosotros premiamos tus hábitos de consumo.',
        'Te ofrecemos diferentes fechas de pago que se ajustan a tu realidad.',
        'Acceso al salón VIP del Aeropuerto de Managua.',
      ]),
      benefits: f([
        '1.50 puntos por cada dólar de compra en todos los comercios.',
        '3 puntos por cada dólar de compra en comercios seleccionados por vos.',
        'Bono de bienvenida: 6,500 puntos (por consumo $5,000 los primeros 60 días).',
      ]),
    },

    // ——— Créditos Personas ———
    {
      name: 'Crédito Personal',
      slug: 'credito-personal',
      category: 'credito',
      audience: 'personas',
      order: 1,
      shortDescription: 'Llevá a cabo tus metas solicitando un Crédito Personal, rápido y fácil.',
      description:
        'Si querés condiciones preferenciales y tenés ahorros o inversiones con nosotros, te ofrecemos un back to back, con cuotas mensuales o al vencimiento, ¡vos decidís! ¡AVANZ hace que obtener un préstamo personal sea rápido y sencillo!',
      benefits: f([
        'Acceso abierto: Asalariados y no asalariados, ¡todos pueden aplicar!',
        'Rapidez en la aprobación: Obtén una respuesta en un máximo de 7 días.',
        'Antigüedad flexible: Asalariados, solo necesitas 6 meses de trabajo; no asalariados, 12 meses de historial crediticio.',
        'Pago fácil: Realiza tus pagos en comercios afiliados, a través de la aplicación móvil, e-banking o en nuestras sucursales a nivel nacional.',
        'Seguro personalizado: Elige cualquier compañía de seguros autorizada en el país.',
        'Crédito Back to Back: Obtén hasta el 100% del valor de tu Certificado de Depósito a Plazo Fijo.',
      ]),
      requirements: f(['Edad entre 21 y 65 años.', 'Cédula de identidad.', 'Cuenta activa en AVANZ.']),
    },
    {
      name: 'Crédito para Vivienda',
      slug: 'credito-de-vivienda',
      category: 'credito',
      audience: 'personas',
      order: 2,
      shortDescription:
        'Te financiamos la casa de tus sueños para que la construyás, la comprés o la remodelés como querrás.',
      description:
        'Te financiamos la casa de tus sueños para que la construyás como querrás, la comprés cuando querrás o la remodelés como querrás. Te ofrecemos diferentes plazos.',
      benefits: f([
        'Rapidez en la aprobación: Obtén una respuesta en un máximo de 7 días.',
        'Plazos flexibles adaptados a tus posibilidades.',
        'Pago fácil: Realiza tus pagos a través de la aplicación móvil, e-banking o en nuestras sucursales.',
        'Seguro personalizado: Elige cualquier compañía de seguros autorizada en el país.',
      ]),
    },
    {
      name: 'Crédito AutoAvanz',
      slug: 'credito-autoavanz',
      category: 'credito',
      audience: 'personas',
      order: 3,
      shortDescription: '¡Obtén tu Crédito de Vehículo hoy mismo y maneja tus sueños hacia la realidad!',
      description:
        '¡Si podés imaginarlo, nosotros podemos financiarlo! Elegí tu carro ideal, financialo con nosotros y conducilo hacia donde querrás. Ponemos a tu disposición asesoramiento personalizado, para que tu trámite sea ágil.',
      benefits: f([
        'Personas naturales mayores de 18 años y jurídicas con más de un año operando pueden aplicar.',
        'Hasta 72 meses para vehículos nuevos y 60 meses para usados.',
        'La prima puede ser desde el 20% para vehículos nuevos y desde el 30% para usados.',
        'Si no tienes la prima completa, podemos ajustarnos a tus posibilidades y ofrecerte otras garantías.',
        'Realiza tus pagos a través de nuestro e-Banking y App Avanz Móvil.',
      ]),
    },

    // ——— Seguros Personas ———
    {
      name: 'Seguro de Vida sobre tu Saldo Deudor (SVSD)',
      slug: 'seguro-vida-saldo-deudor',
      category: 'seguro',
      audience: 'personas',
      order: 1,
      shortDescription:
        'Protege a tu familia con nuestro Seguro de Vida Saldo Deudor: en caso de fallecimiento, el saldo de tu deuda queda cubierto.',
    },
    {
      name: 'Seguro de Protección Contra Robo y Fraude (PRF)',
      slug: 'seguro-proteccion-robo-fraude',
      category: 'seguro',
      audience: 'personas',
      order: 2,
      shortDescription:
        'Mantén tu tranquilidad con el Seguro de Protección contra Robo y Fraude para tus tarjetas Avanz.',
    },
    {
      name: 'Seguro de Responsabilidad Civil Obligatorio (RCO)',
      slug: 'seguro-responsabilidad-civil-obligatorio',
      category: 'seguro',
      audience: 'personas',
      order: 3,
      shortDescription:
        'Cumple con la ley y protege a terceros con el Seguro de Responsabilidad Civil Obligatorio para tu vehículo.',
    },
    {
      name: 'Seguro Responsabilidad Civil con Matrícula Extranjera (RCE)',
      slug: 'seguro-responsabilidad-civil-matricula-extranjera',
      category: 'seguro',
      audience: 'personas',
      order: 4,
      shortDescription:
        'Seguro de Responsabilidad Civil para vehículos con matrícula extranjera que circulan en el país.',
    },
    {
      name: 'Seguro de Accidentes Personales de Transporte (APT)',
      slug: 'seguro-accidentes-personales-transporte',
      category: 'seguro',
      audience: 'personas',
      order: 5,
      shortDescription:
        'Protección ante accidentes personales de transporte, para viajar con tranquilidad.',
    },

    // ——— Transferencias Personas ———
    {
      name: 'Transferencias entre cuentas AVANZ',
      slug: 'transferencias-internas',
      category: 'transferencia',
      audience: 'personas',
      order: 1,
      shortDescription:
        'Realizá transferencias internas entre cuentas AVANZ al instante y sin costo desde e-Banking o Avanz Móvil.',
    },
    {
      name: 'Transferencias ACH',
      slug: 'transferencias-ach',
      category: 'transferencia',
      audience: 'personas',
      order: 2,
      shortDescription:
        'Enviá dinero a cuentas de otros bancos del país a través de la red ACH, de forma segura y rápida.',
    },
    {
      name: 'Transferencias Interbancarias (TEF)',
      slug: 'transferencias-interbancarias-tef',
      category: 'transferencia',
      audience: 'personas',
      order: 3,
      shortDescription: 'Transferencias electrónicas de fondos entre bancos nacionales.',
    },
    {
      name: 'Transferencias Internacionales (Swift)',
      slug: 'transferencias-internacionales-swift',
      category: 'transferencia',
      audience: 'personas',
      order: 4,
      shortDescription:
        'Enviá y recibí dinero desde cualquier parte del mundo a través de la red Swift.',
    },
    {
      name: 'Transferencias AvanzTrans',
      slug: 'transferencias-avanztrans',
      category: 'transferencia',
      audience: 'personas',
      order: 5,
      shortDescription: 'Nuestro servicio de transferencias AvanzTrans, rápido y confiable.',
    },
    {
      name: 'Transferencias a otros Bancos (SIP)',
      slug: 'transferencias-sip',
      category: 'transferencia',
      audience: 'personas',
      order: 6,
      shortDescription:
        'Transferencias inmediatas a otros bancos a través del Sistema Interbancario de Pagos (SIP).',
    },
    {
      name: 'Código AVANZ',
      slug: 'codigo-avanz',
      category: 'transferencia',
      audience: 'personas',
      order: 7,
      shortDescription:
        'Retirá y enviá dinero con un código seguro, sin necesidad de tarjeta.',
    },

    // ——— Otros Servicios Personas ———
    {
      name: 'Pago de servicios e impuestos',
      slug: 'pago-de-servicios-e-impuestos',
      category: 'servicio',
      audience: 'personas',
      order: 1,
      shortDescription:
        'Pagá tus servicios básicos e impuestos desde e-Banking, Avanz Móvil o nuestras sucursales.',
    },
    {
      name: 'Mesa de Cambio',
      slug: 'mesa-de-cambio',
      category: 'servicio',
      audience: 'personas',
      order: 2,
      shortDescription:
        'Comprá y vendé divisas con tasas competitivas en nuestra Mesa de Cambio.',
    },
    {
      name: 'Garantías bancarias',
      slug: 'garantias-bancarias',
      category: 'servicio',
      audience: 'personas',
      order: 3,
      shortDescription:
        'Respaldá tus compromisos comerciales con nuestras garantías bancarias.',
    },

    // ——— Empresas ———
    {
      name: 'Cuenta Corriente Empresarial',
      slug: 'cuenta-corriente-empresarial',
      category: 'cuenta',
      audience: 'empresas',
      order: 1,
      shortDescription:
        'Consolida todas tus necesidades financieras de tu empresa en un solo lugar. Con AVANZ, tus finanzas corporativas son más eficientes y rentables que nunca.',
      description:
        'Diseñada eficientemente para que en un solo producto, consolides todas tus gestiones y goces de máximos beneficios. Con AVANZ, tu cuenta corriente empresarial se convierte en tu aliada para el éxito empresarial.',
      benefits: f([
        'Gestión de nómina sin complicaciones: Facilitamos el pago de planillas para tu equipo.',
        'Máxima seguridad en tus transacciones: Confía en nuestro servicio de traslado de valores.',
        'Versatilidad en monedas: Disponible en córdobas y dólares para tu comodidad.',
        'Intereses atractivos en aumento: Te ofrecemos una tasa de interés escalonada que crece con tu saldo.',
        'Gana más cada mes: Capitalizamos tus intereses mensualmente, maximizando tus ganancias.',
        'Libertad financiera total: Sin límites en cheques, retiros o depósitos.',
      ]),
    },
    {
      name: 'Tarjeta de Crédito Business',
      slug: 'tarjeta-de-credito-business',
      category: 'tarjeta',
      audience: 'empresas',
      order: 1,
      shortDescription:
        'Descubre una manera inteligente de financiar tu negocio con nuestra Tarjeta Business.',
      description:
        'Recibí los mejores beneficios para tu negocio: la mejor tasa preferencial, estados de cuenta consolidados y financiamiento de corto plazo.',
      features: f([
        'Recibí la mejor tasa preferencial para tu negocio.',
        'Optimiza tus finanzas con estados de cuenta consolidados.',
        'Financiamiento de corto plazo para tu negocio.',
        'Obtén más beneficios Visa al viajar.',
      ]),
      benefits: f([
        'Protege a tu familia con nuestro Seguro de Vida Saldo Deudor (SVSD).',
        'Mantén tu tranquilidad con el Seguro de Protección contra Robo y Fraude (PRF).',
        'Accede a efectivo fácilmente en cajeros automáticos (ATM).',
        'Servicio de emergencia médica internacional de hasta USD 5,000 al pagar tus boletos de viaje con tu Tarjeta Business.',
        'Mantente informado en todo momento con nuestras notificaciones por SMS.',
        '¡Beneficio especial! Anualidad gratis para el titular y los adicionales durante el primer año.',
      ]),
    },
    {
      name: 'Línea de Crédito Empresarial',
      slug: 'linea-de-credito-empresarial',
      category: 'credito',
      audience: 'empresas',
      order: 1,
      shortDescription:
        'Financiamiento revolvente para el capital de trabajo de tu empresa, disponible cuando lo necesités.',
    },
    {
      name: 'Crédito Empresarial',
      slug: 'credito-empresarial',
      category: 'credito',
      audience: 'empresas',
      order: 2,
      shortDescription:
        'Impulsá el crecimiento de tu empresa con financiamiento a la medida de tus proyectos.',
    },
    {
      name: 'Crédito Agropecuario',
      slug: 'credito-agropecuario',
      category: 'credito',
      audience: 'empresas',
      order: 3,
      shortDescription:
        'Financiamiento especializado para el sector agropecuario: siembra, cosecha, ganadería y equipos.',
    },
    {
      name: 'Pago de planilla',
      slug: 'pago-de-planilla',
      category: 'servicio',
      audience: 'empresas',
      order: 1,
      shortDescription:
        'Simplificá el pago de nómina de tu equipo con nuestro servicio de pago de planilla.',
    },
  ];

  for (const product of products) {
    await strapi.documents('api::product.product').create({
      data: product,
      status: 'published',
    });
  }
}

async function seedArticles(strapi: Core.Strapi, media: MediaMap) {
  const articles: any[] = [
    {
      title: 'Desentrañando las Modalidades de Fraude Bancario: Protegiéndote en el Mundo Digital',
      slug: 'desentranando-las-modalidades-de-fraude-bancario',
      date: '2023-11-17',
      category: 'tips-de-seguridad',
      image: media['news-fraude-bancario.jpg']?.id,
      excerpt:
        'Conoce las modalidades de fraude bancario más comunes y cómo protegerte en el mundo digital.',
      content:
        'Conoce las modalidades de fraude bancario más comunes y cómo protegerte en el mundo digital. En Avanz trabajamos para mantener tu información siempre segura.',
    },
    {
      title: 'Información importante para evitar los fraudes bancarios en línea',
      slug: 'informacion-importante-para-evitar-los-fraudes-bancarios-en-linea',
      date: '2023-11-17',
      category: 'tips-de-seguridad',
      excerpt:
        'Recomendaciones clave para evitar los fraudes bancarios en línea y proteger tus cuentas.',
      content:
        'Recomendaciones clave para evitar los fraudes bancarios en línea y proteger tus cuentas. Nunca compartas tus credenciales y verificá siempre los sitios donde ingresás tus datos.',
    },
    {
      title: 'Banco Avanz innovando con inteligencia artificial',
      slug: 'banco-avanz-innovando-con-inteligencia-artificial',
      date: '2023-10-13',
      category: 'corporativo',
      excerpt:
        'Somos Avanz, tu banco fácil: innovamos con inteligencia artificial para servirte mejor.',
      content:
        'Somos Avanz, tu banco fácil: innovamos con inteligencia artificial para servirte mejor y llevar tu banco a tus manos.',
    },
  ];

  for (const article of articles) {
    await strapi.documents('api::article.article').create({
      data: article,
      status: 'published',
    });
  }
}

async function seedPromotions(strapi: Core.Strapi) {
  const promotions = [
    {
      title: 'En todos los cines del país 30% de descuento',
      description: 'Pagá con tus tarjetas de crédito Avanz del 17 al 20 de agosto.',
    },
    {
      title: 'Realizá todas tus transacciones desde Avanz Móvil o e-Banking',
      description: 'Realiza transferencias y maneja tus cuentas las 24 horas del día.',
    },
  ];

  for (const promotion of promotions) {
    await strapi.documents('api::promotion.promotion').create({
      data: promotion,
      status: 'published',
    });
  }
}

async function seedPages(strapi: Core.Strapi, media: MediaMap) {
  // ——— Home (Personas) ———
  await strapi.documents('api::page.page').create({
    data: {
      title: 'Inicio',
      slug: 'inicio',
      sections: [
        {
          __component: 'sections.hero',
          kicker: 'BIENVENIDO A AVANZ',
          title: 'Tu banco fácil',
          subtitle: 'Inspirados en la innovación\nponemos tu banco en tus manos',
          image: media['hero-personas.jpg']?.id,
          buttons: [],
        },
        {
          __component: 'sections.section-heading',
          kicker: 'BIENVENIDO A AVANZ',
          title: 'Hola, ¿Qué necesitas hacer hoy?',
          subtitle: 'Ponemos a disposición productos y servicios a tu medida',
          align: 'center',
        },
        {
          __component: 'sections.product-links',
          items: [
            { prefix: 'Aperturar una', label: 'Cuenta', url: '/cuentas', icon: media['ql-icon-cuenta.svg']?.id },
            { prefix: 'Solicitar una', label: 'Tarjeta', url: '/tarjetas', icon: media['ql-icon-tarjeta.svg']?.id },
            { prefix: 'Solicitar un', label: 'Crédito', url: '/creditos', icon: media['ql-icon-credito.svg']?.id },
            { prefix: 'Adquirir un', label: 'Seguro', url: '/seguros', icon: media['ql-icon-seguro.svg']?.id },
          ],
        },
        {
          __component: 'sections.channels-converter',
          title: 'Conocé nuestros canales de atención',
          buttonLabel: 'Conocé más',
          buttonUrl: '/canales-de-atencion',
          icon: media['canales-icon.svg']?.id,
        },
        {
          __component: 'sections.section-heading',
          title: 'Te brindamos las mejores soluciones',
          align: 'left',
        },
        {
          __component: 'sections.feature-banner',
          kicker: 'AVANZÁ TUS FINANZAS',
          title: 'Aprendé sobre Educación Financiera',
          description: 'Aprende cómo mejorar tu economía personal y familiar.',
          buttonLabel: 'Aprendé más',
          buttonUrl: '/educacion-financiera',
          illustration: media['edu-illustration.svg']?.id,
          variant: 'orange',
        },
        {
          __component: 'sections.news-list',
          heading: 'Noticias Avanz',
          limit: 3,
        },
        {
          __component: 'sections.feature-banner',
          kicker: 'TIPS DE SEGURIDAD',
          title: 'Tu información siempre segura',
          description: 'Conoce nuestras recomendaciones de seguridad.',
          buttonLabel: 'Leer más',
          buttonUrl: '/tips-de-seguridad',
          illustration: media['tips-illustration.svg']?.id,
          variant: 'teal',
        },
        {
          __component: 'sections.info-cards',
          heading: '',
          cards: [
            {
              title: 'Bienes en venta',
              description: 'Encuentra los bienes adjudicados que actualmente tenemos en venta.',
              linkLabel: 'Conocé más',
              linkUrl: '/bienes-en-venta',
              image: media['info-icon-bienes.svg']?.id,
            },
            {
              title: 'Únete a nuestro equipo',
              description: 'Completa nuestro Programa de Aprendizaje Bancario y forma parte de Avanz.',
              linkLabel: 'Conocé más',
              linkUrl: '/trabaja-con-nosotros',
              image: media['info-icon-equipo.svg']?.id,
            },
            {
              title: 'Información regulatoria',
              description: 'Trabajamos con ética, honestidad y transparencia.',
              linkLabel: 'Conocé más',
              linkUrl: '/informacion-regulatoria',
              image: media['info-icon-regulatoria.svg']?.id,
            },
          ],
        },
      ],
      seo: {
        metaTitle: 'Banco Avanz — Tu banco fácil',
        metaDescription: 'Inspirados en la innovación ponemos tu banco en tus manos.',
      },
    },
    status: 'published',
  });

  // ——— Empresas ———
  await strapi.documents('api::page.page').create({
    data: {
      title: 'Empresas',
      slug: 'empresas',
      sections: [
        {
          __component: 'sections.hero',
          kicker: 'BIENVENIDO A AVANZ',
          title: 'Tu socio financiero empresarial',
          subtitle: 'Consolida todas las necesidades financieras de tu empresa en un solo lugar',
          image: media['hero-personas.jpg']?.id,
          buttons: [],
        },
        {
          __component: 'sections.section-heading',
          title: 'Productos para tu empresa',
          align: 'center',
        },
        { __component: 'sections.product-grid', heading: 'Cuentas', category: 'cuenta', audience: 'empresas' },
        { __component: 'sections.product-grid', heading: 'Tarjetas', category: 'tarjeta', audience: 'empresas' },
        { __component: 'sections.product-grid', heading: 'Préstamos', category: 'credito', audience: 'empresas' },
        { __component: 'sections.product-grid', heading: 'Otros Servicios', category: 'servicio', audience: 'empresas' },
      ],
      seo: {
        metaTitle: 'Empresas | Banco Avanz',
        metaDescription: 'Soluciones financieras para tu empresa.',
      },
    },
    status: 'published',
  });

  // ——— Páginas institucionales y de contenido ———
  const simplePages: {
    title: string;
    slug: string;
    body: string;
  }[] = [
    {
      title: 'Sobre nosotros',
      slug: 'sobre-nosotros',
      body: 'Somos Banco Avanz, de Grupo Pellas. Trabajamos con ética, honestidad y transparencia.\n\nConocé más sobre nuestra misión, visión y valores, nuestra transparencia bancaria e información regulatoria.',
    },
    {
      title: '¿Quiénes somos?',
      slug: 'quienes-somos',
      body: 'Misión, Visión y Valores de Banco Avanz.\n\nInspirados en la innovación, ponemos tu banco en tus manos. Nuestros líderes trabajan cada día para brindarte productos y servicios a tu medida.',
    },
    {
      title: 'Transparencia Bancaria',
      slug: 'transparencia-bancaria',
      body: 'Estados Financieros Auditados, Gestión de Riesgo y Calificación de Riesgo.\n\nPonemos a tu disposición la información financiera de Banco Avanz.',
    },
    {
      title: 'Trabaja con Nosotros',
      slug: 'trabaja-con-nosotros',
      body: 'Únete a nuestro equipo. Completa nuestro Programa de Aprendizaje Bancario y forma parte de Avanz.',
    },
    {
      title: 'Información Regulatoria',
      slug: 'informacion-regulatoria',
      body: 'Nuestras tarifas, Avanz informa, Regulación tributaria y FOGADE.\n\nTrabajamos con ética, honestidad y transparencia.',
    },
    {
      title: 'Información Financiera',
      slug: 'informacion-financiera',
      body: 'Estados financieros auditados y demás información financiera de Banco Avanz.',
    },
    {
      title: 'Soluciones Digitales',
      slug: 'soluciones-digitales',
      body: 'Avanz Móvil, e-banking y Avanz Token.\n\nRealiza transferencias y maneja tus cuentas las 24 horas del día desde donde estés.',
    },
    {
      title: 'Canales de atención',
      slug: 'canales-de-atencion',
      body: 'Zona Digital, WhatsApp, Sucursal Telefónica, Sucursales, Cajeros automáticos (ATM), PuntoXpress, BancaRed y Punto Fácil.\n\nSucursal telefónica: 2223 7676. Avenida Jean Paul Genie, Edificio Avanz.',
    },
    {
      title: 'Zona Digital',
      slug: 'zona-digital',
      body: 'Gestioná tu banco desde cualquier lugar con Avanz Móvil, e-Banking y Avanz Token.',
    },
    {
      title: 'Ayuda',
      slug: 'ayuda',
      body: 'Tips de seguridad, Educación financiera y Sugerencias y reclamos.\n\nEstamos para ayudarte: llamá a nuestra sucursal telefónica 2223 7676.',
    },
    {
      title: 'Educación Financiera',
      slug: 'educacion-financiera',
      body: 'Aprende cómo mejorar tu economía personal y familiar con nuestros contenidos de educación financiera.',
    },
    {
      title: 'Tips de Seguridad',
      slug: 'tips-de-seguridad',
      body: 'Tu información siempre segura. Conoce nuestras recomendaciones de seguridad para proteger tus cuentas y tarjetas.',
    },
    {
      title: 'Bienes en venta',
      slug: 'bienes-en-venta',
      body: 'Encuentra los bienes adjudicados que actualmente tenemos en venta.',
    },
  ];

  for (const page of simplePages) {
    await strapi.documents('api::page.page').create({
      data: {
        title: page.title,
        slug: page.slug,
        sections: [{ __component: 'sections.rich-text', body: page.body }],
        seo: { metaTitle: `${page.title} | Banco Avanz` },
      },
      status: 'published',
    });
  }
}
