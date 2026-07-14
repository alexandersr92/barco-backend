import type { Core } from '@strapi/strapi';
import * as fs from 'fs';
import * as path from 'path';

// Seed inicial con el contenido del diseño de Figma "Avanz Website".
// Idempotente: solo corre si la base está vacía (no hay productos).
export async function seed(strapi: Core.Strapi) {
  const existing = await strapi.documents('api::product.product').count({});
  if (existing > 0) return;

  strapi.log.info('🌱 Sembrando contenido inicial AVANZ...');

  const media = await uploadAssets(strapi);

  await seedGlobal(strapi);
  await seedProducts(strapi, media);
  await seedArticles(strapi);
  await seedPromotions(strapi);
  await seedHomePage(strapi, media);

  strapi.log.info('✅ Seed AVANZ completado');
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

async function seedGlobal(strapi: Core.Strapi) {
  const cuentasLinks = [
    { label: 'Cuenta Corriente', url: '/productos/cuenta-corriente' },
    { label: 'Cuenta Naranja', url: '/productos/cuenta-naranja' },
    { label: 'Plan ProAhorro', url: '/productos/cuenta-plan-proahorro' },
    { label: 'Cuenta MiChanchito', url: '/productos/cuenta-michanchito' },
    { label: 'Cuenta MiAhorro', url: '/productos/cuenta-miahorro' },
    { label: 'Cuenta Ahorro Tradicional', url: '/productos/cuenta-ahorro-tradicional' },
    { label: 'Cuenta ProActiva', url: '/productos/cuenta-proactiva' },
    { label: 'Depósito a Plazo Fijo', url: '/productos/deposito-a-plazo-fijo' },
  ];

  await strapi.documents('api::global.global').create({
    data: {
      siteName: 'Banco Avanz',
      ebankingUrl: 'https://ebanking.avanzbanc.com',
      topNav: [
        { label: 'Personas', url: '/' },
        { label: 'Empresas', url: '/empresas' },
        { label: 'Sobre nosotros', url: '/sobre-nosotros' },
        { label: 'Noticias', url: '/noticias' },
        { label: 'Promociones', url: '/promociones' },
      ],
      mainNav: [
        { label: 'Cuentas', url: '/cuentas', links: cuentasLinks },
        {
          label: 'Tarjetas',
          url: '/tarjetas',
          links: [
            { label: 'Tarjeta de Débito', url: '/productos/tarjeta-de-debito' },
            { label: 'Tarjeta de Crédito Clásica', url: '/productos/tarjeta-de-credito-clasica' },
            { label: 'Tarjeta de Crédito Gold', url: '/productos/tarjeta-de-credito-gold' },
            { label: 'Tarjeta de Crédito Signature', url: '/productos/tarjeta-de-credito-signature' },
          ],
        },
        {
          label: 'Créditos',
          url: '/creditos',
          links: [
            { label: 'Crédito Personal', url: '/productos/credito-personal' },
            { label: 'Crédito de Vivienda', url: '/productos/credito-de-vivienda' },
            { label: 'Crédito AutoAvanz', url: '/productos/credito-autoavanz' },
          ],
        },
        { label: 'Canales de atención', url: '/canales-de-atencion', links: [] },
        { label: 'Zona digital', url: '/zona-digital', links: [] },
      ],
      footerColumns: [
        {
          title: 'Acerca de avanz',
          links: [
            { label: '¿Quiénes somos?', url: '/sobre-nosotros' },
            { label: 'Información Regulatoria', url: '/informacion-regulatoria' },
            { label: 'Información Financiera', url: '/informacion-financiera' },
            { label: 'Trabaja con Nosotros', url: '/trabaja-con-nosotros' },
            { label: 'Contacto', url: '/canales-de-atencion' },
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
      requirements: f([
        'Edad entre 21 y 65 años.',
        'Cédula de identidad.',
        'Cuenta activa en AVANZ.',
      ]),
    },
    {
      name: 'Crédito de Vivienda',
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
      shortDescription:
        '¡Obtén tu Crédito de Vehículo hoy mismo y maneja tus sueños hacia la realidad!',
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
  ];

  for (const product of products) {
    await strapi.documents('api::product.product').create({
      data: product,
      status: 'published',
    });
  }
}

async function seedArticles(strapi: Core.Strapi) {
  const articles = [
    {
      title: 'Banco Avanz presente en Congreso Médico 2023',
      slug: 'banco-avanz-presente-en-congreso-medico-2023',
      date: '2023-06-16',
      excerpt:
        'Banco Avanz presente en el Congreso Médico 2023 del Hospital Vivian Pellas. Visitanos este sábado 17 de junio.',
      content:
        'Banco Avanz presente en el Congreso Médico 2023 del Hospital Vivian Pellas. Visitanos este sábado 17 de junio.',
    },
    {
      title: 'En Avanz conmemoramos el día de la mujer',
      slug: 'en-avanz-conmemoramos-el-dia-de-la-mujer',
      date: '2023-03-08',
      excerpt:
        'En Avanz conmemoramos el día internacional de la mujer agradeciendo el compromiso de las líderes con resultados.',
      content:
        'En Avanz conmemoramos el día internacional de la mujer agradeciendo el compromiso de las líderes con resultados.',
    },
    {
      title: 'Avanz presente en ANDIVA Motorshow 2022',
      slug: 'avanz-presente-en-andiva-motorshow-2022',
      date: '2022-11-19',
      excerpt:
        'Somos Avanz y te esperamos en ANDIVA Motorshow 2022 con las mejores condiciones de crédito, preaprobado inmediato.',
      content:
        'Somos Avanz y te esperamos en ANDIVA Motorshow 2022 con las mejores condiciones de crédito, preaprobado inmediato.',
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

async function seedHomePage(strapi: Core.Strapi, media: MediaMap) {
  await strapi.documents('api::page.page').create({
    data: {
      title: 'Inicio',
      slug: 'inicio',
      sections: [
        {
          __component: 'sections.hero',
          kicker: 'BIENVENIDO A AVANZ',
          title: 'Hola, ¿Qué necesitas hacer hoy?',
          subtitle: 'Ponemos a disposición productos y servicios a tu medida',
          buttons: [
            { label: 'Conocé nuestros productos', url: '/cuentas', variant: 'primary' },
          ],
        },
        {
          __component: 'sections.channels-bar',
          text: 'Conocé nuestros canales de atención',
          linkLabel: 'Ver canales',
          linkUrl: '/canales-de-atencion',
        },
        {
          __component: 'sections.product-showcase',
          heading: 'Tarjeta de débito',
          description:
            'Dispone de los fondos de tu cuenta bancaria en todo momento a través de la Tarjeta de Débito AVANZ',
          features: [
            { text: 'Retiro de efectivo las 24 horas, los 365 días del año.' },
            { text: 'Acceso a cajeros automáticos a nivel nacional e internacional.' },
            { text: 'Realizar pagos y compras a través POS de comercios afiliados sin intereses ni comisiones.' },
          ],
          photo: media['debito-persona.jpg']?.id,
          cardImage: media['tarjeta-debito-naranja.png']?.id,
          buttons: [
            { label: 'Solicitala aqui', url: '/productos/tarjeta-de-debito', variant: 'primary' },
            { label: 'Ver más detalles', url: '/productos/tarjeta-de-debito', variant: 'link' },
          ],
          imageLeft: true,
        },
        {
          __component: 'sections.promotions-list',
          heading: '¡Entérate de las promociones que Avanz tiene para vos!',
          limit: 2,
        },
        {
          __component: 'sections.news-list',
          heading: 'Noticias Avanz',
          limit: 3,
        },
        {
          __component: 'sections.app-banner',
          title: 'Descargá Avanz Móvil',
          description: 'Realiza transferencias y maneja tus cuentas las 24 horas del día',
          appStoreUrl: 'https://apps.apple.com',
          playStoreUrl: 'https://play.google.com',
        },
        {
          __component: 'sections.info-cards',
          heading: 'Te brindamos las mejores soluciones',
          cards: [
            {
              kicker: 'AVANZÁ TUS FINANZAS',
              title: 'Aprendé sobre Educación Financiera',
              description: 'Aprende cómo mejorar tu economía personal y familiar.',
              linkLabel: 'Conocé más',
              linkUrl: '/educacion-financiera',
            },
            {
              kicker: 'TIPS DE SEGURIDAD',
              title: 'Tu información siempre segura',
              description: 'Conoce nuestras recomendaciones de seguridad.',
              linkLabel: 'Leer más',
              linkUrl: '/tips-de-seguridad',
            },
            {
              title: 'Bienes en venta',
              description: 'Encuentra los bienes adjudicados que actualmente tenemos en venta.',
              linkLabel: 'CONOCÉ MÁS',
              linkUrl: '/bienes-en-venta',
            },
            {
              title: 'Únete a nuestro equipo',
              description: 'Completa nuestro Programa de Aprendizaje Bancario y forma parte de Avanz.',
              linkLabel: 'CONOCÉ MÁS',
              linkUrl: '/trabaja-con-nosotros',
            },
            {
              title: 'Información regulatoria',
              description: 'Trabajamos con ética, honestidad y transparencia.',
              linkLabel: 'Conocé más',
              linkUrl: '/informacion-regulatoria',
            },
          ],
        },
      ],
      seo: {
        metaTitle: 'Banco Avanz — Hola, ¿Qué necesitas hacer hoy?',
        metaDescription: 'Ponemos a disposición productos y servicios a tu medida.',
      },
    },
    status: 'published',
  });
}
