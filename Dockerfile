# Imagen de producción para Strapi v5 (TypeScript)
FROM node:22-alpine AS build
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev bash git
WORKDIR /opt/app
COPY package.json package-lock.json ./
# NODE_ENV sin fijar en build → instala devDependencies (typescript) necesarias para compilar
RUN npm config set fetch-retry-maxtimeout 600000 -g && npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache vips-dev
WORKDIR /opt/app
ENV NODE_ENV=production
COPY --from=build /opt/app ./
EXPOSE 1337
CMD ["npm", "run", "start"]
