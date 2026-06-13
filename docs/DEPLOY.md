# DEPLOY · Razas Stack

Stack completo en Docker con SSL automático vía Caddy + Let's Encrypt.

## Arquitectura productiva

```
                   ┌──────────────────────┐
   80/443 ─────►   │   Caddy (proxy SSL)  │
                   └──────────┬───────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
  razas.com.pe         app.razas.com.pe      api.razas.com.pe
  ┌───────────┐        ┌───────────────┐     ┌─────────────┐
  │  landing  │        │ web (Next.js) │     │ api (FastAPI)│
  │  nginx    │        │  standalone   │     │  uvicorn     │
  └───────────┘        └───────────────┘     └──────┬───────┘
                                                     │
                                ┌────────────────────┼────────────────────┐
                                ▼                    ▼                    ▼
                          ┌─────────┐         ┌─────────┐         ┌──────────┐
                          │ postgres│         │  redis  │         │  minio   │
                          └─────────┘         └─────────┘         └──────────┘
```

| Servicio  | Imagen                      | Puerto interno | Subdominio público     |
|-----------|-----------------------------|----------------|------------------------|
| caddy     | `caddy:2-alpine`            | 80 / 443       | (todos)                |
| landing   | `razas/landing`             | 80             | `razas.com.pe`         |
| web       | `razas/web` (Next.js)       | 3000           | `app.razas.com.pe`     |
| api       | `razas/api` (FastAPI)       | 8000           | `api.razas.com.pe`     |
| postgres  | `postgres:16-alpine`        | 5432           | interno                |
| redis     | `redis:7-alpine`            | 6379           | interno                |
| minio     | `quay.io/minio/minio`       | 9000 / 9001    | interno                |

## Pre-requisitos del VPS

- Ubuntu 22.04+ / Debian 12+ con `docker` y `docker compose` v2.
- Puertos `80` y `443` abiertos en el firewall.
- Dominio `razas.com.pe` con registros DNS apuntando al VPS:

  ```
  A      razas.com.pe          <IP_VPS>
  A      www.razas.com.pe      <IP_VPS>
  A      app.razas.com.pe      <IP_VPS>
  A      api.razas.com.pe      <IP_VPS>
  ```

## Despliegue paso a paso

### 1. Clonar el repo en el VPS

```bash
git clone <repo> /opt/razas
cd /opt/razas
```

### 2. Configurar variables de entorno

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

**Obligatorio cambiar antes de lanzar:**

- `POSTGRES_PASSWORD` → password fuerte
- `MINIO_ROOT_PASSWORD` → password fuerte (== `S3_SECRET_KEY`)
- `SECRET_KEY` → generar con `openssl rand -hex 32`
- `ACME_EMAIL` → email real para alertas de Let's Encrypt
- `TUKIFACT_API_KEY`, `TWILIO_*` → credenciales reales

### 3. Build + arranque

```bash
cd infra
docker compose -f docker-compose.prod.yml --env-file ../.env.prod build
docker compose -f docker-compose.prod.yml --env-file ../.env.prod up -d
```

Caddy negocia automáticamente los certificados Let's Encrypt al primer arranque (puede tardar 1–2 min).

### 4. Migraciones de la BD

```bash
docker compose -f docker-compose.prod.yml --env-file ../.env.prod \
  exec api alembic upgrade head
```

### 5. Crear bucket en MinIO

```bash
docker compose -f docker-compose.prod.yml --env-file ../.env.prod \
  exec minio mc alias set local http://localhost:9000 minioadmin "$MINIO_ROOT_PASSWORD"
docker compose -f docker-compose.prod.yml --env-file ../.env.prod \
  exec minio mc mb local/razas-prod
```

### 6. Verificar

```bash
curl -I https://razas.com.pe
curl -I https://app.razas.com.pe
curl -I https://api.razas.com.pe/healthz
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f caddy
```

## Updates posteriores

```bash
cd /opt/razas
git pull
cd infra
docker compose -f docker-compose.prod.yml --env-file ../.env.prod build
docker compose -f docker-compose.prod.yml --env-file ../.env.prod up -d
docker compose -f docker-compose.prod.yml --env-file ../.env.prod exec api alembic upgrade head
```

## Backups

```bash
# Postgres (diario, cron a las 03:00)
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U tukivet tukivet | gzip > /var/backups/razas-$(date +%F).sql.gz

# MinIO (rsync del volumen)
docker run --rm -v razas-prod_miniodata:/data -v /var/backups:/backup alpine \
  tar czf /backup/minio-$(date +%F).tgz -C /data .
```

## Desarrollo local

```bash
cd infra
docker compose up -d           # postgres + redis + minio + api + landing
cd ../apps/web && npm run dev  # Next.js en :3000

# Landing local: http://localhost:4280
# Web admin:   http://localhost:3000
# API:         http://localhost:8000
```

## Solución de problemas

| Síntoma                                      | Causa probable                              | Fix                                                      |
|----------------------------------------------|---------------------------------------------|----------------------------------------------------------|
| Caddy no obtiene SSL                         | DNS no apunta al VPS / puerto 80 bloqueado  | Verificar `dig razas.com.pe`, firewall 80/443            |
| `502 Bad Gateway` desde Caddy                | El servicio backend no está sano            | `docker compose logs <servicio>`                         |
| `web` no conecta a `api`                     | `NEXT_PUBLIC_API_URL` mal configurado       | Re-build con la URL correcta (`build` no `restart`)      |
| Migraciones fallan                           | Versión de Alembic no inicializada          | `alembic stamp head` o revisar `alembic_version` table   |
| MinIO devuelve 403                           | Credenciales desincronizadas                | `MINIO_ROOT_PASSWORD` debe coincidir con `S3_SECRET_KEY` |
