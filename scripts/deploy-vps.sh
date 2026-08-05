#!/usr/bin/env bash
# ==============================================================
# FleetIQ — Script de Despliegue en VPS
# Compatible con: Ubuntu 22.04 / Debian 12 / Amazon Linux 2023
#
# PREREQUISITOS (ejecutar UNA SOLA VEZ en el VPS):
#   1. El VPS tiene una IP pública y un dominio apuntando a ella
#   2. Los puertos 22 (SSH), 80 (HTTP) y 443 (HTTPS) están abiertos
#   3. Tienes acceso SSH como root o usuario con sudo
#
# USO:
#   chmod +x scripts/deploy-vps.sh
#   ./scripts/deploy-vps.sh [COMANDO]
#
# COMANDOS:
#   install      → Instala Docker, Docker Compose y Certbot (1ª vez)
#   certs        → Genera/renueva certificados Let's Encrypt
#   deploy       → Build + despliegue de contenedores
#   logs         → Muestra logs en vivo
#   health       → Verifica salud de la app
#   firewall     → Configura UFW (Ubuntu/Debian)
#   renew-certs  → Renueva certificados (para cron)
#   full         → Instalación completa desde cero (install+firewall+certs+deploy)
# ==============================================================

set -euo pipefail

# ─── Configuración — EDITAR ANTES DE EJECUTAR ────────────────
DOMAIN="tu-dominio.com"            # <-- CAMBIAR: tu dominio real
EMAIL="contacto@tu-dominio.com"    # <-- CAMBIAR: email para Let's Encrypt
APP_DIR="/opt/fleetiq"             # Directorio de instalación en el VPS
ENV_FILE=".env.production"         # Archivo de variables de entorno
COMPOSE_FILE="docker-compose.prod.yml"
# ─────────────────────────────────────────────────────────────

# ── Colores para output ───────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log()     { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
header()  { echo -e "\n${BOLD}══════════════════════════════════════════${NC}"; echo -e "${BOLD} $*${NC}"; echo -e "${BOLD}══════════════════════════════════════════${NC}"; }

# ── Verificar que estamos en el directorio del proyecto ───────
check_dir() {
  if [[ ! -f "$COMPOSE_FILE" ]]; then
    error "No se encontró '$COMPOSE_FILE'. Ejecuta este script desde la raíz del proyecto."
  fi
  if [[ ! -f "$ENV_FILE" ]]; then
    error "No se encontró '$ENV_FILE'. Copia .env.production.example y rellena los valores."
  fi
}

# ══════════════════════════════════════════════════════════════
# COMANDO: install — Instala Docker + Docker Compose + Certbot
# ══════════════════════════════════════════════════════════════
cmd_install() {
  header "1/4 — Instalación de dependencias del servidor"

  # Detectar distribución
  if command -v apt-get &>/dev/null; then
    PKG_MGR="apt-get"
    OS_TYPE="debian"
  elif command -v yum &>/dev/null; then
    PKG_MGR="yum"
    OS_TYPE="rhel"
  else
    error "Distribución no soportada. Instala Docker manualmente: https://docs.docker.com/engine/install/"
  fi

  log "Actualizando paquetes del sistema..."
  if [[ "$OS_TYPE" == "debian" ]]; then
    apt-get update -y && apt-get upgrade -y
    apt-get install -y curl wget git ca-certificates gnupg lsb-release

    # Docker Engine (repositorio oficial)
    if ! command -v docker &>/dev/null; then
      log "Instalando Docker Engine..."
      install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      chmod a+r /etc/apt/keyrings/docker.gpg
      echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
      apt-get update -y
      apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      systemctl enable --now docker
      success "Docker instalado: $(docker --version)"
    else
      success "Docker ya instalado: $(docker --version)"
    fi

    # Certbot (para Let's Encrypt)
    if ! command -v certbot &>/dev/null; then
      log "Instalando Certbot + plugin Nginx..."
      apt-get install -y certbot python3-certbot-nginx
      success "Certbot instalado: $(certbot --version)"
    else
      success "Certbot ya instalado: $(certbot --version)"
    fi

  elif [[ "$OS_TYPE" == "rhel" ]]; then
    yum update -y
    yum install -y curl wget git
    # Docker en Amazon Linux 2023 / RHEL
    if ! command -v docker &>/dev/null; then
      log "Instalando Docker (Amazon Linux / RHEL)..."
      yum install -y docker
      systemctl enable --now docker
      success "Docker instalado: $(docker --version)"
    fi
    # Certbot via snap o pip en RHEL
    if ! command -v certbot &>/dev/null; then
      log "Instalando Certbot via pip3..."
      yum install -y python3-pip
      pip3 install certbot
      success "Certbot instalado"
    fi
  fi

  # Agregar usuario actual al grupo docker (evitar sudo en cada comando)
  if [[ "$EUID" -ne 0 ]] && ! groups "$USER" | grep -q docker; then
    usermod -aG docker "$USER"
    warn "Usuario añadido al grupo docker. Cierra sesión y vuelve a entrar para aplicar."
  fi

  success "Instalación completada."
}

# ══════════════════════════════════════════════════════════════
# COMANDO: firewall — Configura UFW (Ubuntu/Debian)
# ══════════════════════════════════════════════════════════════
cmd_firewall() {
  header "2/4 — Configuración del Firewall (UFW)"

  if ! command -v ufw &>/dev/null; then
    warn "UFW no disponible. Si usas AWS, configura el Security Group manualmente:"
    echo "  • Puerto 22  (SSH)   — Fuente: tu IP"
    echo "  • Puerto 80  (HTTP)  — Fuente: 0.0.0.0/0"
    echo "  • Puerto 443 (HTTPS) — Fuente: 0.0.0.0/0"
    return 0
  fi

  log "Configurando reglas UFW..."
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow 22/tcp    comment "SSH"
  ufw allow 80/tcp    comment "HTTP (ACME challenge + redirect)"
  ufw allow 443/tcp   comment "HTTPS"
  ufw --force enable

  success "Firewall configurado:"
  ufw status numbered
}

# ══════════════════════════════════════════════════════════════
# COMANDO: certs — Genera certificados Let's Encrypt
# ══════════════════════════════════════════════════════════════
cmd_certs() {
  header "3/4 — Certificados SSL (Let's Encrypt / Certbot)"

  if [[ "$DOMAIN" == "tu-dominio.com" ]]; then
    error "DOMAIN no configurado. Edita la variable DOMAIN en este script."
  fi

  # Verificar que el dominio resuelve a esta IP
  MY_IP=$(curl -s https://ifconfig.me || curl -s https://api.ipify.org)
  log "IP pública de este servidor: ${MY_IP}"
  log "Dominio configurado: ${DOMAIN}"
  warn "Verifica que ${DOMAIN} apunta a ${MY_IP} antes de continuar."
  echo -n "¿Continuar? [s/N]: "
  read -r CONFIRM
  [[ "$CONFIRM" =~ ^[sS]$ ]] || { log "Abortado."; exit 0; }

  # Crear directorio webroot para ACME challenge
  mkdir -p /var/www/certbot

  log "Solicitando certificado para ${DOMAIN} y www.${DOMAIN}..."
  certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    --domains "${DOMAIN},www.${DOMAIN}" \
    --non-interactive

  success "Certificado generado en: /etc/letsencrypt/live/${DOMAIN}/"

  # Configurar renovación automática via cron
  CRON_JOB="0 3 * * * certbot renew --quiet --post-hook 'docker compose -f ${APP_DIR}/${COMPOSE_FILE} exec nginx nginx -s reload'"
  (crontab -l 2>/dev/null || true; echo "$CRON_JOB") | crontab -
  success "Renovación automática configurada (diaria a las 3am)."
}

# ══════════════════════════════════════════════════════════════
# COMANDO: deploy — Build + levantar contenedores
# ══════════════════════════════════════════════════════════════
cmd_deploy() {
  header "4/4 — Despliegue de contenedores"
  check_dir

  # Actualizar nginx.prod.conf con el dominio correcto
  if grep -q "tu-dominio.com" nginx/nginx.prod.conf 2>/dev/null; then
    warn "nginx/nginx.prod.conf aún tiene 'tu-dominio.com'. Actualizando con: ${DOMAIN}"
    sed -i "s/tu-dominio.com/${DOMAIN}/g" nginx/nginx.prod.conf
    success "nginx.prod.conf actualizado con dominio: ${DOMAIN}"
  fi

  log "Deteniendo contenedores previos..."
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" down --remove-orphans 2>/dev/null || true

  log "Construyendo imágenes (esto puede tomar unos minutos)..."
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" build --no-cache

  log "Iniciando contenedores en background..."
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d

  success "Contenedores levantados."
  docker compose -f "${COMPOSE_FILE}" ps
}

# ══════════════════════════════════════════════════════════════
# COMANDO: health — Verificar salud del despliegue
# ══════════════════════════════════════════════════════════════
cmd_health() {
  header "Verificación de salud del despliegue"

  log "Estado de contenedores:"
  docker compose -f "${COMPOSE_FILE}" ps

  echo ""
  log "Prueba HTTP → HTTPS redirect (espera 301):"
  curl -sI "http://${DOMAIN}" | head -5 || warn "HTTP no responde"

  echo ""
  log "Prueba HTTPS (espera 200):"
  curl -sI "https://${DOMAIN}" | head -5 || warn "HTTPS no responde"

  echo ""
  log "Health check del API:"
  HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}" "https://${DOMAIN}/api/health" || echo "000")
  if [[ "$HTTP_CODE" == "200" ]]; then
    success "/api/health respondió con 200 ✓"
  else
    warn "/api/health respondió con ${HTTP_CODE} — Revisa los logs"
  fi

  echo ""
  log "Certificado SSL:"
  echo | openssl s_client -servername "${DOMAIN}" -connect "${DOMAIN}:443" 2>/dev/null | \
    openssl x509 -noout -dates 2>/dev/null || warn "No se pudo verificar el certificado"
}

# ══════════════════════════════════════════════════════════════
# COMANDO: logs — Ver logs en vivo
# ══════════════════════════════════════════════════════════════
cmd_logs() {
  check_dir
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" logs -f --tail=100
}

# ══════════════════════════════════════════════════════════════
# COMANDO: renew-certs — Renovar certificados (para cron)
# ══════════════════════════════════════════════════════════════
cmd_renew_certs() {
  log "Renovando certificados Let's Encrypt..."
  certbot renew --quiet
  docker compose -f "${COMPOSE_FILE}" exec nginx nginx -s reload
  success "Certificados renovados y Nginx recargado."
}

# ══════════════════════════════════════════════════════════════
# COMANDO: full — Instalación completa desde cero
# ══════════════════════════════════════════════════════════════
cmd_full() {
  echo -e "${BOLD}FleetIQ — Despliegue completo en VPS${NC}"
  echo -e "Dominio: ${CYAN}${DOMAIN}${NC} | Email: ${CYAN}${EMAIL}${NC}"
  echo ""
  warn "Este comando realizará:"
  echo "  1. Instalación de Docker + Certbot"
  echo "  2. Configuración de Firewall"
  echo "  3. Generación de certificados SSL"
  echo "  4. Build y despliegue de contenedores"
  echo ""
  echo -n "¿Confirmar instalación completa? [s/N]: "
  read -r CONFIRM
  [[ "$CONFIRM" =~ ^[sS]$ ]] || { log "Abortado."; exit 0; }

  cmd_install
  cmd_firewall
  cmd_certs
  cmd_deploy
  cmd_health

  header "🚀 FleetIQ desplegado exitosamente"
  echo -e "  URL: ${GREEN}https://${DOMAIN}${NC}"
  echo ""
}

# ══════════════════════════════════════════════════════════════
# ROUTER DE COMANDOS
# ══════════════════════════════════════════════════════════════
COMMAND="${1:-help}"

case "$COMMAND" in
  install)      cmd_install ;;
  firewall)     cmd_firewall ;;
  certs)        cmd_certs ;;
  deploy)       cmd_deploy ;;
  health)       cmd_health ;;
  logs)         cmd_logs ;;
  renew-certs)  cmd_renew_certs ;;
  full)         cmd_full ;;
  help|--help|-h)
    echo ""
    echo -e "${BOLD}FleetIQ Deploy Script${NC}"
    echo ""
    echo "Uso: ./scripts/deploy-vps.sh [COMANDO]"
    echo ""
    echo "Comandos:"
    echo "  install      Instala Docker, Docker Compose y Certbot"
    echo "  firewall     Configura UFW (puertos 22, 80, 443)"
    echo "  certs        Genera certificados Let's Encrypt"
    echo "  deploy       Build + despliegue de contenedores"
    echo "  health       Verifica salud del despliegue"
    echo "  logs         Muestra logs en vivo"
    echo "  renew-certs  Renueva certificados (usar en cron)"
    echo "  full         Instalación completa desde cero"
    echo ""
    echo -e "${YELLOW}IMPORTANTE: Edita DOMAIN y EMAIL al inicio del script antes de ejecutar.${NC}"
    echo ""
    ;;
  *)
    error "Comando desconocido: '$COMMAND'. Usa 'help' para ver los comandos disponibles."
    ;;
esac
