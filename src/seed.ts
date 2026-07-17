import type { Core } from '@strapi/strapi';
import * as fs from 'fs';
import * as path from 'path';

// Seed versionado con el contenido del diseño de Figma "Avanz Website" y su sitemap.
// v2: contenido base (solo con base vacía). v3: detalle de productos (migración in-place).
const SEED_VERSION = 16;

// Migración v16: contenido real scrapeado de avanzbanc.com
// (scripts/real-content.json, generado por el scraper). Reemplaza los textos
// placeholder de productos y canales conservando las fotos existentes, sube
// foto solo a los que no tenían, crea lo que faltaba (Crédito Verde, Cuenta de
// Ahorro empresarial, canal Avanz Token) y carga los líderes reales (Junta
// Directiva, Dignatarios y Vigilante, Principales Ejecutivos).
async function migrateV16(strapi: Core.Strapi) {
  const contentPath = path.join(__dirname, '..', '..', 'scripts', 'real-content.json');
  if (!fs.existsSync(contentPath)) {
    strapi.log.warn('migrateV16: scripts/real-content.json no existe, se omite');
    return;
  }
  const rc = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

  const media = await uploadAssets(
    strapi,
    [...rc.products, ...rc.newProducts, ...rc.newChannels]
      .map((r: any) => r.imageFile)
      .filter(Boolean),
  );

  // Productos existentes: texto real; foto solo si no tenía.
  for (const p of rc.products) {
    const existing = await strapi.documents('api::product.product').findFirst({
      filters: { slug: p.slug },
      populate: { photo: true },
    });
    if (!existing) {
      strapi.log.warn(`migrateV16: producto "${p.slug}" no encontrado`);
      continue;
    }
    const data: Record<string, unknown> = {
      shortDescription: p.shortDescription,
      description: p.description,
    };
    if (p.features?.length) data.features = p.features.map((text: string) => ({ text }));
    if (!existing.photo && p.imageFile && media[p.imageFile])
      data.photo = media[p.imageFile].id;
    await strapi.documents('api::product.product').update({
      documentId: existing.documentId,
      data,
      status: 'published',
    });
  }

  // Productos nuevos.
  for (const p of rc.newProducts) {
    const exists = await strapi
      .documents('api::product.product')
      .findFirst({ filters: { slug: p.slug } });
    if (exists) continue;
    await strapi.documents('api::product.product').create({
      data: {
        name: p.name,
        slug: p.slug,
        category: p.category,
        audience: p.audience,
        shortDescription: p.shortDescription,
        description: p.description,
        features: (p.features ?? []).map((text: string) => ({ text })),
        photo: p.imageFile ? media[p.imageFile]?.id : undefined,
        order: 90,
      },
      status: 'published',
    });
  }

  // Canales: texto real (conservan su imagen).
  for (const c of rc.channels) {
    const existing = await strapi
      .documents('api::channel.channel')
      .findFirst({ filters: { slug: c.slug } });
    if (!existing) continue;
    await strapi.documents('api::channel.channel').update({
      documentId: existing.documentId,
      data: {
        description: c.description,
        features: (c.features ?? []).map((text: string) => ({ text })),
      },
      status: 'published',
    });
  }
  for (const c of rc.newChannels) {
    const exists = await strapi
      .documents('api::channel.channel')
      .findFirst({ filters: { slug: c.slug } });
    if (exists) continue;
    await strapi.documents('api::channel.channel').create({
      data: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        features: (c.features ?? []).map((text: string) => ({ text })),
        image: c.imageFile ? media[c.imageFile]?.id : undefined,
        buttonLabel: 'Conocé más',
        buttonUrl: '#',
        buttonIcon: 'none',
        order: 9,
      },
      status: 'published',
    });
  }

  // Líderes reales en la página Sobre Avanz: se reemplaza solo la sección
  // sections.leaders re-enviando la dynamic zone completa normalizada
  // (Strapi reemplaza toda la zona en cada update).
  const page = await strapi.documents('api::page.page').findFirst({
    filters: { slug: 'inicio', audience: { slug: 'sobre-nosotros' } },
    populate: {
      sections: {
        on: {
          'sections.hero': { populate: '*' },
          'sections.section-heading': { populate: '*' },
          'sections.rich-text': { populate: '*' },
          'sections.mission-vision': { populate: { items: true, image: true } },
          'sections.values-grid': { populate: { items: { populate: { icon: true } }, centerImage: true } },
          'sections.leaders': { populate: { leaders: { populate: { photo: true } } } },
          'sections.card-grid': { populate: { cards: { populate: { image: true } } } },
        },
      },
    },
  });
  if (page) {
    const strip = (v: any): any => {
      if (Array.isArray(v)) return v.map(strip);
      if (v && typeof v === 'object') {
        if (v.mime && v.url) return v.id; // media → id
        const out: Record<string, any> = {};
        for (const [k, val] of Object.entries(v)) {
          if (['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt'].includes(k)) continue;
          out[k] = strip(val);
        }
        return out;
      }
      return v;
    };
    const sections = (page as any).sections.map((s: any) => {
      const st = strip(s);
      st.__component = s.__component;
      if (s.__component === 'sections.leaders') st.leaders = rc.leaders;
      return st;
    });
    await strapi.documents('api::page.page').update({
      documentId: page.documentId,
      data: { sections },
      status: 'published',
    });
  }

  // Tipo de cambio real visto en el sitio.
  const global = await strapi.documents('api::global.global').findFirst({});
  if (global) {
    await strapi.documents('api::global.global').update({
      documentId: global.documentId,
      data: { usdBuy: 36.44, usdSell: 37.17 },
      status: 'published',
    });
  }
}

// Migración v15: página "Trabajá con nosotros"
// (/sobre-nosotros/trabaja-con-nosotros), diseño 1506:27127. Hero naranja,
// intro, Misión de Gestión de Talento (naranja + cita), Nuestros Pilares,
// Capacitación Integral (teal + fotos), Oportunidades de Carrera y testimonio.
// Nota: el título de la intro se corrige (el Figma decía "impulsamos tu Tu"),
// y el testimonio final se deja con el Lorem ipsum del diseño por decisión del
// cliente.
async function migrateV15(strapi: Core.Strapi) {
  const media = await uploadAssets(strapi, [
    'sn-tcn-hero.jpg',
    'sn-tcn-circulo.jpg',
    'sn-tcn-pilar-1.svg',
    'sn-tcn-pilar-2.svg',
    'sn-tcn-pilar-3.svg',
    'sn-tcn-pilar-4.svg',
    'sn-tcn-capacitacion-1.jpg',
    'sn-tcn-capacitacion-2.jpg',
    'sn-tcn-testimonio.jpg',
  ]);

  const page = await strapi.documents('api::page.page').findFirst({
    filters: { slug: 'trabaja-con-nosotros', audience: { slug: 'sobre-nosotros' } },
  });
  if (!page) {
    strapi.log.warn('migrateV15: página trabaja-con-nosotros no encontrada');
    return;
  }

  const roles = [
    {
      title: 'Cajero',
      text: 'El cajero en Banco Avanz es la cara amigable que agiliza tus transacciones financieras, brindando servicio con eficiencia y una sonrisa.',
    },
    {
      title: 'Asesor de Clientes',
      text: 'Nuestros asesores de clientes están dedicados a entender tus necesidades financieras individuales, proporcionando orientación personalizada para tu éxito financiero.',
    },
    {
      title: 'Asesor de Clientes Empresariales',
      text: 'Los asesores de clientes empresariales en Banco Avanz ofrecen soluciones financieras adaptadas a las necesidades únicas de las empresas, impulsando el crecimiento y la prosperidad.',
    },
    {
      title: 'Oficial de Televentas',
      text: 'Los oficiales de televentas de Banco Avanz son expertos en ofrecer soluciones financieras por teléfono, brindando un servicio personalizado y eficiente a nuestros clientes.',
    },
  ];

  await strapi.documents('api::page.page').update({
    documentId: page.documentId,
    data: {
      title: 'Trabajá con nosotros',
      sections: [
        {
          __component: 'sections.hero',
          title: 'Trabajá con nosotros',
          subtitle: 'Únete a nuestro equipo de colaboradores comprometidos.',
          image: media['sn-tcn-hero.jpg']?.id,
          variant: 'primary',
          compact: true,
          buttons: [],
        },
        {
          __component: 'sections.split-text',
          divider: true,
          heading: 'En Banco Avanz, impulsamos tu Crecimiento Profesional',
          body: 'Entendemos que la excelencia en el servicio al cliente comienza con nuestros colaboradores. Por eso, ofrecemos un programa de capacitación y desarrollo diseñado para fortalecer habilidades clave y fomentar el crecimiento personal y profesional.',
        },
        {
          __component: 'sections.quote-banner',
          background: 'primaryLight',
          kicker: 'GESTIÓN DE TALENTO',
          heading: 'Misión de Gestión de Talento',
          image: media['sn-tcn-circulo.jpg']?.id,
          imagePosition: 'left',
          quote:
            'No solo buscamos reclutar talento, sino ser tu aliado estratégico en el camino hacia la prosperidad profesional, personal y familiar.',
          body: [
            'En Avanz, nos enorgullece nuestra cultura de valores que promueven la diversidad de pensamiento, el reconocimiento al mérito y la comunicación bilateral.',
            'Nuestros lemas «Juntos nos cuidamos, juntos avanzamos» y «SomosAvanz, Somosfamilia» son más que simples frases; son un sentimiento compartido que se ha forjado en situaciones que nos han unido aún más como familia.',
          ].join('\n\n'),
        },
        {
          __component: 'sections.icon-columns',
          kicker: 'lo que ofrecemos',
          heading: 'Nuestros Pilares',
          items: [
            {
              title: 'Cultura de Reconocimiento',
              description:
                'Celebramos tus logros, grandes y pequeños, porque tu esfuerzo merece ser reconocido y valorado.',
              icon: media['sn-tcn-pilar-1.svg']?.id,
            },
            {
              title: 'Ambiente de Trabajo en Equipo',
              description:
                'El trabajo en equipo es la esencia de nuestra operación. Colaboramos, apoyamos y construimos relaciones sólidas para alcanzar objetivos comunes.',
              icon: media['sn-tcn-pilar-2.svg']?.id,
            },
            {
              title: 'Liderazgo Colaborativo y Pro-Innovación',
              description:
                'En Banco Avanz, lideramos juntos, fomentando un ambiente de innovación donde cada idea cuenta. Aquí, todos contribuimos al crecimiento y la mejora continua.',
              icon: media['sn-tcn-pilar-3.svg']?.id,
            },
            {
              title: 'Salario Competitivo',
              description:
                'Reconocemos tu dedicación con un salario competitivo que refleja tu valía y contribución al éxito de todo el equipo. Tu talento es recompensado como se merece.',
              icon: media['sn-tcn-pilar-4.svg']?.id,
            },
          ],
        },
        {
          __component: 'sections.media-text',
          background: 'secondary',
          heading: 'Capacitación Integral',
          subheading:
            'Nuestros espacios físicos totalmente equipados están destinados a capacitar a futuros colaboradores en áreas fundamentales como matemática financiera, contabilidad, comunicación, atención al cliente y negociación.',
          body: 'Pero no nos detenemos ahí; para nuestro valioso equipo interno, desarrollamos programas que van más allá del conocimiento técnico. Estos programas refuerzan valores corporativos, proporcionan conocimientos específicos del puesto y desarrollan habilidades cruciales en el ámbito bancario.',
          images: [
            media['sn-tcn-capacitacion-1.jpg']?.id,
            media['sn-tcn-capacitacion-2.jpg']?.id,
          ].filter(Boolean),
        },
        {
          __component: 'sections.role-grid',
          heading: 'Oportunidades de Carrera',
          body: [
            'Si buscas una empresa que reconozca tus logros y te permita un crecimiento vertical o desarrollo horizontal, ¡tu lugar está con nosotros en Banco Avanz!',
            'Contamos con políticas de crecimiento que te permiten trazar tu propia carrera. Consulta las plazas vacantes en LinkedIn para descubrir las oportunidades disponibles a nivel nacional',
          ].join('\n\n'),
          buttonLabel: 'Enviar correo a seleccion@avanzbanc.com',
          buttonUrl: 'mailto:seleccion@avanzbanc.com',
          items: roles,
        },
        {
          __component: 'sections.quote-banner',
          background: 'surface',
          image: media['sn-tcn-testimonio.jpg']?.id,
          imagePosition: 'left',
          quote:
            'Lorem ipsum dolor sit alor amet, cotns ekolor adipiscing elit Nulla molestie convallis convallis.',
          attribution: 'Bridget Faulkner, Student',
        },
      ],
    },
    status: 'published',
  });
}

// Migración v14: página "Regulatorio" / Información Regulatoria
// (/sobre-nosotros/informacion-regulatoria), diseño 1506:27626. Hero azul
// petróleo, píldoras, Regulación Tributaria (ícono + texto), FOGADE (logo +
// botón + texto legal) y Nuestras Tarifas (7 documentos).
async function migrateV14(strapi: Core.Strapi) {
  const media = await uploadAssets(strapi, [
    'sn-reg-hero.jpg',
    'sn-reg-balanza.svg',
    'sn-reg-fogade.svg',
  ]);

  const page = await strapi.documents('api::page.page').findFirst({
    filters: { slug: 'informacion-regulatoria', audience: { slug: 'sobre-nosotros' } },
  });
  if (!page) {
    strapi.log.warn('migrateV14: página informacion-regulatoria no encontrada');
    return;
  }

  // "Leer más" va como texto plano al final del párrafo, tal cual el diseño.
  const fogadeBody = [
    'Banco Avanz, S.A., en su condición de banco comercial privado, autorizado para operar por la Superintendencia de Bancos y de Otras Instituciones Financieras, es parte del Sistema de Garantía de Depósitos de la República de Nicaragua.',
    'Cuando la Garantía de Depósitos se haga efectiva, total o parcialmente, con recursos del Sistema de Garantía de Depósitos, será de hasta un máximo por depositante, independientemente del número de cuentas que este mantenga en la entidad, de un importe en moneda nacional o extranjera, igual o equivalente al valor de diez mil dólares de Estados Unidos de América (US$ 10,000.00) incluyendo principal e intereses devengados hasta la fecha del inicio de procedimiento de restitución. Leer más',
  ].join('\n\n');

  const tarifas = [
    'Tarifas Pasivas',
    'Tarifario de Crédito Empresarial',
    'Tarifario de Tarjetas de Crédito',
    'Tarifario de crédito para clientes particulares',
    'Tarifas de Servicios',
    'Tasa de Referencia para Créditos con Tasa Variable',
    'Tabla de Cobertura y Sumas Aseguradas',
  ].map((label) => ({ label, url: '#' }));

  await strapi.documents('api::page.page').update({
    documentId: page.documentId,
    data: {
      title: 'Información Regulatoria',
      sections: [
        {
          __component: 'sections.hero',
          title: 'Información Regulatoria',
          subtitle: 'Trabajamos con ética, honestidad y transparencia.',
          image: media['sn-reg-hero.jpg']?.id,
          variant: 'secondary',
          compact: true,
          buttons: [],
        },
        {
          __component: 'sections.pill-nav',
          items: [
            { label: 'Regulación Tributaria', url: '#regulacion-tributaria' },
            { label: 'FOGADE', url: '#fogade' },
            { label: 'Nuestras Tarifas', url: '#nuestras-tarifas' },
          ],
        },
        {
          __component: 'sections.icon-block',
          anchorId: 'regulacion-tributaria',
          icon: media['sn-reg-balanza.svg']?.id,
          iconWidth: 100,
          heading: 'Regulación Tributaria',
          body: 'De conformidad a lo que establece el artículo 15 de la Ley 822 “Ley de Concertación Tributaria” reformada por la Ley 987, son rentas de capital los ingresos devengados o percibidos en dinero o especie, provenientes de la explotación de activos o cesión de derechos, considerando rentas de capital mobiliario las que provienen de depósitos de cualquier naturaleza y plazo, y de conformidad al artículo 87 de la Ley 822, reformado por la Ley 987, la retención de IR sobre las rentas de capital y ganancias y pérdidas de capital, es de 15% para residentes y no residentes.',
          align: 'center',
        },
        {
          __component: 'sections.icon-block',
          anchorId: 'fogade',
          icon: media['sn-reg-fogade.svg']?.id,
          iconWidth: 455,
          buttonLabel: 'Descargar documento',
          buttonUrl: '#',
          body: fogadeBody,
          align: 'center',
        },
        {
          __component: 'sections.document-group',
          heading: 'Nuestras Tarifas',
          anchorId: 'nuestras-tarifas',
          items: tarifas,
        },
      ],
    },
    status: 'published',
  });
}

// Migración v13: página "Transparencia" / Información Financiera
// (/sobre-nosotros/informacion-financiera), diseño 1506:25426. Hero azul
// petróleo, píldoras de ancla y tres grupos de documentos. Textos verbatim del
// diseño: guion largo (–) en los títulos, "N°" con signo de grado, y sus typos
// (N°.89 y N°.97 sin espacio; el ítem de 2021 sin punto final).
async function migrateV13(strapi: Core.Strapi) {
  const media = await uploadAssets(strapi, [
    'sn-fin-hero.jpg',
    'sn-fin-calificacion-tabla.png',
  ]);

  const page = await strapi.documents('api::page.page').findFirst({
    filters: { slug: 'informacion-financiera', audience: { slug: 'sobre-nosotros' } },
  });
  if (!page) {
    strapi.log.warn('migrateV13: página informacion-financiera no encontrada');
    return;
  }

  const PWC =
    'con sus Estados Financieros y notas emitidos por la firma de auditoría externa PricewaterhouseCoopers fue conocido, resuelto y autorizado por los miembros de la Junta Directiva y Asamblea General de Accionistas y se encuentra disponible en su totalidad en la página web: www.avanzbanc.com.';
  const COMBINADOS =
    'En esta página web también está disponible el informe sobre los Estados Financieros auditados Combinados.';

  const auditados = [
    {
      label: 'Estados Auditados Individuales – Año 2022',
      description: `El presente informe y el dictamen de los auditores independientes, ${PWC} Publicación en diario oficial: La Gaceta N°. 77, 04/05/2023.`,
    },
    {
      label: 'Estados Auditados Individuales – Año 2021',
      description: `El presente informe y el dictamen de los auditores independientes, ${PWC} Publicación en diario oficial: La Gaceta N°. 94, 24/05/2022`,
    },
    {
      label: 'Estados Auditados Individuales – Año 2020',
      description: `El presente informe y la opinión de los auditores independientes, ${PWC} Publicación en diario oficial: La Gaceta N°. 100, 02/06/2021. Publicación en diario de circulación nacional: La Prensa, 26/04/2021`,
    },
    { label: 'Estados Auditados Individuales – Año 2019' },
    {
      label: 'Estados Auditados Combinados – Año 2019',
      description: `El presente informe y la opinión de los auditores independientes, ${PWC} ${COMBINADOS} Publicación en el diario oficial: La Gaceta N°. 82, 08/05/2020. Publicación en diario de circulación nacional: La Prensa, 29/04/2020.`,
    },
    { label: 'Estados Auditados Individuales – Año 2018' },
    {
      label: 'Estados Auditados Combinados – Año 2018',
      description: `El presente informe y el dictamen de los auditores independientes, ${PWC} ${COMBINADOS} Publicación en el diario oficial: La Gaceta N°.97, 24/05/2019. Publicación en diario de circulación nacional: La Prensa, 25/04/2019.`,
    },
    {
      label: 'Estados Auditados – Año 2017',
      description:
        'El presente informe sobre los Estados Financieros Auditados fue conocido, resuelto y autorizado por los miembros de la Junta Directiva y Asamblea General de Accionistas y se encuentra disponible en su totalidad en la página web: www.avanzbanc.com. Publicación en el diario oficial: La Gaceta N°.89, 11/05/2018, páginas: 3103-3108. Publicación en diario de circulación nacional: La Prensa, 22/05/2018.',
    },
    {
      label: 'Estados Auditados – Año 2016',
      description:
        'El presente informe sobre los Estados Financieros Auditados fue conocido, resuelto y autorizado por los miembros de la Junta Directiva y Asamblea General de Accionistas y se encuentra disponible en su totalidad en la página web: www.avanzbanc.com. Publicación en el diario oficial: La Gaceta N°. 80, 02/05/2017, páginas 3321-3325. Publicación en diario de circulación nacional: La Prensa, 30/04/2017.',
    },
  ].map((d) => ({ ...d, url: '#' }));

  // Gestión de Riesgo: 2023 (2º y 1º trimestre) y 2022→2018 completos.
  const TRIMESTRES = ['Cuarto', 'Tercer', 'Segundo', 'Primer'];
  const gestionRiesgo = [
    { label: 'Informe de Gestión Segundo Trimestre 2023', url: '#' },
    { label: 'Informe de Gestión Primer Trimestre 2023', url: '#' },
    ...[2022, 2021, 2020, 2019, 2018].flatMap((year) =>
      TRIMESTRES.map((t) => ({
        label: `Informe de Gestión ${t} Trimestre ${year}`,
        url: '#',
      })),
    ),
  ];

  // Calificación de Riesgo: 2023→2018 y 2016→2009 (el diseño no tiene 2017).
  const calificacion = [2023, 2022, 2021, 2020, 2019, 2018, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009].map(
    (year) => ({ label: `Calificación de Riesgo ${year}`, url: '#' }),
  );

  await strapi.documents('api::page.page').update({
    documentId: page.documentId,
    data: {
      title: 'Información Financiera',
      sections: [
        {
          __component: 'sections.hero',
          title: 'Información Financiera',
          subtitle: 'En Avanz trabajamos con transparencia.',
          image: media['sn-fin-hero.jpg']?.id,
          variant: 'secondary',
          compact: true,
          buttons: [],
        },
        {
          __component: 'sections.pill-nav',
          items: [
            { label: 'Estados Financieros Auditados', url: '#estados-financieros' },
            { label: 'Gestión de Riesgo', url: '#gestion-de-riesgo' },
            { label: 'Calificación de Riesgo', url: '#calificacion-de-riesgo' },
          ],
        },
        {
          __component: 'sections.document-group',
          heading: 'Estados Financieros Auditados',
          anchorId: 'estados-financieros',
          intro:
            'Estados Auditados de Avanz (una institución nicaragüense de capital privado) Informe de los auditores independientes y estados financieros.',
          items: auditados,
        },
        {
          __component: 'sections.document-group',
          heading: 'Gestión de Riesgo',
          anchorId: 'gestion-de-riesgo',
          intro: 'Les presentamos nuestros informes de gestión de riesgo:',
          items: gestionRiesgo,
        },
        {
          __component: 'sections.document-group',
          heading: 'Calificación de Riesgo',
          anchorId: 'calificacion-de-riesgo',
          intro: 'Les presentamos nuestro reporte de calificación de riesgo.',
          image: media['sn-fin-calificacion-tabla.png']?.id,
          items: calificacion,
        },
      ],
    },
    status: 'published',
  });
}

// Migración v12: página "Sobre Avanz" (home de la audiencia sobre-nosotros)
// armada 100% con secciones de la dynamic zone, según el diseño 1506:25105.
// Textos verbatim del diseño, incluidos sus typos ("Velásque" sin z, y el
// valor 1506:25192 sin punto final).
async function migrateV12(strapi: Core.Strapi) {
  const media = await uploadAssets(strapi, [
    'sn-hero-equipo.jpg',
    'sn-mision-vision.jpg',
    'sn-logo-center.svg',
    'sn-valor-empatico.svg',
    'sn-valor-comprometido.svg',
    'sn-valor-innovador.svg',
    'sn-valor-prosperos.svg',
    'sn-card-transparencia.jpg',
    'sn-card-gestion-humana.jpg',
    'sn-card-regulatoria.jpg',
  ]);

  const audience = await strapi
    .documents('api::audience.audience')
    .findFirst({ filters: { slug: 'sobre-nosotros' } });
  const page = await strapi.documents('api::page.page').findFirst({
    filters: { slug: 'inicio', audience: { slug: 'sobre-nosotros' } },
  });
  if (!audience || !page) {
    strapi.log.warn('migrateV12: no se encontró la página inicio de sobre-nosotros');
    return;
  }

  await strapi.documents('api::page.page').update({
    documentId: page.documentId,
    data: {
      title: 'Sobre Avanz',
      sections: [
        // (a) Hero con foto del equipo y panel naranja
        {
          __component: 'sections.hero',
          kicker: '',
          title: 'Sobre Avanz',
          subtitle: 'Somos el banco que se transforma de la mano de sus clientes',
          image: media['sn-hero-equipo.jpg']?.id,
          buttons: [],
        },
        // (b) ¿Quiénes Somos?
        {
          __component: 'sections.section-heading',
          kicker: 'CONÓCENOS',
          title: '¿Quiénes Somos?',
          align: 'center',
          background: 'none',
          maxWidth: 900,
        },
        {
          __component: 'sections.rich-text',
          align: 'center',
          maxWidth: 900,
          body: [
            '**Somos la nueva generación en servicios financieros que inspirados en la innovación crea soluciones de alto valor.**',
            '',
            'Brindamos una experiencia diferenciadora mediante un conocimiento profundo de las necesidades financieras de nuestros clientes, y contamos con un equipo de personas motivado y comprometido; esto es lo que nos permite convertirnos en aliado y banco principal de nuestros clientes.',
            '',
            'Somos parte del Grupo Pellas, un grupo empresarial liderado por Don Carlos Pellas Chamorro, con una amplia trayectoria en la banca nacional e internacional de más de 60 años. Fusionamos la experiencia e innovación estando convencidos de que así juntos generaremos cambios positivos que creen prosperidad para los nicaragüenses.',
          ].join('\n'),
        },
        // (c) Misión y Visión + foto
        {
          __component: 'sections.mission-vision',
          items: [
            {
              title: 'Nuestra Misión',
              text: 'Brindar servicios financieros especializados, innovadores y de alta calidad creando valor para nuestros clientes, colaboradores e inversionistas.',
            },
            {
              title: 'Nuestra Visión',
              text: 'Ser el Banco nicaragüense referente en términos de innovación y calidad en los servicios que ofrecemos.',
            },
          ],
          image: media['sn-mision-vision.jpg']?.id,
        },
        // (d) Banda azul "¿Quién es Avanz?"
        {
          __component: 'sections.section-heading',
          title: '¿Quién es Avanz?',
          subtitle:
            'Avanz es aquel que elige ser visionario, diferente, creer en las posibilidades, basado en principios y valores bien fundamentados y no se conforma.',
          align: 'center',
          background: 'secondary',
          maxWidth: 960,
        },
        // (e) Valores: columna izquierda (Empático, Comprometido), logo, derecha
        {
          __component: 'sections.values-grid',
          items: [
            {
              title: 'Empático y Proactivo',
              description:
                'Somos abiertos y receptivos a las necesidades de nuestros clientes lo que nos permite ofrecerles soluciones especializadas y personalizadas.',
              icon: media['sn-valor-empatico.svg']?.id,
            },
            {
              title: 'Comprometido y Responsable',
              description:
                'Trabajamos con ética, honestidad y transparencia para brindar a nuestros clientes y colaboradores soluciones que mejoren su vida; para nuestros inversionistas, buscamos obtener un rendimiento justo',
              icon: media['sn-valor-comprometido.svg']?.id,
            },
            {
              title: 'Innovador e Inteligente',
              description:
                'Nos esforzamos por estar siempre a la vanguardia tecnológica ofreciendo soluciones que faciliten y hagan más simple la vida de nuestros clientes.',
              icon: media['sn-valor-innovador.svg']?.id,
            },
            {
              title: 'Prósperos',
              description:
                'Creemos en generar sinergias ganar-ganar con nuestros clientes y colaboradores. Trabajamos de la mano ampliando tu horizonte.',
              icon: media['sn-valor-prosperos.svg']?.id,
            },
          ],
          centerImage: media['sn-logo-center.svg']?.id,
        },
        // (f) Nuestros líderes (sin fotos en el diseño)
        {
          __component: 'sections.leaders',
          kicker: 'Gobierno corporativo',
          heading: 'Nuestros líderes',
          leaders: [
            {
              name: 'Adolfo Martín McGregor Benard',
              role: 'Director Propietario',
              group: 'Junta Directiva',
            },
            {
              name: 'Silvio Federico Pellas Chamorro',
              role: 'Director Propietario',
              group: 'Junta Directiva',
            },
            {
              name: 'Ricardo Ramón Barrios Velásque',
              role: 'Director Propietario',
              group: 'Junta Directiva',
            },
          ],
        },
        // (g) 3 tarjetas del pie
        {
          __component: 'sections.card-grid',
          cards: [
            {
              kicker: 'SOMOS TRANSPARENTES',
              title: 'Transparencia Bancaria',
              description:
                'Encuentra información relevante sobre Estados Financieros Auditados, Gestión de Riesgo y Calificación de Riesgo.',
              linkLabel: 'Conocé más',
              linkUrl: '/sobre-nosotros/informacion-financiera',
              image: media['sn-card-transparencia.jpg']?.id,
            },
            {
              kicker: 'ÚNETE A NUESTRO EQUIPO',
              title: 'Gestión Humana',
              description:
                'Conocé sobre nuestra cultura organizativa y los beneficios que tiene formar parte de la familia Avanz. ¡Vos podés ser parte!',
              linkLabel: 'Conocé más',
              linkUrl: '/sobre-nosotros/trabaja-con-nosotros',
              image: media['sn-card-gestion-humana.jpg']?.id,
            },
            {
              kicker: 'AVANZ TE INFORMA',
              title: 'Información Regulatoria',
              description:
                'En Avanz trabajamos con ética, honestidad y transparencia. Conoce sobre nuestras tarifas y actualizaciones regulatorias.',
              linkLabel: 'Conocé más',
              linkUrl: '/sobre-nosotros/informacion-regulatoria',
              image: media['sn-card-regulatoria.jpg']?.id,
            },
          ],
        },
      ],
    },
    status: 'published',
  });
}

// Migración v11: menú real de la audiencia "Sobre nosotros" según los diseños
// (1506:27626 y hermanos): 4 ítems. "Sobre Avanz" es la landing de la sección,
// así que apunta al home de la audiencia; "Transparencia" abre la página de
// información financiera (diseño 1506:25426).
async function migrateV11(strapi: Core.Strapi) {
  const audience = await strapi
    .documents('api::audience.audience')
    .findFirst({ filters: { slug: 'sobre-nosotros' } });
  if (!audience) {
    strapi.log.warn('migrateV11: audiencia sobre-nosotros no encontrada');
    return;
  }

  await strapi.documents('api::audience.audience').update({
    documentId: audience.documentId,
    data: {
      mainNav: [
        { label: 'Sobre Avanz', url: '/sobre-nosotros', links: [] },
        {
          label: 'Transparencia',
          url: '/sobre-nosotros/informacion-financiera',
          links: [],
        },
        {
          label: 'Regulatorio',
          url: '/sobre-nosotros/informacion-regulatoria',
          links: [],
        },
        {
          label: 'Trabaja con nosotros',
          url: '/sobre-nosotros/trabaja-con-nosotros',
          links: [],
        },
      ],
    },
    status: 'published',
  });
}

// Migración v10: audiencias (Personas / Empresas / Sobre nosotros). Cada una
// define su propio menú principal y agrupa sus páginas, de modo que las rutas
// quedan /[audiencia]/[pagina] (p. ej. /personas/cuentas y /empresas/cuentas,
// misma estructura y distinto contenido).
async function migrateV10(strapi: Core.Strapi) {
  const audiences: Array<{
    name: string;
    slug: string;
    order: number;
    mainNav: Array<{ label: string; url?: string; links?: Array<{ label: string; url: string }> }>;
    /** Páginas (por slug actual) que pasan a esta audiencia. */
    pages: string[];
    /** Página que actúa de home de la audiencia; su slug pasa a 'inicio'. */
    home?: string;
  }> = [
    {
      name: 'Personas',
      slug: 'personas',
      order: 1,
      mainNav: [
        {
          label: 'Productos',
          url: '/personas/cuentas',
          links: [
            { label: 'Cuentas', url: '/personas/cuentas' },
            { label: 'Tarjetas', url: '/personas/tarjetas' },
            { label: 'Préstamos', url: '/personas/creditos' },
            { label: 'Seguros', url: '/personas/seguros' },
            { label: 'Transferencias', url: '/personas/transferencias' },
            { label: 'Otros Servicios', url: '/personas/servicios' },
          ],
        },
        { label: 'Canales de atención', url: '/personas/canales-de-atencion', links: [] },
        { label: 'Zona digital', url: '/personas/zona-digital', links: [] },
        { label: 'Noticias', url: '/noticias', links: [] },
        { label: 'Promociones', url: '/promociones', links: [] },
      ],
      home: 'inicio',
      pages: [
        'inicio',
        'canales-de-atencion',
        'zona-digital',
        'soluciones-digitales',
        'ayuda',
        'educacion-financiera',
        'tips-de-seguridad',
      ],
    },
    {
      name: 'Empresas',
      slug: 'empresas',
      order: 2,
      mainNav: [
        {
          label: 'Productos',
          url: '/empresas/cuentas',
          links: [
            { label: 'Cuentas', url: '/empresas/cuentas' },
            { label: 'Tarjetas', url: '/empresas/tarjetas' },
            { label: 'Créditos', url: '/empresas/creditos' },
            { label: 'Transferencias', url: '/empresas/transferencias' },
            { label: 'Otros Servicios', url: '/empresas/servicios' },
          ],
        },
        { label: 'Canales de atención', url: '/empresas/canales-de-atencion', links: [] },
        { label: 'Zona digital', url: '/empresas/zona-digital', links: [] },
        { label: 'Noticias', url: '/noticias', links: [] },
        { label: 'Promociones', url: '/promociones', links: [] },
      ],
      home: 'empresas',
      pages: ['empresas'],
    },
    {
      name: 'Sobre nosotros',
      slug: 'sobre-nosotros',
      order: 3,
      mainNav: [
        { label: '¿Quiénes somos?', url: '/sobre-nosotros/quienes-somos', links: [] },
        {
          label: 'Información Regulatoria',
          url: '/sobre-nosotros/informacion-regulatoria',
          links: [],
        },
        {
          label: 'Información Financiera',
          url: '/sobre-nosotros/informacion-financiera',
          links: [],
        },
        {
          label: 'Transparencia Bancaria',
          url: '/sobre-nosotros/transparencia-bancaria',
          links: [],
        },
        {
          label: 'Trabajá con nosotros',
          url: '/sobre-nosotros/trabaja-con-nosotros',
          links: [],
        },
      ],
      home: 'sobre-nosotros',
      pages: [
        'sobre-nosotros',
        'quienes-somos',
        'informacion-regulatoria',
        'informacion-financiera',
        'transparencia-bancaria',
        'trabaja-con-nosotros',
        'bienes-en-venta',
      ],
    },
  ];

  for (const aud of audiences) {
    const data = {
      name: aud.name,
      slug: aud.slug,
      order: aud.order,
      mainNav: aud.mainNav,
    };
    const existing = await strapi
      .documents('api::audience.audience')
      .findFirst({ filters: { slug: aud.slug } });
    const saved = existing
      ? await strapi.documents('api::audience.audience').update({
          documentId: existing.documentId,
          data,
          status: 'published',
        })
      : await strapi
          .documents('api::audience.audience')
          .create({ data, status: 'published' });

    if (!saved) {
      strapi.log.warn(`migrateV10: no se pudo guardar la audiencia "${aud.slug}"`);
      continue;
    }

    // Asocia sus páginas y renombra el slug del home a 'inicio'
    for (const pageSlug of aud.pages) {
      const page = await strapi
        .documents('api::page.page')
        .findFirst({ filters: { slug: pageSlug } });
      if (!page) {
        strapi.log.warn(`migrateV10: página "${pageSlug}" no encontrada`);
        continue;
      }
      await strapi.documents('api::page.page').update({
        documentId: page.documentId,
        data: {
          audience: saved.documentId,
          slug: pageSlug === aud.home ? 'inicio' : pageSlug,
        },
        status: 'published',
      });
    }
  }
}

// Migración v9: canales de atención (diseño 1506:31438). Crea los 8 canales
// (Avanz Móvil, e-Banking, Sucursal Telefónica, Red de Sucursales, ATM,
// PuntoXpress, BancaRed, Punto Fácil) con su imagen, botón y características.
async function migrateV9(strapi: Core.Strapi) {
  const media = await uploadAssets(strapi, [
    'canal-avanz-movil.png',
    'canal-e-banking.png',
    'canal-sucursal-telefonica.png',
    'canal-red-sucursales.png',
    'canal-atm.png',
    'canal-puntoxpress.png',
    'canal-bancared.png',
    'canal-punto-facil.png',
  ]);

  const channels: Array<{
    name: string;
    slug: string;
    description: string;
    image: string;
    buttonLabel: string;
    buttonUrl: string;
    buttonIcon?: 'none' | 'phone';
    features: string[];
    order: number;
  }> = [
    {
      name: 'Avanz Móvil',
      slug: 'avanz-movil',
      description:
        'Con un solo clic, hacés tus pagos, enviás dinero, programás tus transferencias y agregás a tus beneficiarios, desde donde estés. ¡Así de fácil, rápido y desde la palma de tu mano!',
      image: 'canal-avanz-movil.png',
      buttonLabel: 'Conocé más',
      buttonUrl: '#',
      features: [
        'Pagos de servicio, tarjetas de crédito y préstamos.',
        'Realizar solicitudes en línea de cuentas, préstamos, tarjetas de crédito, suscripción AvanzTrans.',
        'Gestiona tus programas de lealtad, tarjetas y límites con nosotros.',
      ],
      order: 1,
    },
    {
      name: 'e-Banking',
      slug: 'e-banking',
      description:
        'Consulta saldo, transfiere dinero, seguridad máxima. Operaciones en línea, sin límites horarios, desde donde estés',
      image: 'canal-e-banking.png',
      buttonLabel: 'Conocé más',
      buttonUrl: '#',
      features: [
        'Mayor seguridad, accesibilidad, comodidad y rapidez.',
        'Acceso gratuito al sistema de consultas.',
        'Acceso al sistema las 24 horas del día los 365 días del año.',
        'Niveles de usuarios para Personas Jurídicas.',
      ],
      order: 2,
    },
    {
      name: 'Sucursal Telefónica',
      slug: 'sucursal-telefonica',
      description:
        'A través de nuestra sucursal telefónica, puedes gestionar servicios financieros y bloquear/desbloquear tarjetas y cuentas las 24/7. Además, asesores están disponibles de Lunes a Viernes de 08:00 a.m. a 05:30 p.m. y Sábados de 08:00 a.m. a 01:00 p.m.',
      image: 'canal-sucursal-telefonica.png',
      buttonLabel: 'Llamar al 2023-7676',
      buttonUrl: 'tel:20237676',
      buttonIcon: 'phone',
      features: [
        'Acceso 24/7 para gestionar tarjetas y cuentas.',
        'Sistema de Atención Automatizada de nuestra sucursal telefónica conoce más aquí',
      ],
      order: 3,
    },
    {
      name: 'Red de Sucursales',
      slug: 'red-de-sucursales',
      description:
        'Avanz tiene presencia en 09 departamentos del país con una red de 12 sucursales y una oficina Matriz en Managua.',
      image: 'canal-red-sucursales.png',
      buttonLabel: 'Ver ubicaciones',
      buttonUrl: '#',
      features: [
        'Asistencia nacional',
        'Zonas de mayor afluencia para nuestros clientes',
      ],
      order: 4,
    },
    {
      name: 'ATM',
      slug: 'atm',
      description:
        'A través de nuestra red de ATMs, podés retirar efectivo de tus tarjetas de débito o crédito, imprimir estado de cuenta de tus últimas 10 transacciones, consultar tu saldo, cambiar tu PIN y depositar o retirar dinero usando el nuevo servicio “Código T- Envío Avanz”.',
      image: 'canal-atm.png',
      buttonLabel: 'Ver ubicaciones',
      buttonUrl: '#',
      features: [
        'Podés realizar multiples transacciones.',
        'Retiro de efectivo en cualquier momento 24/7.',
        'Una amplia red de cajeros en zonas centros en las distintas zonas del país.',
      ],
      order: 5,
    },
    {
      name: 'PuntoXpress',
      slug: 'puntoxpress',
      description:
        'Avanz en su alianza con PuntoXpress ponemos a tu disposición una red de multiservicios, de fácil acceso y horarios extendidos. Facilitando el pago de facturas y otros servicios en un mismo lugar.',
      image: 'canal-puntoxpress.png',
      buttonLabel: 'Ver ubicaciones',
      buttonUrl: '#',
      features: [
        'Podés realizar el pago de tus tarjetas de crédito.',
        'Realizar depósitos a cuentas.',
        'Realizar retiro de efectivo.',
      ],
      order: 6,
    },
    {
      name: 'BancaRed',
      slug: 'bancared',
      description:
        'Cuenta con más de 100 cajeros automáticos disponibles a nivel nacional, donde los clientes de Avanz, BDF y Ficohsa, podrán realizar retiros y consultas de saldo con su tarjeta de débito sin ningún costo.',
      image: 'canal-bancared.png',
      buttonLabel: 'Ver ubicaciones',
      buttonUrl: '#',
      features: [
        'Ubicaciones accesibles.',
        'Más de 100 cajeros automáticos a nivel nacional.',
        'Retiros y consultas de tarjeta de débito sin costo.',
      ],
      order: 7,
    },
    {
      name: 'Punto Fácil',
      slug: 'punto-facil',
      description:
        'Hemos realizado alianza con PuntoFácil, la red de pagos más segura y ágil del país, para que nuestros clientes puedan pagar sus facturas de servicios básicos en lugares de su elección. Centralice sus pagos mensuales y ahorre tiempo, evitando recargos por retrasos.',
      image: 'canal-punto-facil.png',
      buttonLabel: 'Ver ubicaciones',
      buttonUrl: '#',
      features: [
        'Centralizá tus pagos de tarjetas y servicios básicos en un solo lugar.',
        'Evita recargos por retrasos',
        'Respaldo regional.',
      ],
      order: 8,
    },
  ];

  for (const ch of channels) {
    const data = {
      name: ch.name,
      slug: ch.slug,
      description: ch.description,
      image: media[ch.image]?.id,
      buttonLabel: ch.buttonLabel,
      buttonUrl: ch.buttonUrl,
      buttonIcon: ch.buttonIcon ?? 'none',
      features: ch.features.map((text) => ({ text })),
      order: ch.order,
    };
    // Idempotente: actualiza si ya existe (por slug), si no crea.
    const existing = await strapi
      .documents('api::channel.channel')
      .findFirst({ filters: { slug: ch.slug } });
    if (existing) {
      await strapi.documents('api::channel.channel').update({
        documentId: existing.documentId,
        data,
        status: 'published',
      });
    } else {
      await strapi
        .documents('api::channel.channel')
        .create({ data, status: 'published' });
    }
  }
}

// Migración v8: template de detalle de Tarjeta de Débito
// (diseño 1549:9065): hero naranja con tarjeta, feature boxes, intro con foto,
// tabs "Nuestros Beneficios", FAQ y documentación.
async function migrateV8(strapi: Core.Strapi) {
  const media = await uploadAssets(strapi, [
    'debito-intro-pos.jpg',
    'debito-feat-retiros.png',
    'debito-feat-cajeros.png',
    'debito-feat-pagos.png',
  ]);

  const product = await strapi
    .documents('api::product.product')
    .findFirst({ filters: { slug: 'tarjeta-de-debito' } });
  if (!product) {
    strapi.log.warn('migrateV8: tarjeta-de-debito no encontrada');
    return;
  }

  await strapi.documents('api::product.product').update({
    documentId: product.documentId,
    data: {
      heroTheme: 'dark',
      heroGradient: 'linear-gradient(115deg, #ff7500 0%, #ff9a3d 60%, #ffb066 100%)',
      featuresHeading: 'Aprovecha los mejores beneficios de tu Tarjeta de Débito',
      featureBoxes: [
        {
          title: 'Retiros de efectivo',
          description: 'Retiro de efectivo las 24 horas, los 365 días del año',
          icon: media['debito-feat-retiros.png']?.id,
        },
        {
          title: 'Cajeros Automáticos',
          description:
            'Acceso a cajeros automáticos a nivel nacional e internacional',
          icon: media['debito-feat-cajeros.png']?.id,
        },
        {
          title: 'Pagos y Compras',
          description:
            'Realizar pagos y compras a través POS de comercios afiliados sin intereses ni comisiones',
          icon: media['debito-feat-pagos.png']?.id,
        },
      ],
      introHeading:
        'Dispone de los fondos de tu cuenta bancaria en todo momento a través de la Tarjeta de Débito AVANZ',
      description:
        'Obtienes mayor seguridad al no portar dinero y disponibilidad de tu efectivo 24 horas los 365 días del año. Nuestra tarjeta de débito cuenta con un chip inteligente que respalda tu información personal y la de tu cuenta haciendo de ésta un medio de pago seguro.',
      promoImage: media['debito-intro-pos.jpg']?.id,
      tabsHeading: 'Nuestros Beneficios',
      benefitsIntro: '¡Descubre los beneficios de nuestra Tarjeta de Débito!',
      benefits: [
        { text: 'Asociada a una cuenta bancaria, ya sea corriente o de ahorro.' },
        { text: 'Retirar efectivo las 24 horas del día, los 365 días del año.' },
        { text: 'Acceso a ATMs a nivel nacional e internacional.' },
        { text: 'Comprar y pagar por teléfono e Internet (en cualquier moneda).' },
        {
          text: 'Realizar pagos y compras a través POS de comercios afiliados sin intereses ni comisiones.',
        },
        {
          text: 'Solicitar tarjetas de débito adicionales, asignándoles el límite de consumo que tú decidas.',
        },
        { text: 'Acceso a e-banking.' },
        { text: 'Consulta de saldo desde cualquiera de nuestros cajeros automáticos.' },
      ],
      requirements: [
        { text: 'Ser mayor de edad y presentar cédula de identidad vigente.' },
        { text: 'Contar con una cuenta bancaria activa en AVANZ (corriente o de ahorro).' },
      ],
      conditions: [],
      faqs: [
        {
          question: '¿Qué debo de hacer si he olvidado el PIN de mi tarjeta de débito?',
          answer:
            'Podés restablecer tu PIN desde Avanz Móvil, en cualquier cajero automático Avanz o llamando a nuestra sucursal telefónica 2223-7676.',
        },
        {
          question: '¿Qué debo de hacer si extravío o me roban mi tarjeta de Débito?',
          answer:
            'Bloqueá tu tarjeta de inmediato desde Avanz Móvil o llamando a la sucursal telefónica 2223-7676, disponible las 24 horas.',
        },
        {
          question: '¿Cuánto dinero puedo retirar del cajero automático por día?',
          answer:
            'El límite diario de retiro depende del tipo de cuenta; podés consultarlo y ajustarlo desde Avanz Móvil o en nuestras sucursales.',
        },
        {
          question:
            '¿Cómo desbloqueo mi tarjeta de débito si ingresé tres veces un PIN incorrecto en el cajero automático?',
          answer:
            'Por seguridad la tarjeta se bloquea tras tres intentos fallidos. Podés desbloquearla desde Avanz Móvil o llamando a la sucursal telefónica 2223-7676.',
        },
      ],
      documents: [
        { label: 'Preguntas Frecuentes - Servicios Financieros.', url: '#' },
        { label: 'Contrato de Tarjeta de Débito.', url: '#' },
        { label: 'Tarifas de Servicios.', url: '#' },
      ],
    } as any,
    status: 'published',
  });
}

// Migración v7: fotos de persona para las tarjetas de crédito
// (diseño 1506:51189 — página /tarjetas). Débito ya tenía su foto.
async function migrateV7(strapi: Core.Strapi) {
  const media = await uploadAssets(strapi, [
    'tarjeta-clasica-persona.jpg',
    'tarjeta-gold-persona.jpg',
    'tarjeta-signature-persona.jpg',
  ]);

  const updates: Record<string, any> = {
    'tarjeta-de-credito-clasica': { photo: media['tarjeta-clasica-persona.jpg']?.id },
    'tarjeta-de-credito-gold': { photo: media['tarjeta-gold-persona.jpg']?.id },
    'tarjeta-de-credito-signature': { photo: media['tarjeta-signature-persona.jpg']?.id },
  };

  for (const [slug, data] of Object.entries(updates)) {
    const product = await strapi
      .documents('api::product.product')
      .findFirst({ filters: { slug } });
    if (!product) {
      strapi.log.warn(`migrateV7: producto con slug "${slug}" no encontrado`);
      continue;
    }
    await strapi.documents('api::product.product').update({
      documentId: product.documentId,
      data,
      status: 'published',
    });
  }
}

// Migración v6: fotos de listado para las cuentas que no las tenían
// (diseño 1507:28444 — página /cuentas).
async function migrateV6(strapi: Core.Strapi) {
  const media = await uploadAssets(strapi, [
    'cuenta-corriente-list.jpg',
    'cuenta-proahorro-list.jpg',
    'cuenta-michanchito-list.jpg',
    'cuenta-miahorro-list.jpg',
    'cuenta-ahorrotrad-list.jpg',
    'cuenta-proactiva-list.jpg',
    'cuenta-dpf-list.jpg',
  ]);

  const updates: Record<string, any> = {
    'cuenta-corriente': { photo: media['cuenta-corriente-list.jpg']?.id },
    'cuenta-plan-proahorro': { photo: media['cuenta-proahorro-list.jpg']?.id },
    'cuenta-michanchito': { photo: media['cuenta-michanchito-list.jpg']?.id },
    'cuenta-miahorro': { photo: media['cuenta-miahorro-list.jpg']?.id },
    'cuenta-ahorro-tradicional': { photo: media['cuenta-ahorrotrad-list.jpg']?.id },
    'cuenta-proactiva': { photo: media['cuenta-proactiva-list.jpg']?.id },
    'deposito-a-plazo-fijo': { photo: media['cuenta-dpf-list.jpg']?.id },
  };

  for (const [slug, data] of Object.entries(updates)) {
    const product = await strapi
      .documents('api::product.product')
      .findFirst({ filters: { slug } });
    if (!product) {
      strapi.log.warn(`migrateV6: producto con slug "${slug}" no encontrado`);
      continue;
    }
    await strapi.documents('api::product.product').update({
      documentId: product.documentId,
      data,
      status: 'published',
    });
  }
}

// Migración v5: colores de hero configurables por tarjeta + imágenes y
// contenido específico de Clásica y Gold (diseños 524:887 / 524:1327).
async function migrateV5(strapi: Core.Strapi) {
  const media = await uploadAssets(strapi, ['tarjeta-clasica.png', 'tarjeta-gold.png']);

  const cardFaqs = (nombre: string) => [
    {
      question: `¿Cuántos puntos acumulo por cada dólar o córdobas en mi Tarjeta de Crédito ${nombre}?`,
      answer:
        'La acumulación depende del plan de recompensas elegido; consultá la tabla de recompensas de tu tarjeta.',
    },
    {
      question: `¿Cuántos puntos Avanz puedo acumular al mes con mi Tarjeta de Crédito ${nombre}?`,
      answer: 'No existe límite de acumulación mensual de puntos Avanz.',
    },
    {
      question: `¿Cuáles son los comercios donde puedo acumular doble puntos Avanz en mi tarjeta ${nombre.toLowerCase()}?`,
      answer:
        'Podés elegir las categorías de comercios donde realizás tus compras mensuales habituales.',
    },
    {
      question: '¿Cuántos Cash Back acumulo en mi Tarjeta de Crédito?',
      answer:
        'Depende del plan elegido: consultá los porcentajes de Cash Back en la tabla de recompensas.',
    },
    {
      question:
        '¿Cuáles son los requisitos para efectuar el canje de mis puntos Avanz o de mi CashBack?',
      answer:
        'Podés canjear desde Avanz App, llamando a nuestra sucursal telefónica 2223-7676 opción 4 o en nuestros cajeros automáticos Avanz.',
    },
  ];

  const cardDocsV5 = [
    'Reglamento Programa Puntos',
    'Reglamento Programa Cash Back',
    'Contrato de Tarjeta de Crédito',
    'Tabla de costos',
    'Guía para el cálculo de intereses',
    'Preguntas Frecuentes',
    'Guía de gestiones en e-banking',
    'Seguros relacionados a Tarjeta de Crédito',
  ].map((label) => ({ label, url: '#' }));

  const updates: Record<string, any> = {
    'tarjeta-de-credito-signature': {
      heroGradient: 'linear-gradient(90deg, #272727 0%, #808080 100%)',
    },
    'tarjeta-de-credito-clasica': {
      heroGradient:
        'linear-gradient(90deg, #2e3a7f 0%, #30b5e4 80.9%, #0091d0 100%)',
      cardImage: media['tarjeta-clasica.png']?.id,
      shortDescription: 'Para vos que buscas algo diferente, porque somos distintos',
      faqs: cardFaqs('Clásica'),
      documents: cardDocsV5,
    },
    'tarjeta-de-credito-gold': {
      heroGradient:
        'linear-gradient(90deg, #c69627 0%, #f4c82e 52.6%, #e3ba25 79.9%, #d7b01f 100%)',
      cardImage: media['tarjeta-gold.png']?.id,
      shortDescription: 'Para vos que buscas algo diferente, porque somos distintos',
      faqs: cardFaqs('Gold'),
      documents: cardDocsV5,
    },
  };

  for (const [slug, data] of Object.entries(updates)) {
    const product = await strapi
      .documents('api::product.product')
      .findFirst({ filters: { slug } });
    if (!product) continue;
    await strapi.documents('api::product.product').update({
      documentId: product.documentId,
      data,
      status: 'published',
    });
  }
}

export async function seed(strapi: Core.Strapi) {
  const store = strapi.store({ type: 'plugin', name: 'avanz-seed' });
  const version = ((await store.get({ key: 'version' })) as number) ?? 0;
  if (version >= SEED_VERSION) return;

  const existing = await strapi.documents('api::product.product').count({});

  if (existing === 0) {
    strapi.log.info('🌱 Sembrando contenido AVANZ (v2)...');
    const media = await uploadAssets(strapi);
    await seedGlobal(strapi, media);
    await seedProducts(strapi, media);
    await seedArticles(strapi, media);
    await seedPromotions(strapi);
    await seedPages(strapi, media);
    strapi.log.info('✅ Seed AVANZ v2 completado');
  }

  if (version < 3) {
    strapi.log.info('🌱 Migración AVANZ v3: detalle de productos...');
    await migrateV3(strapi);
    strapi.log.info('✅ Migración v3 completada');
  }

  if (version < 4) {
    strapi.log.info('🌱 Migración AVANZ v4: template tarjetas de crédito...');
    await migrateV4(strapi);
    strapi.log.info('✅ Migración v4 completada');
  }

  if (version < 5) {
    strapi.log.info('🌱 Migración AVANZ v5: colores y contenido por tarjeta...');
    await migrateV5(strapi);
    strapi.log.info('✅ Migración v5 completada');
  }

  if (version < 6) {
    strapi.log.info('🌱 Migración AVANZ v6: fotos de listado de cuentas...');
    await migrateV6(strapi);
    strapi.log.info('✅ Migración v6 completada');
  }

  if (version < 7) {
    strapi.log.info('🌱 Migración AVANZ v7: fotos de tarjetas de crédito...');
    await migrateV7(strapi);
    strapi.log.info('✅ Migración v7 completada');
  }

  if (version < 8) {
    strapi.log.info('🌱 Migración AVANZ v8: detalle de Tarjeta de Débito...');
    await migrateV8(strapi);
    strapi.log.info('✅ Migración v8 completada');
  }

  if (version < 9) {
    strapi.log.info('🌱 Migración AVANZ v9: canales de atención...');
    await migrateV9(strapi);
    strapi.log.info('✅ Migración v9 completada');
  }

  if (version < 10) {
    strapi.log.info('🌱 Migración AVANZ v10: audiencias y menús por audiencia...');
    await migrateV10(strapi);
    strapi.log.info('✅ Migración v10 completada');
  }

  if (version < 11) {
    strapi.log.info('🌱 Migración AVANZ v11: menú de Sobre nosotros...');
    await migrateV11(strapi);
    strapi.log.info('✅ Migración v11 completada');
  }

  if (version < 12) {
    strapi.log.info('🌱 Migración AVANZ v12: página Sobre Avanz por secciones...');
    await migrateV12(strapi);
    strapi.log.info('✅ Migración v12 completada');
  }

  if (version < 13) {
    strapi.log.info('🌱 Migración AVANZ v13: página Transparencia (Info Financiera)...');
    await migrateV13(strapi);
    strapi.log.info('✅ Migración v13 completada');
  }

  if (version < 14) {
    strapi.log.info('🌱 Migración AVANZ v14: página Regulatorio...');
    await migrateV14(strapi);
    strapi.log.info('✅ Migración v14 completada');
  }

  if (version < 15) {
    strapi.log.info('🌱 Migración AVANZ v15: página Trabajá con nosotros...');
    await migrateV15(strapi);
    strapi.log.info('✅ Migración v15 completada');
  }

  if (version < 16) {
    strapi.log.info('🌱 Migración AVANZ v16: contenido real de avanzbanc.com...');
    await migrateV16(strapi);
    strapi.log.info('✅ Migración v16 completada');
  }

  await store.set({ key: 'version', value: SEED_VERSION });
}

// Migración v4: template de tarjetas de crédito (hero oscuro, feature boxes,
// planes de recompensa, canje) según diseño Figma 1549:10386.
async function migrateV4(strapi: Core.Strapi) {
  const media = await uploadAssets(strapi, [
    'tarjeta-signature.png',
    'feat-beneficios.svg',
    'feat-fechas.svg',
    'feat-medida.svg',
    'reward-puntos.svg',
    'reward-cashback-fill.svg',
    'reward-tasa.svg',
  ]);

  const featureBoxes = [
    {
      title: 'Más beneficios',
      description: 'Nosotros premiamos tus hábitos de consumo.',
      icon: media['feat-beneficios.svg']?.id,
    },
    {
      title: 'Fechas de pago flexibles',
      description: 'Te ofrecemos diferentes fechas de pago que se ajustan a tu realidad.',
      icon: media['feat-fechas.svg']?.id,
    },
    {
      title: 'Tu tarjeta a tu medida',
      description: 'Disfrutá la experiencia de diseñar tu tarjeta a tu medida.',
      icon: media['feat-medida.svg']?.id,
    },
  ];

  const redeemIntro =
    'Podes hacer efectiva tu recompensa depositándola a tus Cuentas o pagar tus saldos de Tarjetas de Crédito en los siguientes canales:';
  const redeemItems = [
    { text: 'Desde Avanz App de forma fácil y rápida.' },
    { text: 'Llama a nuestra sucursal telefónica 2223-7676 opción 4.' },
    { text: 'En nuestros cajeros automáticos Avanz.' },
  ];

  const rewardPlan = (
    title: string,
    programText: string,
    bonusText: string,
    icon?: any,
  ) => ({
    title,
    ctaLabel: 'Solicitala aquí',
    ctaUrl: '/canales-de-atencion',
    programText,
    bonusText,
    icon,
  });

  const cardDocs = (extra: string[] = []) =>
    [
      'Contrato de Tarjeta de Crédito.',
      ...extra,
      'Tabla de costos',
      'Guía para el cálculo de intereses en Tarjeta de Crédito.',
      'Preguntas Frecuentes.',
      'Guía de gestiones en e-banking.',
      'Reglamento Programa Puntos',
      'Reglamento Programa Cash Back',
    ].map((label) => ({ label, url: '#' }));

  const updates: Record<string, any> = {
    'tarjeta-de-credito-signature': {
      heroTheme: 'dark',
      cardImage: media['tarjeta-signature.png']?.id,
      shortDescription:
        'Exclusividad y lujo se unen en nuestra Tarjeta Signature. Descubre un mundo de privilegios sin igual',
      featuresHeading: 'Con nosotros...\n¡Tus hábitos te recompensan!',
      featureBoxes,
      benefitsIntro: '¡Descubre los beneficios de tener un Tarjeta de Crédito Signature!',
      benefits: [
        { text: 'Acumulá beneficios en todas tus compras del mes.' },
        {
          text: 'Elegí acumular doble beneficio en los comercios donde realizás tus compras mensuales habituales, podes combinar hasta dos categorías de comercios.',
        },
      ],
      requirements: [],
      conditions: [],
      redeemIntro,
      redeemItems,
      rewardPlans: [
        rewardPlan(
          'Programa de Puntos',
          '1.50 puntos por cada dólar de compra en todos los comercios\n3 puntos por cada dólar de compra en comercios seleccionados por vos',
          '6,500 puntos (por consumo $5,000 los primeros 60 días)',
          media['reward-puntos.svg']?.id,
        ),
        rewardPlan(
          'Cash Back',
          '1% Cash Back por cada dólar de compra en todos los comercios y por cada dólar pagado a tu tarjeta\n2% Cash Back por cada dólar de compra en comercios seleccionados por vos',
          '4% Cash Back (la primera compra en los primeros 60 días, máx. $50)',
          media['reward-cashback-fill.svg']?.id,
        ),
        rewardPlan(
          'Tasa Preferencial',
          'No aplica',
          'C$1,000 (por consumo C$2,000 los primeros 60 días)',
          media['reward-tasa.svg']?.id,
        ),
      ],
      faqs: [
        {
          question:
            '¿Cuántos puntos acumulo por cada dólar de consumo (o su equivalente en córdobas) en mi tarjeta de crédito Signature?',
          answer:
            'Acumulás 1.50 puntos por cada dólar de compra en todos los comercios y 3 puntos en los comercios seleccionados por vos.',
        },
        {
          question: '¿Cuántos puntos Avanz puedo acumular al mes?',
          answer: 'No existe límite de acumulación mensual de puntos Avanz.',
        },
        {
          question:
            '¿Cuáles son los comercios donde puedo acumular doble puntos Avanz en mi tarjeta Signature?',
          answer:
            'Podés elegir hasta dos categorías de comercios donde realizás tus compras mensuales habituales.',
        },
        {
          question:
            '¿Puedo entrar gratis al salón VIP del Aeropuerto de Managua con mi tarjeta Signature de Avanz?',
          answer:
            'Sí, tu Tarjeta Signature incluye acceso al salón VIP a través del programa PriorityPass.',
        },
      ],
      documents: cardDocs(['Programa PriorityPass']),
    },
    'tarjeta-de-credito-clasica': {
      heroTheme: 'dark',
      shortDescription: 'Con nosotros... ¡Tus hábitos te recompensan!',
      featuresHeading: 'Con nosotros...\n¡Tus hábitos te recompensan!',
      featureBoxes,
      benefitsIntro: '¡Descubre los beneficios de tener un Tarjeta de Crédito Clásica!',
      requirements: [],
      conditions: [],
      redeemIntro,
      redeemItems,
      rewardPlans: [
        rewardPlan(
          'Programa de Puntos',
          '1.25 puntos por cada dólar de compra en todos los comercios\n2.5 puntos por cada dólar de compra en comercios seleccionados por vos',
          '5,000 puntos (por consumo $750 los primeros 60 días)',
          media['reward-puntos.svg']?.id,
        ),
        rewardPlan(
          'Cash Back',
          '1% Cash Back por cada dólar de compra en todos los comercios y por cada dólar pagado a tu tarjeta\n2% Cash Back por cada dólar de compra en comercios seleccionados por vos',
          '2% Cash Back (la primera compra en los primeros 60 días, máx. $25)',
          media['reward-cashback-fill.svg']?.id,
        ),
        rewardPlan(
          'Tasa Preferencial',
          'No aplica',
          'C$500 (por consumo C$1,000 los primeros 60 días)',
          media['reward-tasa.svg']?.id,
        ),
      ],
      documents: cardDocs(),
    },
    'tarjeta-de-credito-gold': {
      heroTheme: 'dark',
      shortDescription: 'Con nosotros... ¡Tus hábitos te recompensan!',
      featuresHeading: 'Con nosotros...\n¡Tus hábitos te recompensan!',
      featureBoxes,
      benefitsIntro: '¡Descubre los beneficios de tener un Tarjeta de Crédito Gold!',
      requirements: [],
      conditions: [],
      redeemIntro,
      redeemItems,
      rewardPlans: [
        rewardPlan(
          'Programa de Puntos',
          '2.5 puntos por cada dólar de compra en comercios elegidos por vos\n1.25 puntos por cada dólar de compra en otros comercios',
          '5,000 puntos (por consumo USD 750 los primeros 60 días)',
          media['reward-puntos.svg']?.id,
        ),
        rewardPlan(
          'Cash Back',
          '2% Cash Back por cada dólar de compra en comercios elegidos por vos\n1% Cash Back por cada dólar de compra en otros comercios',
          '2% Cash Back (la 1ra compra en los primeros 60 días, máx. $25)',
          media['reward-cashback-fill.svg']?.id,
        ),
        rewardPlan(
          'Tasa Preferencial',
          'No aplica',
          'C$500 (por consumo C$1,000 los primeros 60 días)',
          media['reward-tasa.svg']?.id,
        ),
      ],
      documents: cardDocs(),
    },
  };

  for (const [slug, data] of Object.entries(updates)) {
    const product = await strapi
      .documents('api::product.product')
      .findFirst({ filters: { slug } });
    if (!product) continue;
    await strapi.documents('api::product.product').update({
      documentId: product.documentId,
      data,
      status: 'published',
    });
  }
}

// Migración v3: campos de detalle de producto (FAQ, documentos, tabs) y URLs de apps,
// actualizando la base existente sin re-crearla.
async function migrateV3(strapi: Core.Strapi) {
  const media = await uploadAssets(strapi, ['naranja-hero.jpg', 'naranja-promo.jpg']);

  const defaultFaqs = [
    {
      question: '¿Cuáles son los beneficios de una cuenta corriente?',
      answer:
        'Acceso inmediato a tu dinero, uso de cheques y tarjeta de débito, transferencias con facilidad y gestión 24/7 desde nuestras plataformas digitales.',
    },
    {
      question: '¿Se puede abrir una cuenta bancaria para un menor de edad?',
      answer:
        'Sí, contamos con cuentas diseñadas para menores como MiChanchito, que promueven el hábito del ahorro desde temprana edad.',
    },
    {
      question: '¿Las cuentas bancarias ganan mantenimiento de valor?',
      answer:
        'Las cuentas en córdobas cuentan con mantenimiento de valor conforme a las regulaciones vigentes.',
    },
  ];

  const defaultDocuments = [
    { label: 'Preguntas Frecuentes Cuenta Corriente.', url: '#' },
    { label: 'Preguntas y Respuestas Codigo IBAN.', url: '#' },
    { label: 'Contrato de depósito a la vista y sus servicios relacionados.', url: '#' },
    { label: 'Guía para el cálculo de intereses.', url: '#' },
    { label: 'Preguntas frecuentes sobre el Truncamiento de Cheques en Nicaragua.', url: '#' },
  ];

  const defaultConditions = [
    { text: 'Monto mínimo de apertura según el tipo de cuenta.' },
    { text: 'Presentar cédula de identidad vigente.' },
    { text: 'Aplican términos y condiciones según contrato.' },
  ];

  const updates: Record<string, any> = {
    'cuenta-naranja': {
      photo: media['naranja-hero.jpg']?.id,
      promoImage: media['naranja-promo.jpg']?.id,
      introHeading:
        'Invertí en el futuro de tu familia con una Cuenta Naranja y obtené los mejores beneficios',
      description:
        'Nuestra Cuenta de Ahorro Naranja, es única en el mercado, esta combina una buena tasa de interés con disponibilidad de fondos inmediatos y sin plazos pactados. ¡Te damos más por tu dinero! Abrí YA tu cuenta de ahorro naranja desde US$1,000 o su equivalente en córdobas y ganás 3% de interés desde el primer día de apertura.',
      benefitsIntro: '¡Descubre los beneficios de nuestra cuenta naranja!',
      conditions: defaultConditions,
      faqs: defaultFaqs,
      documents: defaultDocuments,
    },
    'cuenta-corriente': {
      introHeading: 'Descubre la libertad financiera con una Cuenta Corriente AVANZ',
      benefitsIntro: '¡Descubre los beneficios de nuestra cuenta corriente a la vista!',
      conditions: defaultConditions,
      faqs: defaultFaqs,
      documents: defaultDocuments,
    },
    'tarjeta-de-debito': {
      introHeading: 'Aprovecha los mejores beneficios de tu Tarjeta de Débito',
      benefitsIntro: 'Nuestros Beneficios',
      faqs: defaultFaqs.slice(0, 2),
      documents: defaultDocuments.slice(0, 2),
    },
  };

  for (const [slug, data] of Object.entries(updates)) {
    const product = await strapi
      .documents('api::product.product')
      .findFirst({ filters: { slug } });
    if (!product) continue;
    await strapi.documents('api::product.product').update({
      documentId: product.documentId,
      data,
      status: 'published',
    });
  }

  // Resto de productos: FAQ/documentos/condiciones genéricos para que ninguna
  // página de detalle quede vacía (editable luego desde el admin).
  const all = await strapi
    .documents('api::product.product')
    .findMany({ pagination: { pageSize: 100 } } as any);
  for (const product of all as any[]) {
    if (updates[product.slug]) continue;
    await strapi.documents('api::product.product').update({
      documentId: product.documentId,
      data: {
        benefitsIntro: `Descubre los beneficios de ${product.name}`,
        faqs: defaultFaqs,
        documents: defaultDocuments.slice(0, 3),
        conditions: defaultConditions,
      } as any,
      status: 'published',
    });
  }

  // URLs de tiendas de apps en Global
  const global = await strapi.documents('api::global.global').findFirst({});
  if (global) {
    await strapi.documents('api::global.global').update({
      documentId: global.documentId,
      data: {
        appStoreUrl: 'https://apps.apple.com',
        playStoreUrl: 'https://play.google.com',
      } as any,
    });
  }
}

type MediaMap = Record<string, any>;

async function uploadAssets(strapi: Core.Strapi, only?: string[]): Promise<MediaMap> {
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
    if (only && !only.includes(fileName)) continue;
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
