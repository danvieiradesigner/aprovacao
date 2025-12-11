# 🚀 Guia de Deploy na VPS via GitHub

Este guia explica como fazer deploy do sistema na VPS usando GitHub.

## 📋 Pré-requisitos na VPS

1. **Node.js 18+** instalado
2. **Nginx** ou **Apache** configurado
3. **Git** instalado
4. Acesso SSH à VPS

## 🔧 Configuração Inicial na VPS

### 1. Clonar o Repositório

```bash
# Criar diretório para o projeto
sudo mkdir -p /var/www/aprovacao
sudo chown -R $USER:$USER /var/www/aprovacao

# Clonar o repositório
cd /var/www/aprovacao
git clone https://github.com/seu-usuario/seu-repositorio.git .
```

### 2. Configurar Variáveis de Ambiente

```bash
cd /var/www/aprovacao/frontend
cp .env.example .env
nano .env  # ou use seu editor preferido
```

Preencha o `.env` com suas credenciais do Supabase:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### 3. Instalar Dependências e Fazer Build

```bash
cd /var/www/aprovacao/frontend
npm install
npm run build
```

Isso criará a pasta `dist/` com os arquivos estáticos.

### 4. Configurar Nginx

Crie o arquivo de configuração do Nginx:

```bash
sudo nano /etc/nginx/sites-available/aprovacao
```

Cole a configuração do arquivo `nginx.conf` (veja abaixo).

Ative o site:
```bash
sudo ln -s /etc/nginx/sites-available/aprovacao /etc/nginx/sites-enabled/
sudo nginx -t  # Testar configuração
sudo systemctl reload nginx
```

### 5. Configurar Permissões

```bash
sudo chown -R www-data:www-data /var/www/aprovacao/frontend/dist
sudo chmod -R 755 /var/www/aprovacao
```

## 🔄 Atualizar Deploy (Após Push no GitHub)

Crie um script de deploy automático:

```bash
# Criar script de deploy
nano /var/www/aprovacao/deploy.sh
```

Cole o conteúdo do arquivo `deploy.sh` (veja abaixo).

Tornar executável:
```bash
chmod +x /var/www/aprovacao/deploy.sh
```

### Usar o Script

```bash
cd /var/www/aprovacao
./deploy.sh
```

## 🔐 Configurar Webhook do GitHub (Opcional)

Para deploy automático ao fazer push:

1. Instalar `webhook` na VPS:
```bash
sudo apt install webhook
```

2. Criar hook:
```bash
sudo nano /etc/webhook.conf
```

Adicione:
```
{
  "id": "aprovacao-deploy",
  "execute-command": "/var/www/aprovacao/deploy.sh",
  "command-working-directory": "/var/www/aprovacao"
}
```

3. Iniciar webhook:
```bash
sudo systemctl start webhook
sudo systemctl enable webhook
```

4. No GitHub, adicione o webhook:
   - Settings → Webhooks → Add webhook
   - URL: `http://sua-vps:9000/hooks/aprovacao-deploy`
   - Content type: `application/json`
   - Events: `Just the push event`

## 📝 Verificação

Após o deploy, verifique:

1. ✅ Build foi criado: `ls -la /var/www/aprovacao/frontend/dist`
2. ✅ Nginx está rodando: `sudo systemctl status nginx`
3. ✅ Site está acessível: `curl http://localhost`
4. ✅ Logs do Nginx: `sudo tail -f /var/log/nginx/error.log`

## 🐛 Troubleshooting

**Erro 502 Bad Gateway:**
- Verifique se o Nginx está rodando: `sudo systemctl status nginx`
- Verifique os logs: `sudo tail -f /var/log/nginx/error.log`

**Erro 404 Not Found:**
- Verifique se o caminho no Nginx está correto
- Verifique se a pasta `dist/` existe

**Erro de variáveis de ambiente:**
- Verifique se o arquivo `.env` existe no frontend
- Verifique se as variáveis estão corretas
- Lembre-se: após mudar `.env`, precisa fazer novo build!

**Build falha:**
- Verifique se o Node.js está instalado: `node --version`
- Limpe node_modules e reinstale: `rm -rf node_modules && npm install`

## 🔄 Atualização Manual

Se preferir atualizar manualmente:

```bash
cd /var/www/aprovacao
git pull origin main  # ou sua branch principal
cd frontend
npm install
npm run build
sudo systemctl reload nginx
```

## 📚 Arquivos de Configuração

- `nginx.conf` - Configuração do Nginx
- `deploy.sh` - Script de deploy automático
- `frontend/.env.example` - Exemplo de variáveis de ambiente

