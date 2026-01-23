# ✅ Segurança do Deploy - Não Quebra Nada!

## 🔒 Garantias de Segurança

### ✅ **Rede Isolada**
- O container usa uma rede própria (`aprovacao-network`)
- **NÃO interfere** com outras redes Docker
- **NÃO acessa** outros containers sem permissão explícita

### ✅ **Porta Configurável**
- Porta padrão: `3000` (pode ser alterada)
- **Verifique se está livre** antes de usar
- Se estiver em uso, mude para outra porta (3001, 3002, etc.)

### ✅ **Container Isolado**
- Nome único: `aprovacao-frontend`
- **NÃO conflita** com containers existentes
- Pode ser removido sem afetar outros serviços

### ✅ **Sem Modificações no Sistema**
- **NÃO instala** nada no sistema operacional
- **NÃO modifica** configurações do Nginx existente
- **NÃO altera** outros containers
- Tudo roda dentro do próprio container

## 🔍 Verificar Antes do Deploy

### 1. Verificar se a Porta 3000 está Livre

```bash
# Verificar se a porta está em uso
netstat -tulpn | grep 3000
# ou
ss -tulpn | grep 3000
# ou
lsof -i :3000
```

**Se estiver livre:** Pode usar a porta 3000 ✅

**Se estiver em uso:** Altere no `docker-compose.yml`:
```yaml
ports:
  - "3001:80"  # Use outra porta
```

### 2. Verificar Espaço em Disco

```bash
df -h
```

Certifique-se de ter pelo menos **500MB livres** para a imagem Docker.

### 3. Verificar Recursos

```bash
# Ver uso de memória
free -h

# Ver uso de CPU
top
```

O container usa aproximadamente:
- **RAM:** ~50-100MB
- **Disco:** ~200-300MB (imagem + build)

## 🛡️ O que NÃO será Afetado

✅ **syrah** - Container PHP continuará funcionando  
✅ **evolution_api** - API continuará funcionando  
✅ **evo_postgres** - Banco de dados continuará funcionando  
✅ **evo_redis** - Redis continuará funcionando  
✅ **syrah-nginx** - Nginx existente não será modificado  
✅ **mysql-syrah** - MySQL continuará funcionando  
✅ **n8n** - N8N continuará funcionando  
✅ **postgres-n8n** - PostgreSQL do N8N continuará funcionando  
✅ **redis-n8n** - Redis do N8N continuará funcionando  
✅ **portainer** - Portainer continuará funcionando  
✅ **npm_old** - Nginx Proxy Manager continuará funcionando  

## 📋 Checklist de Segurança

Antes de fazer deploy:

- [ ] Verificar se porta 3000 está livre (ou escolher outra)
- [ ] Verificar espaço em disco disponível
- [ ] Ter backup dos dados importantes (sempre bom!)
- [ ] Verificar se Docker tem permissões corretas

## 🔧 Como Alterar a Porta (Se Necessário)

### Opção 1: Alterar no docker-compose.yml

Edite o arquivo `docker-compose.yml`:

```yaml
ports:
  - "3001:80"  # Mude 3000 para 3001 (ou outra porta livre)
```

### Opção 2: Usar Variável de Ambiente

No `docker-compose.yml`:
```yaml
ports:
  - "${APROVACAO_PORT:-3000}:80"
```

E no `.env`:
```env
APROVACAO_PORT=3001
```

## 🚨 Se Algo Der Errado

### Parar o Container

```bash
cd /opt/aprovacao
docker-compose down
```

Isso **NÃO afeta** nenhum outro container!

### Remover Completamente

```bash
cd /opt/aprovacao
docker-compose down -v
docker rmi aprovacao-frontend  # Remove a imagem
rm -rf /opt/aprovacao  # Remove os arquivos (opcional)
```

## ✅ Resumo

**O deploy é 100% seguro porque:**

1. ✅ Rede isolada (não mexe em outras redes)
2. ✅ Container isolado (não mexe em outros containers)
3. ✅ Porta configurável (pode mudar se necessário)
4. ✅ Sem modificações no sistema (tudo dentro do container)
5. ✅ Fácil de remover (docker-compose down)

**Você pode fazer deploy tranquilo!** 🚀

---

**Dica:** Use o Portainer para monitorar o novo container junto com os outros! 🎉

