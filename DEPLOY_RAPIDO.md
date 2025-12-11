# ⚡ Deploy Rápido na VPS (Docker)

## 🚀 Passos Rápidos

### 1. Na VPS - Primeira Vez (Docker)

```bash
# Clonar repositório
cd /opt
git clone https://github.com/SEU-USUARIO/SEU-REPO.git aprovacao
cd aprovacao

# Configurar variáveis de ambiente
cat > .env << EOF
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
EOF

# Build e iniciar
docker-compose up -d --build

# Tornar script executável
chmod +x deploy-docker.sh
```

### 2. Configurar Proxy Reverso (Nginx Proxy Manager)

1. Acesse: `http://SEU-IP:81`
2. **Proxy Hosts** → **Add Proxy Host**
3. Configure:
   - **Domain:** `aprovacao.seudominio.com`
   - **Forward Hostname:** `aprovacao-frontend`
   - **Forward Port:** `80`
4. Salve

### 3. Atualizar (Após Push no GitHub)

```bash
cd /opt/aprovacao
./deploy-docker.sh
```

Ou manualmente:
```bash
cd /var/www/aprovacao
git pull
cd frontend
npm install
npm run build
sudo systemctl reload nginx
```

## 📝 Variáveis de Ambiente

Crie `.env` na raiz do projeto:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

## ✅ Checklist

- [ ] Repositório clonado na VPS (`/opt/aprovacao`)
- [ ] Arquivo `.env` criado na raiz
- [ ] Docker Compose executado com sucesso
- [ ] Container `aprovacao-frontend` rodando
- [ ] Proxy reverso configurado no Nginx Proxy Manager
- [ ] Site acessível pelo domínio configurado

## 🔗 Arquivos Importantes

- `DEPLOY_DOCKER.md` - Guia completo de deploy com Docker
- `docker-compose.yml` - Configuração do Docker
- `frontend/Dockerfile` - Imagem Docker do frontend
- `deploy-docker.sh` - Script de deploy automático
- `frontend/.env.example` - Template de variáveis

## 🐳 Comandos Úteis

```bash
# Ver logs
docker logs -f aprovacao-frontend

# Reiniciar
docker restart aprovacao-frontend

# Parar
docker-compose down

# Rebuild
docker-compose up -d --build
```

