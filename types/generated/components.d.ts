import type { Schema, Struct } from '@strapi/strapi';

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

export interface SectionsHero extends Struct.ComponentSchema {
  collectionName: 'components_sections_heroes';
  info: {
    displayName: 'Hero';
    icon: 'picture';
  };
  attributes: {
    buttons: Schema.Attribute.Component<'shared.button', true>;
    image: Schema.Attribute.Media<'images'>;
    kicker: Schema.Attribute.String;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
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

export interface SectionsRichText extends Struct.ComponentSchema {
  collectionName: 'components_sections_rich_texts';
  info: {
    displayName: 'Rich Text';
    icon: 'blocks';
  };
  attributes: {
    body: Schema.Attribute.RichText;
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
      'elements.info-card': ElementsInfoCard;
      'layout.footer-column': LayoutFooterColumn;
      'layout.nav-item': LayoutNavItem;
      'sections.app-banner': SectionsAppBanner;
      'sections.channels-bar': SectionsChannelsBar;
      'sections.hero': SectionsHero;
      'sections.info-cards': SectionsInfoCards;
      'sections.news-list': SectionsNewsList;
      'sections.product-grid': SectionsProductGrid;
      'sections.product-showcase': SectionsProductShowcase;
      'sections.promotions-list': SectionsPromotionsList;
      'sections.rich-text': SectionsRichText;
      'shared.button': SharedButton;
      'shared.feature-item': SharedFeatureItem;
      'shared.link': SharedLink;
      'shared.seo': SharedSeo;
    }
  }
}
