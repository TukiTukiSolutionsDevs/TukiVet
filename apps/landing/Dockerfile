# syntax=docker/dockerfile:1.7

FROM nginx:1.27-alpine

RUN rm -rf /usr/share/nginx/html/* \
    && rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/landing.conf

COPY index.html nosotros.html servicios.html contacto.html /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
COPY uploads /usr/share/nginx/html/uploads

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
