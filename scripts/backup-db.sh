#!/bin/sh

# backup-db.sh - Script de Backup Automático de Base de Datos
# Debe programarse en un Cron Job (ej: 3 AM diariamente)
# Uso: ./backup-db.sh

set -eu

# 1. Cargar variables de entorno del contenedor/sistema
# Asume que el archivo .env está en la carpeta de ejecución o configuración
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$PARENT_DIR/docker/.env" ]; then
    . "$PARENT_DIR/docker/.env"
elif [ -f "$PARENT_DIR/.env.production" ]; then
    . "$PARENT_DIR/.env.production"
elif [ -f "$PARENT_DIR/.env" ]; then
    . "$PARENT_DIR/.env"
else
    echo "ERROR: No se encontró archivo de configuración (.env)" >&2
    exit 1
fi

# Validar variables requeridas
DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD:-}"
DB_NAME="${DB_NAME:-}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"

if [ -z "$DB_ROOT_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    echo "ERROR: DB_ROOT_PASSWORD o DB_NAME no están configuradas." >&2
    exit 1
fi

# Directorios de Backup
LOCAL_BACKUP_DIR="/opt/kodanapps/backups"
mkdir -p "$LOCAL_BACKUP_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
TEMP_DUMP="/tmp/db_backup_${DB_NAME}_${TIMESTAMP}.sql"
GZ_DUMP="${TEMP_DUMP}.gz"
ENC_DUMP="${LOCAL_BACKUP_DIR}/db_backup_${DB_NAME}_${TIMESTAMP}.sql.gz.enc"

echo "--> Iniciando backup de la base de datos ${DB_NAME}..."

# 2. Ejecutar mysqldump dentro del contenedor MariaDB (vía Docker)
# El contenedor expone la base de datos en 127.0.0.1:3306
MYSQL_CONTAINER="kodanapps_mariadb"

if ! docker exec "$MYSQL_CONTAINER" mysqldump -h 127.0.0.1 -P 3306 -u root -p"${DB_ROOT_PASSWORD}" --ssl=0 "${DB_NAME}" > "$TEMP_DUMP"; then
    echo "ERROR: Falló la ejecución de mysqldump." >&2
    rm -f "$TEMP_DUMP"
    exit 1
fi

# 3. Comprimir dump
gzip -9 "$TEMP_DUMP"

# 4. Cifrar dump con openssl (si se configuró clave de cifrado)
if [ -n "$BACKUP_ENCRYPTION_KEY" ]; then
    echo "--> Cifrando el backup..."
    if ! openssl enc -aes-256-cbc -salt -pbkdf2 -in "$GZ_DUMP" -out "$ENC_DUMP" -pass pass:"$BACKUP_ENCRYPTION_KEY"; then
        echo "ERROR: Falló el cifrado del backup." >&2
        rm -f "$GZ_DUMP"
        exit 1
    fi
    # El archivo final es el cifrado
    FINAL_BACKUP="$ENC_DUMP"
    rm -f "$GZ_DUMP"
else
    echo "AVISO: BACKUP_ENCRYPTION_KEY no configurada. El backup no se cifrará."
    FINAL_BACKUP="${LOCAL_BACKUP_DIR}/db_backup_${DB_NAME}_${TIMESTAMP}.sql.gz"
    mv "$GZ_DUMP" "$FINAL_BACKUP"
fi

echo "--> Backup local generado correctamente: ${FINAL_BACKUP}"

# 5. Subida opcional a Cloudflare R2 mediante rclone (si rclone está configurado)
if command -v rclone &> /dev/null; then
    echo "--> Subiendo backup a Cloudflare R2..."
    if rclone copy "$FINAL_BACKUP" "r2:kodanapps-backups" --progress; then
        echo "--> Subida a R2 exitosa."
    else
        echo "AVISO: Falló la subida del backup a Cloudflare R2." >&2
    fi
else
    echo "AVISO: rclone no está instalado. Omitiendo subida a R2."
fi

# 6. Limpieza de backups locales antiguos (Retención: mantener últimos 7 días)
echo "--> Ejecutando limpieza de backups antiguos locales (más de 7 días)..."
find "$LOCAL_BACKUP_DIR" -type f -name "db_backup_*" -mtime +7 -delete

# 7. Notificar a la API para registro en audit_logs
BACKUP_SIZE=$(stat -c%s "$FINAL_BACKUP" 2>/dev/null || echo 0)
if [ -n "${PUBLIC_SECRET:-}" ] && command -v curl &> /dev/null; then
    echo "--> Notificando a la API..."
    curl -s -X POST "https://api.kodan.software/api/backup-cron/log" \
        -H "Content-Type: application/json" \
        -H "X-Backup-Key: ${PUBLIC_SECRET}" \
        -d "{\"filename\":\"$(basename "$FINAL_BACKUP")\",\"size\":${BACKUP_SIZE},\"success\":true}" \
        > /dev/null 2>&1 && echo "--> Notificación exitosa." \
        || echo "AVISO: No se pudo notificar a la API (el backup se generó igual)." >&2
else
    echo "AVISO: PUBLIC_SECRET no configurado o curl no disponible. Omitiendo notificación API." >&2
fi

echo "--> Proceso de backup finalizado con éxito."
