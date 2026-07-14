import type { Core } from '@strapi/strapi';
import { seed } from './seed';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await setPublicPermissions(strapi);
    await seed(strapi);
  },
};

// Habilita find/findOne del rol Public para los tipos de contenido del sitio
async function setPublicPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) return;

  const actions = [
    'api::global.global.find',
    'api::product.product.find',
    'api::product.product.findOne',
    'api::article.article.find',
    'api::article.article.findOne',
    'api::promotion.promotion.find',
    'api::promotion.promotion.findOne',
    'api::page.page.find',
    'api::page.page.findOne',
  ];

  for (const action of actions) {
    const exists = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: publicRole.id } });
    if (!exists) {
      await strapi.db
        .query('plugin::users-permissions.permission')
        .create({ data: { action, role: publicRole.id } });
    }
  }
}
