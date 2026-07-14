#!/usr/bin/env bash

# setup-vps.sh - Script de Inicialización Automatizada para VPS Ubuntu 24.04
# Debe ejecutarse como root.
# Uso: sudo ./setup-vps.sh "[CLAVE_PUBLICA_SSH]"

set -euo pipefail

# 1. Verificar permisos de root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: Este script debe ejecutarse como root (sudo)." >&2
    exit 1
fi

PUBLIC_KEY="${1:-}"

echo "==========================================="
echo "  Iniciando configuración del VPS Ubuntu   "
echo "==========================================="

# 2. Actualizar sistema
echo "--> Actualizando repositorios y paquetes..."
apt-get update && apt-get upgrade -y

# 3. Instalar dependencias básicas
echo "--> Instalando utilidades básicas..."
apt-get install -y curl gnupg2 ca-certificates lsb-release fail2ban ufw

# 4. Instalar Docker Engine & Docker Compose v2 (repositorio oficial)
echo "--> Configurando repositorio oficial de Docker..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
echo "--> Instalando Docker y Docker Compose..."
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Iniciar y habilitar Docker
systemctl enable docker
systemctl start docker

# 5. Crear usuario 'deploy' (sin contraseña para login directo por SSH key)
echo "--> Configurando usuario 'deploy'..."
if ! id -u deploy >/dev/null 2>&1; then
    useradd -m -s /bin/bash deploy
    echo "Usuario 'deploy' creado."
else
    echo "Usuario 'deploy' ya existe."
fi

# Añadir a grupo docker para ejecutar contenedores sin sudo
usermod -aG docker deploy

# 6. Configurar llave SSH para 'deploy' si se proporciona
if [ -n "$PUBLIC_KEY" ]; then
    echo "--> Configurando llave SSH para el usuario 'deploy'..."
    mkdir -p /home/deploy/.ssh
    echo "$PUBLIC_KEY" > /home/deploy/.ssh/authorized_keys
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys
    echo "Llave SSH añadida correctamente."
else
    echo "AVISO: No se especificó llave SSH para 'deploy'."
fi

# 7. Crear directorios para kodanAPPS y kodanWEB
echo "--> Creando estructura de directorios en /opt..."
mkdir -p /opt/kodanapps/docker/nginx/certs
mkdir -p /opt/kodanweb

# Asignar propietario al usuario deploy
chown -R deploy:deploy /opt/kodanapps
chown -R deploy:deploy /opt/kodanweb

# 8. Configurar Firewall (UFW)
echo "--> Configurando Firewall (UFW)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

# 9. Iniciar y habilitar fail2ban
echo "--> Habilitando y configurando fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

echo "==========================================="
echo "   Configuración inicial de VPS completa   "
echo "==========================================="
echo "Próximos pasos manuales recomendados:"
echo "1. Verifica la conexión SSH como deploy: ssh deploy@<IP_DEL_VPS>"
echo "2. Para deshabilitar el acceso root por contraseña, edita /etc/ssh/sshd_config:"
echo "   PasswordAuthentication no"
echo "   PermitRootLogin prohibit-password"
echo "   Y reinicia SSH con: systemctl restart sshd"
echo "==========================================="
