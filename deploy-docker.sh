#!/bin/bash

# Script de Deploy Automático com Docker
# Execute este script após fazer pull do GitHub

set -e  # Parar em caso de erro

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Diretório do projeto
PROJECT_DIR="/opt/aprovacao"

# Verificar se está no diretório correto
if [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
    echo -e "${RED}❌ Erro: docker-compose.yml não encontrado!${NC}"
    echo -e "${YELLOW}   Certifique-se de estar no diretório correto.${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Iniciando deploy com Docker...${NC}"

# Ir para o diretório do projeto
cd "$PROJECT_DIR"

# Atualizar código do GitHub
echo -e "${YELLOW}📥 Atualizando código do GitHub...${NC}"
git pull origin main || git pull origin master

# Verificar se .env existe
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado!${NC}"
    if [ -f frontend/.env.example ]; then
        echo -e "${YELLOW}   Criando .env a partir do exemplo...${NC}"
        cat > .env << EOF
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
EOF
        echo -e "${RED}   ⚠️  IMPORTANTE: Edite o arquivo .env com suas credenciais!${NC}"
        echo -e "${YELLOW}   Continuando com build...${NC}"
    else
        echo -e "${RED}   ❌ Arquivo .env.example também não encontrado!${NC}"
        exit 1
    fi
fi

# Parar containers existentes
echo -e "${YELLOW}🛑 Parando containers existentes...${NC}"
docker-compose down

# Build e iniciar containers
echo -e "${YELLOW}🔨 Fazendo build e iniciando containers...${NC}"
docker-compose up -d --build

# Aguardar containers iniciarem
echo -e "${YELLOW}⏳ Aguardando containers iniciarem...${NC}"
sleep 5

# Verificar status
if docker ps | grep -q aprovacao-frontend; then
    echo -e "${GREEN}✅ Container iniciado com sucesso!${NC}"
    
    # Mostrar logs recentes
    echo -e "${BLUE}📋 Últimas linhas do log:${NC}"
    docker logs --tail 20 aprovacao-frontend
    
    # Mostrar status
    echo -e "${BLUE}📊 Status do container:${NC}"
    docker ps | grep aprovacao-frontend
else
    echo -e "${RED}❌ Erro: Container não está rodando!${NC}"
    echo -e "${YELLOW}   Verificando logs...${NC}"
    docker logs aprovacao-frontend
    exit 1
fi

# Limpar imagens não usadas (opcional)
read -p "Deseja limpar imagens Docker não usadas? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧹 Limpando imagens não usadas...${NC}"
    docker system prune -f
fi

echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo -e "${BLUE}   Container: aprovacao-frontend${NC}"
echo -e "${BLUE}   Porta: 3000 (ou conforme configurado)${NC}"
echo -e "${YELLOW}   Configure o proxy reverso no Nginx Proxy Manager se necessário.${NC}"

