FROM node:24-alpine AS build
WORKDIR /squid
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json schema.graphql ./
COPY src ./src
RUN pnpm run build

FROM node:24-alpine
WORKDIR /squid
ENV NODE_ENV=production
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /squid/lib ./lib
COPY schema.graphql ./
COPY db ./db
CMD ["node", "lib/main.js"]
