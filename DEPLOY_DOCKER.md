# 🐳 Deploy com Docker na VPS

Guia completo para deploy usando Docker (compatível com sua infraestrutura atual).

## 📋 Pré-requisitos

- Docker e Docker Compose instalados
- Portainer (já está rodando ✅)
- Nginx Proxy Manager ou Nginx (já está rodando ✅)

## 🚀 Opção 1: Deploy com Docker Compose (Recomendado)

### 1. Clonar Repositório na VPS

```bash
cd /opt  # ou outro diretório de sua preferência
git clone https://github.com/SEU-USUARIO/SEU-REPO.git aprovacao
cd aprovacao
```

### 2. Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env na raiz do projeto
cat > .env << EOF
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
APROVACAO_PORT=3000
EOF
```

**⚠️ Importante:** Verifique se a porta 3000 está livre:
```bash
netstat -tulpn | grep 3000
# ou
ss -tulpn | grep 3000
```

Se estiver em uso, altere `APROVACAO_PORT=3001` (ou outra porta livre).

### 3. Build e Iniciar Container

```bash
docker-compose up -d --build
```

### 4. Verificar se Está Rodando

```bash
docker ps | grep aprovacao
docker logs aprovacao-frontend
```

### 5. Configurar Proxy Reverso

#### Opção A: Usando Nginx Proxy Manager (Recomendado)

1. Acesse o Nginx Proxy Manager: `http://SEU-IP:81`
2. Faça login
3. Vá em **Proxy Hosts** → **Add Proxy Host**
4. Configure:
   - **Domain Names:** `aprovacao.seudominio.com` (ou subdomínio desejado)
   - **Forward Hostname/IP:** `aprovacao-frontend` (nome do container)
   - **Forward Port:** `80`
   - **Block Common Exploits:** ✅
   - **Websockets Support:** ✅ (se necessário)
5. Salve e acesse pelo domínio configurado

#### Opção B: Usando Nginx Existente (syrah-nginx)

Edite a configuração do nginx:

```bash
docker exec -it syrah-nginx sh
# ou
docker exec -it syrah-nginx bash
```

Adicione no arquivo de configuração do nginx:

```nginx
server {
    listen 80;
    server_name aprovacao.seudominio.com;
    
    location / {
        proxy_pass http://aprovacao-frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔄 Atualizar Deploy (Após Push no GitHub)

Crie um script de deploy:

```bash
nano /opt/aprovacao/deploy-docker.sh
```

Cole o conteúdo:

```bash
#!/bin/bash
set -e

cd /opt/aprovacao
git pull origin main
docker-compose down
docker-compose up -d --build
docker system prune -f  # Limpar imagens não usadas (opcional)
echo "✅ Deploy concluído!"
```

Tornar executável:

```bash
chmod +x /opt/aprovacao/deploy-docker.sh
```

Usar:

```bash
/opt/aprovacao/deploy-docker.sh
```

## 🎯 Opção 2: Deploy Manual (Build Local + Push)

Se preferir fazer build localmente e enviar apenas a imagem:

### 1. Build da Imagem

```bash
cd frontend
docker build -t aprovacao-frontend:latest .
```

### 2. Tag e Push para Registry (Docker Hub, GitHub Container Registry, etc.)

```bash
docker tag aprovacao-frontend:latest seu-usuario/aprovacao-frontend:latest
docker push seu-usuario/aprovacao-frontend:latest
```

### 3. Na VPS, Atualizar docker-compose.yml

```yaml
services:
  aprovacao-frontend:
    image: seu-usuario/aprovacao-frontend:latest
    # Remover a seção 'build'
```

### 4. Pull e Iniciar

```bash
docker-compose pull
docker-compose up -d
```

## 📊 Gerenciar via Portainer

1. Acesse Portainer: `https://SEU-IP:9443`
2. Vá em **Containers**
3. Encontre `aprovacao-frontend`
4. Você pode:
   - Ver logs
   - Reiniciar container
   - Ver estatísticas
   - Acessar console

## 🔧 Comandos Úteis

```bash
# Ver logs
docker logs -f aprovacao-frontend

# Reiniciar container
docker restart aprovacao-frontend

# Parar container
docker-compose down

# Rebuild completo
docker-compose up -d --build --force-recreate

# Ver uso de recursos
docker stats aprovacao-frontend

# Entrar no container
docker exec -it aprovacao-frontend sh
```

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs de erro
docker logs aprovacao-frontend

# Verificar se a porta está em uso
netstat -tulpn | grep 3000
# ou
ss -tulpn | grep 3000
```

### Erro de variáveis de ambiente

- Verifique se o arquivo `.env` existe na raiz do projeto
- Verifique se as variáveis estão corretas
- Rebuild: `docker-compose up -d --build`

### Erro 502 Bad Gateway (Nginx Proxy Manager)

- Verifique se o container está rodando: `docker ps | grep aprovacao`
- Verifique se o nome do container está correto no proxy
- Verifique se a porta está correta (80, não 3000)

### Limpar tudo e recomeçar

```bash
docker-compose down -v
docker rmi aprovacao-frontend  # ou o nome da imagem
docker-compose up -d --build
```

## 🔐 Segurança

- ✅ Não exponha a porta diretamente na internet (use proxy reverso)
- ✅ Use HTTPS via Nginx Proxy Manager
- ✅ Mantenha as imagens atualizadas
- ✅ Use variáveis de ambiente para credenciais
- ✅ Não commite arquivos `.env` no Git

## 📝 Estrutura de Arquivos

```
aprovacao/
├── docker-compose.yml
├── .env                    # Criar na VPS (não commitar)
├── deploy-docker.sh        # Script de deploy
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .env.example
│   └── ...
└── README.md
```

## 🚀 Próximos Passos

1. ✅ Clone o repositório na VPS
2. ✅ Configure o `.env`
3. ✅ Execute `docker-compose up -d --build`
4. ✅ Configure proxy reverso no Nginx Proxy Manager
5. ✅ Acesse pelo domínio configurado

---

**Dica:** Use o Portainer para monitorar e gerenciar todos os containers facilmente! 🎉

