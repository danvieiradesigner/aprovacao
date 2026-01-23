# 🐳 Deploy com Docker - Resumo Rápido

## ⚡ Comandos Essenciais

### Primeira Vez

```bash
# 1. Clonar
cd /opt
git clone https://github.com/SEU-USUARIO/SEU-REPO.git aprovacao
cd aprovacao

# 2. Criar .env
cat > .env << EOF
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
EOF

# 3. Iniciar
docker-compose up -d --build
```

### Atualizar (Após Push)

```bash
cd /opt/aprovacao
./deploy-docker.sh
```

## 🔗 Configurar Nginx Proxy Manager

1. Acesse: `http://SEU-IP:81`
2. **Proxy Hosts** → **Add Proxy Host**
3. **Domain:** `aprovacao.seudominio.com`
4. **Forward Hostname:** `aprovacao-frontend`
5. **Forward Port:** `80`
6. Salve ✅

## 📊 Verificar Status

```bash
# Ver containers
docker ps | grep aprovacao

# Ver logs
docker logs -f aprovacao-frontend

# Ver no Portainer
# Acesse: https://SEU-IP:9443
```

## 🐛 Problemas?

```bash
# Rebuild completo
docker-compose down
docker-compose up -d --build

# Ver logs de erro
docker logs aprovacao-frontend
```

---

**Documentação completa:** Veja `DEPLOY_DOCKER.md`



