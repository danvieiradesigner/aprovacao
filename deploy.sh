#!/bin/bash

# Script de Deploy Automático
# Execute este script após fazer pull do GitHub

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Diretório do projeto
PROJECT_DIR="/var/www/aprovacao"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Verificar se está no diretório correto
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Erro: Diretório frontend não encontrado!${NC}"
    exit 1
fi

# Ir para o diretório do projeto
cd "$PROJECT_DIR"

# Atualizar código do GitHub
echo -e "${YELLOW}📥 Atualizando código do GitHub...${NC}"
git pull origin main || git pull origin master

# Ir para o diretório do frontend
cd "$FRONTEND_DIR"

# Verificar se .env existe
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado!${NC}"
    echo -e "${YELLOW}   Copiando .env.example para .env...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${RED}   ⚠️  IMPORTANTE: Edite o arquivo .env com suas credenciais!${NC}"
    else
        echo -e "${RED}   ❌ Arquivo .env.example também não encontrado!${NC}"
        exit 1
    fi
fi

# Instalar dependências
echo -e "${YELLOW}📦 Instalando dependências...${NC}"
npm install

# Fazer build
echo -e "${YELLOW}🔨 Fazendo build de produção...${NC}"
npm run build

# Verificar se o build foi criado
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Erro: Build não foi criado!${NC}"
    exit 1
fi

# Ajustar permissões
echo -e "${YELLOW}🔐 Ajustando permissões...${NC}"
sudo chown -R www-data:www-data "$FRONTEND_DIR/dist"
sudo chmod -R 755 "$FRONTEND_DIR/dist"

# Recarregar Nginx
echo -e "${YELLOW}🔄 Recarregando Nginx...${NC}"
sudo systemctl reload nginx

echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}   Build disponível em: $FRONTEND_DIR/dist${NC}"

