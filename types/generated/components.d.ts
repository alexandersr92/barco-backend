import type { Schema, Struct } from '@strapi/strapi';

export interface ElementsDocumentLink extends Struct.ComponentSchema {
  collectionName: 'components_elements_document_links';
  info: {
    displayName: 'Document Link';
    icon: 'file';
  };
  attributes: {
    description: Schema.Attribute.Text;
    file: Schema.Attribute.Media<'files' | 'images'>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String;
  };
}

export interface ElementsFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_elements_faq_items';
  info: {
    displayName: 'FAQ Item';
    icon: 'question';
  };
  attributes: {
    answer: Schema.Attribute.Text;
    question: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ElementsIconFeature extends Struct.ComponentSchema {
  collectionName: 'components_elements_icon_features';
  info: {
    displayName: 'Icon Feature';
    icon: 'star';
  };
  attributes: {
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ElementsInfoCard extends Struct.ComponentSchema {
  collectionName: 'components_elements_info_cards';
  info: {
    displayName: 'Info Card';
    icon: 'grid';
  };
  attributes: {
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    kicker: Schema.Attribute.String;
    linkLabel: Schema.Attribute.String;
    linkUrl: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ElementsLeader extends Struct.ComponentSchema {
  collectionName: 'components_elements_leaders';
  info: {
    displayName: 'L\u00EDder';
    icon: 'user';
  };
  attributes: {
    group: Schema.Attribute.String;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    photo: Schema.Attribute.Media<'images'>;
    role: Schema.Attribute.String;
  };
}

export interface ElementsQuickLink extends Struct.ComponentSchema {
  collectionName: 'components_elements_quick_links';
  info: {
    displayName: 'Quick Link';
    icon: 'cursor';
  };
  attributes: {
    icon: Schema.Attribute.Media<'images'>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    prefix: Schema.Attribute.String;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ElementsRewardPlan extends Struct.ComponentSchema {
  collectionName: 'components_elements_reward_plans';
  info: {
    displayName: 'Reward Plan';
    icon: 'gift';
  };
  attributes: {
    bonusText: Schema.Attribute.Text;
    ctaLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Solicitala aqu\u00ED'>;
    ctaUrl: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/canales-de-atencion'>;
    icon: Schema.Attribute.Media<'images'>;
    programText: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ElementsSocialLink extends Struct.ComponentSchema {
  collectionName: 'components_elements_social_links';
  info: {
    displayName: 'Social Link';
    icon: 'earth';
  };
  attributes: {
    icon: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ElementsTitledText extends Struct.ComponentSchema {
  collectionName: 'components_elements_titled_texts';
  info: {
    displayName: 'Bloque con t\u00EDtulo';
    icon: 'align-left';
  };
  attributes: {
    text: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface LayoutFooterColumn extends Struct.ComponentSchema {
  collectionName: 'components_layout_footer_columns';
  info: {
    displayName: 'Footer Column';
    icon: 'layout';
  };
  attributes: {
    links: Schema.Attribute.Component<'shared.link', true>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface LayoutNavItem extends Struct.ComponentSchema {
  collectionName: 'components_layout_nav_items';
  info: {
    displayName: 'Nav Item';
    icon: 'bulletList';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    links: Schema.Attribute.Component<'shared.link', true>;
    url: Schema.Attribute.String;
  };
}

export interface SectionsAppBanner extends Struct.ComponentSchema {
  collectionName: 'components_sections_app_banners';
  info: {
    displayName: 'App Banner';
    icon: 'phone';
  };
  attributes: {
    appStoreUrl: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    playStoreUrl: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SectionsCardGrid extends Struct.ComponentSchema {
  collectionName: 'components_sections_card_grids';
  info: {
    description: 'Tarjetas con imagen arriba, kicker, t\u00EDtulo, descripci\u00F3n y bot\u00F3n';
    displayName: 'Grilla de tarjetas';
    icon: 'grid';
  };
  attributes: {
    cards: Schema.Attribute.Component<'elements.info-card', true>;
    heading: Schema.Attribute.String;
  };
}

export interface SectionsChannelsBar extends Struct.ComponentSchema {
  collectionName: 'components_sections_channels_bars';
  info: {
    displayName: 'Channels Bar';
    icon: 'headset';
  };
  attributes: {
    linkLabel: Schema.Attribute.String;
    linkUrl: Schema.Attribute.String;
    text: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Conoc\u00E9 nuestros canales de atenci\u00F3n'>;
  };
}

export interface SectionsChannelsConverter extends Struct.ComponentSchema {
  collectionName: 'components_sections_channels_converters';
  info: {
    displayName: 'Channels + Converter';
    icon: 'exchangeFunds';
  };
  attributes: {
    buttonLabel: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Conoc\u00E9 m\u00E1s'>;
    buttonUrl: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'/canales-de-atencion'>;
    icon: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Conoc\u00E9 nuestros canales de atenci\u00F3n'>;
  };
}

export interface SectionsDocumentGroup extends Struct.ComponentSchema {
  collectionName: 'components_sections_document_groups';
  info: {
    description: 'Encabezado + intro + lista de documentos descargables (con descripci\u00F3n opcional)';
    displayName: 'Grupo de documentos';
    icon: 'file';
  };
  attributes: {
    anchorId: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    intro: Schema.Attribute.Text;
    items: Schema.Attribute.Component<'elements.document-link', true>;
  };
}

export interface SectionsFeatureBanner extends Struct.ComponentSchema {
  collectionName: 'components_sections_feature_banners';
  info: {
    displayName: 'Feature Banner';
    icon: 'picture';
  };
  attributes: {
    buttonLabel: Schema.Attribute.String;
    buttonUrl: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    illustration: Schema.Attribute.Media<'images'>;
    kicker: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    variant: Schema.Attribute.Enumeration<['orange', 'teal']> &
      Schema.Attribute.DefaultTo<'orange'>;
  };
}

export interface SectionsHero extends Struct.ComponentSchema {
  collectionName: 'components_sections_heroes';
  info: {
    displayName: 'Hero';
    icon: 'picture';
  };
  attributes: {
    buttons: Schema.Attribute.Component<'shared.button', true>;
    compact: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    image: Schema.Attribute.Media<'images'>;
    kicker: Schema.Attribute.String;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    variant: Schema.Attribute.Enumeration<['primary', 'secondary']> &
      Schema.Attribute.DefaultTo<'primary'>;
  };
}

export interface SectionsIconBlock extends Struct.ComponentSchema {
  collectionName: 'components_sections_icon_blocks';
  info: {
    description: '\u00CDcono o logo centrado + t\u00EDtulo + texto + bot\u00F3n opcional';
    displayName: 'Bloque con \u00EDcono';
    icon: 'information';
  };
  attributes: {
    align: Schema.Attribute.Enumeration<['center', 'left']> &
      Schema.Attribute.DefaultTo<'center'>;
    anchorId: Schema.Attribute.String;
    body: Schema.Attribute.Text;
    buttonLabel: Schema.Attribute.String;
    buttonUrl: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    icon: Schema.Attribute.Media<'images'>;
    iconWidth: Schema.Attribute.Integer;
  };
}

export interface SectionsIconColumns extends Struct.ComponentSchema {
  collectionName: 'components_sections_icon_columns';
  info: {
    description: 'N columnas centradas con \u00EDcono, t\u00EDtulo y descripci\u00F3n, con divisores opcionales';
    displayName: 'Columnas con \u00EDcono';
    icon: 'grid';
  };
  attributes: {
    anchorId: Schema.Attribute.String;
    dividers: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'elements.icon-feature', true>;
    kicker: Schema.Attribute.String;
  };
}

export interface SectionsInfoCards extends Struct.ComponentSchema {
  collectionName: 'components_sections_info_cards';
  info: {
    displayName: 'Info Cards';
    icon: 'grid';
  };
  attributes: {
    cards: Schema.Attribute.Component<'elements.info-card', true>;
    heading: Schema.Attribute.String;
  };
}

export interface SectionsLeaders extends Struct.ComponentSchema {
  collectionName: 'components_sections_leaders';
  info: {
    description: 'L\u00EDderes agrupados en pesta\u00F1as';
    displayName: 'Nuestros l\u00EDderes';
    icon: 'users';
  };
  attributes: {
    heading: Schema.Attribute.String;
    kicker: Schema.Attribute.String;
    leaders: Schema.Attribute.Component<'elements.leader', true>;
  };
}

export interface SectionsMediaText extends Struct.ComponentSchema {
  collectionName: 'components_sections_media_texts';
  info: {
    description: 'T\u00EDtulo + subt\u00EDtulo + texto y hasta dos im\u00E1genes, con fondo opcional';
    displayName: 'Texto con im\u00E1genes';
    icon: 'picture';
  };
  attributes: {
    background: Schema.Attribute.Enumeration<['none', 'primary', 'secondary']> &
      Schema.Attribute.DefaultTo<'none'>;
    body: Schema.Attribute.Text;
    heading: Schema.Attribute.String;
    images: Schema.Attribute.Media<'images', true>;
    subheading: Schema.Attribute.Text;
  };
}

export interface SectionsMissionVision extends Struct.ComponentSchema {
  collectionName: 'components_sections_mission_visions';
  info: {
    description: 'Bloques de texto con t\u00EDtulo a la izquierda y una foto a la derecha';
    displayName: 'Misi\u00F3n y Visi\u00F3n';
    icon: 'bullhorn';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
    items: Schema.Attribute.Component<'elements.titled-text', true>;
  };
}

export interface SectionsNewsList extends Struct.ComponentSchema {
  collectionName: 'components_sections_news_lists';
  info: {
    displayName: 'News List';
    icon: 'feather';
  };
  attributes: {
    heading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'Noticias Avanz'>;
    limit: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<3>;
  };
}

export interface SectionsPillNav extends Struct.ComponentSchema {
  collectionName: 'components_sections_pill_navs';
  info: {
    description: 'Barra de anclas/enlaces con forma de p\u00EDldora bajo el hero';
    displayName: 'Barra de p\u00EDldoras';
    icon: 'bulletList';
  };
  attributes: {
    items: Schema.Attribute.Component<'shared.link', true>;
  };
}

export interface SectionsProductGrid extends Struct.ComponentSchema {
  collectionName: 'components_sections_product_grids';
  info: {
    displayName: 'Product Grid';
    icon: 'apps';
  };
  attributes: {
    audience: Schema.Attribute.Enumeration<['personas', 'empresas']>;
    category: Schema.Attribute.Enumeration<
      ['cuenta', 'tarjeta', 'credito', 'servicio']
    >;
    heading: Schema.Attribute.String;
  };
}

export interface SectionsProductLinks extends Struct.ComponentSchema {
  collectionName: 'components_sections_product_links';
  info: {
    displayName: 'Product Links';
    icon: 'apps';
  };
  attributes: {
    items: Schema.Attribute.Component<'elements.quick-link', true>;
  };
}

export interface SectionsProductShowcase extends Struct.ComponentSchema {
  collectionName: 'components_sections_product_showcases';
  info: {
    displayName: 'Product Showcase';
    icon: 'creditCard';
  };
  attributes: {
    buttons: Schema.Attribute.Component<'shared.button', true>;
    cardImage: Schema.Attribute.Media<'images'>;
    description: Schema.Attribute.Text;
    features: Schema.Attribute.Component<'shared.feature-item', true>;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    imageLeft: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    photo: Schema.Attribute.Media<'images'>;
  };
}

export interface SectionsPromotionsList extends Struct.ComponentSchema {
  collectionName: 'components_sections_promotions_lists';
  info: {
    displayName: 'Promotions List';
    icon: 'gift';
  };
  attributes: {
    heading: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u00A1Ent\u00E9rate de las promociones que Avanz tiene para vos!'>;
    limit: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<2>;
  };
}

export interface SectionsQuoteBanner extends Struct.ComponentSchema {
  collectionName: 'components_sections_quote_banners';
  info: {
    description: 'Foto + cita destacada, con t\u00EDtulo, texto y fondo opcionales';
    displayName: 'Banner con cita';
    icon: 'quote';
  };
  attributes: {
    attribution: Schema.Attribute.String;
    background: Schema.Attribute.Enumeration<
      ['none', 'primary', 'primaryLight', 'secondary', 'surface']
    > &
      Schema.Attribute.DefaultTo<'none'>;
    body: Schema.Attribute.Text;
    heading: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    imagePosition: Schema.Attribute.Enumeration<['left', 'right']> &
      Schema.Attribute.DefaultTo<'left'>;
    kicker: Schema.Attribute.String;
    quote: Schema.Attribute.Text;
  };
}

export interface SectionsRichText extends Struct.ComponentSchema {
  collectionName: 'components_sections_rich_texts';
  info: {
    displayName: 'Rich Text';
    icon: 'blocks';
  };
  attributes: {
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    body: Schema.Attribute.RichText;
    maxWidth: Schema.Attribute.Integer;
  };
}

export interface SectionsRoleGrid extends Struct.ComponentSchema {
  collectionName: 'components_sections_role_grids';
  info: {
    description: 'Columna izquierda (t\u00EDtulo + texto + bot\u00F3n) y grilla de celdas de texto a la derecha';
    displayName: 'Roles / grilla de texto';
    icon: 'grid';
  };
  attributes: {
    body: Schema.Attribute.Text;
    buttonLabel: Schema.Attribute.String;
    buttonUrl: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'elements.titled-text', true>;
  };
}

export interface SectionsSectionHeading extends Struct.ComponentSchema {
  collectionName: 'components_sections_section_headings';
  info: {
    displayName: 'Section Heading';
    icon: 'bold';
  };
  attributes: {
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    background: Schema.Attribute.Enumeration<['none', 'secondary']> &
      Schema.Attribute.DefaultTo<'none'>;
    kicker: Schema.Attribute.String;
    maxWidth: Schema.Attribute.Integer;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SectionsSplitText extends Struct.ComponentSchema {
  collectionName: 'components_sections_split_texts';
  info: {
    description: 'T\u00EDtulo grande a la izquierda y p\u00E1rrafo a la derecha';
    displayName: 'Texto en dos columnas';
    icon: 'layout';
  };
  attributes: {
    body: Schema.Attribute.Text;
    divider: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    heading: Schema.Attribute.String;
    kicker: Schema.Attribute.String;
  };
}

export interface SectionsValuesGrid extends Struct.ComponentSchema {
  collectionName: 'components_sections_values_grids';
  info: {
    description: 'Valores con \u00EDcono y descripci\u00F3n alrededor de una imagen central';
    displayName: 'Valores con \u00EDconos';
    icon: 'star';
  };
  attributes: {
    centerImage: Schema.Attribute.Media<'images'>;
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'elements.icon-feature', true>;
    kicker: Schema.Attribute.String;
  };
}

export interface SharedButton extends Struct.ComponentSchema {
  collectionName: 'components_shared_buttons';
  info: {
    displayName: 'Button';
    icon: 'cursor';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
    variant: Schema.Attribute.Enumeration<['primary', 'outline', 'link']> &
      Schema.Attribute.DefaultTo<'primary'>;
  };
}

export interface SharedFeatureItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_feature_items';
  info: {
    displayName: 'Feature Item';
    icon: 'check';
  };
  attributes: {
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface SharedLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_links';
  info: {
    displayName: 'Link';
    icon: 'link';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    displayName: 'SEO';
    icon: 'search';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text;
    metaTitle: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'elements.document-link': ElementsDocumentLink;
      'elements.faq-item': ElementsFaqItem;
      'elements.icon-feature': ElementsIconFeature;
      'elements.info-card': ElementsInfoCard;
      'elements.leader': ElementsLeader;
      'elements.quick-link': ElementsQuickLink;
      'elements.reward-plan': ElementsRewardPlan;
      'elements.social-link': ElementsSocialLink;
      'elements.titled-text': ElementsTitledText;
      'layout.footer-column': LayoutFooterColumn;
      'layout.nav-item': LayoutNavItem;
      'sections.app-banner': SectionsAppBanner;
      'sections.card-grid': SectionsCardGrid;
      'sections.channels-bar': SectionsChannelsBar;
      'sections.channels-converter': SectionsChannelsConverter;
      'sections.document-group': SectionsDocumentGroup;
      'sections.feature-banner': SectionsFeatureBanner;
      'sections.hero': SectionsHero;
      'sections.icon-block': SectionsIconBlock;
      'sections.icon-columns': SectionsIconColumns;
      'sections.info-cards': SectionsInfoCards;
      'sections.leaders': SectionsLeaders;
      'sections.media-text': SectionsMediaText;
      'sections.mission-vision': SectionsMissionVision;
      'sections.news-list': SectionsNewsList;
      'sections.pill-nav': SectionsPillNav;
      'sections.product-grid': SectionsProductGrid;
      'sections.product-links': SectionsProductLinks;
      'sections.product-showcase': SectionsProductShowcase;
      'sections.promotions-list': SectionsPromotionsList;
      'sections.quote-banner': SectionsQuoteBanner;
      'sections.rich-text': SectionsRichText;
      'sections.role-grid': SectionsRoleGrid;
      'sections.section-heading': SectionsSectionHeading;
      'sections.split-text': SectionsSplitText;
      'sections.values-grid': SectionsValuesGrid;
      'shared.button': SharedButton;
      'shared.feature-item': SharedFeatureItem;
      'shared.link': SharedLink;
      'shared.seo': SharedSeo;
    }
  }
}
