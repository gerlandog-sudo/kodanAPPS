# Handover: VPS Architecture & Dockerization (kodanAPPS & kodanWEB)
**Date**: July 2026  
**Status**: Stable / Fully Migrated  
**Target Server IP**: `167.148.33.119`  
**Host Key**: `C:\Users\gerla\.ssh\kodan_deploy_key`

---

## 1. Architectural Overview

```
                      Cloudflare (DNS + SSL Full Strict)
                                      │
                                      ▼
                             VPS (167.148.33.119)
  ┌────────────────────────────────────────────────────────────────────────┐
  │  Proxy Central: kodan_nginx_proxy (port 80/443)                        │
  │  SSL: Cloudflare Origin Certificates (15 year validity)                │
  │  Network: kodan_net (Docker Bridge)                                    │
  └──────────────────┬──────────────────┬───────────────────┬──────────────┘
                     │                  │                   │
                     ▼                  ▼                   ▼
             kodanweb-page         kodanapps_api     kodanapps-fronts
            (kodanweb stack)        (kodanapps)         (kodanapps)
             [Vue 3 SPA]            [PHP 8.3 FPM]     [CRM, Tracker, SAdmin]
```

### DNS Subdomain Mapping (Cloudflare)
- `kodan.software` & `www.kodan.software` ──► VPS (routes internally to `kodanweb-page`)
- `api.kodan.software` ────────────────────────► VPS (routes internally to `kodanapps_api`)
- `crm.kodan.software` ───────────────────────► VPS (routes internally to `kodanapps-fronts/crm`)
- `tracker.kodan.software` ───────────────────► VPS (routes internally to `kodanapps-fronts/tracker`)
- `superadmin.kodan.software` ────────────────► VPS (routes internally to `kodanapps-fronts/superadmin`)
- `hub.kodan.software` ───────────────────────► Old cPanel IP (`170.249.236.27`) — **Do not migrate yet**.
- `kodansoftware.com` & `www.kodansoftware.com` ──► Cloudflare Redirect Rule ──► `https://kodan.software` (Redirection handled at Cloudflare edge; does not hit the VPS).

---

## 2. Docker Architecture & Namespaces

To prevent container naming conflicts and clean-up collisions, the stacks are isolated using explicit project namespaces (`name` directive in compose files):

### Stack: `kodanweb`
- **Compose Root**: `/opt/kodanweb/`
- **Services**:
  - `kodanweb-page`: Serves the Vue 3 marketing site. Connected to `kodan_net`. Port `80` (internal only).

### Stack: `kodanapps`
- **Compose Root**: `/opt/kodanapps/`
- **Services**:
  - `kodanapps_mariadb`: MariaDB 10.11. Persistent volume: `mariadb_data`. Port `3306` (closed to the host).
  - `kodanapps_redis`: Redis 7-alpine. Persistent volume: `redis_data`. Port `6379` (closed to the host).
  - `kodanapps_api`: PHP 8.3 FPM. Connects internally to MariaDB/Redis. Port `9000`.
  - `kodanapps-fronts`: Static React frontend compilation (CRM, Tracker, Superadmin) served via Nginx. Port `80` (internal only).
  - `kodan_nginx_proxy`: Central reverse proxy. Binds host ports `80` and `443`. Forwards subdomains to their respective internal containers.

---

## 3. Deployment Protocol (CI/CD)

Both repositories run automated deployment pipelines via GitHub Actions:

1. **Build Phase (GitHub Runner)**:
   - Increments code version using `node version-up.cjs`.
   - Compiles static assets (`npm run build`).
   - Packages code into Docker images and pushes to **GHCR (GitHub Container Registry)**.
2. **Deploy Phase (VPS over SSH)**:
   - Uses `appleboy/scp-action` to copy the `docker-compose` and config files to `/opt/kodanapps/` or `/opt/kodanweb/`.
   - Uses `appleboy/ssh-action` to run:
     - `docker compose pull`
     - Runs migrations: `docker compose run --rm api php migrations/run.php`
     - Recreates containers: `docker compose up -d --remove-orphans`
     - Cleans dangling images: `docker image prune -f`

---

## 4. SSH & Server Administration Guide

### Connection Details
- **User**: `deploy` (handles Docker commands)
- **Key Path (Local)**: `C:\Users\gerla\.ssh\kodan_deploy_key`
- **Command**:
  ```bash
  ssh -i C:\Users\gerla\.ssh\kodan_deploy_key deploy@167.148.33.119
  ```

### Useful Administration Commands (Run from VPS)
```bash
# View active containers and statuses
docker ps

# Check API logs (follow)
docker logs -f kodanapps_api

# Check Proxy logs
docker logs -f kodan_nginx_proxy

# Manual restart of the kodanapps stack
cd /opt/kodanapps && docker compose -f docker-compose.prod.yml up -d --force-recreate

# Safe clean-up of unused Docker assets (images, stopped containers)
docker image prune -a -f
```

---

## 5. Database Restoration Details

### Schema Resolution
During database migration, an inconsistency was resolved. The old cPanel database dump contained orphan rows in the `plan_limits` table referencing plan IDs that did not exist in the `subscription_plans` table, causing a foreign key constraint violation (`fk_plan_limits_plan`) on import.

The DB was restored successfully using a multi-step Python automation script:
1. Wiped the `admkoda_BBDD_APPS` database and recreated it empty.
2. Imported the SQL dump with the constraint temporarily commented out.
3. Cleaned up the orphan entries:
   ```sql
   DELETE FROM plan_limits WHERE plan_id NOT IN (SELECT id FROM subscription_plans);
   ```
4. Re-applied the foreign key constraint manually:
   ```sql
   ALTER TABLE plan_limits ADD CONSTRAINT fk_plan_limits_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE;
   ```

---

## 6. PHP Quirks Found & Fixed (Critical hand-off knowledge)

If the API throws a connection error like `Unexpected token '<'` or fails to connect to the database, inspect the following two FPM/PHP quirks:

### Quirky Behavior 1: PHP-FPM environment clearing
PHP-FPM, by default, clears system environment variables (`clear_env = yes` in `www.conf`).
- **Fix**: We created `/opt/kodanapps/docker/php/docker-env.conf` containing:
  ```ini
  [www]
  clear_env = no
  ```
  And mounted it to `/usr/local/etc/php-fpm.d/docker-env.conf:ro` in `docker-compose.prod.yml`.

### Quirky Behavior 2: `parse_ini_file()` Parentheses Bug
The API reads the `.env` file directly using `parse_ini_file()`. This built-in PHP function **aborts parsing the entire file** if it encounters parentheses `()`—even inside comment lines starting with `#`.
- **Fix**: The `.env` comments must never contain parentheses. Ensure comments are purely textual.
  - *Incorrect*: `# Base de Datos (MariaDB)`
  - *Correct*: `# Base de Datos MariaDB`

### Quirky Behavior 3: `.env` File Permissions
Because FPM runs as the `www-data` user (UID `82` in Alpine) inside the container, the `.env` file mounted from the host must be readable by it.
- **Fix**: The host file `/opt/kodanapps/docker/.env` is set to `644` permissions:
  ```bash
  chmod 644 /opt/kodanapps/docker/.env
  ```

---

## 7. Backups Architecture
A daily database backup script is located at `/opt/kodanapps/scripts/backup-db.sh`.
- Generates a local compressed sql dump.
- Encrypts it symmetrically using `openssl enc -aes-256-cbc` using the `BACKUP_ENCRYPTION_KEY` variable from `.env`.
- Uploads the encrypted backup to **Cloudflare R2** bucket `kodanapps-backups` via `rclone`.
- Automatically prunes local and R2 backups older than 7 days.
