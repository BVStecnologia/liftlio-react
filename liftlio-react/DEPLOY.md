# Instruções de Deploy para Fly.io

Este documento descreve como fazer deploy da aplicação Liftlio no Fly.io.

## Pré-requisitos

1. Instalar o Fly CLI:
   - MacOS/Linux: `curl -L https://fly.io/install.sh | sh`
   - Windows com PowerShell: `pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"`

2. Fazer login no Fly.io:
   ```
   fly auth login
   ```

## Deploy

1. No diretório do projeto, execute:
   ```
   fly launch
   ```
   - Responda "no" quando perguntado se deseja criar uma nova aplicação
   - Use o nome "liftlio" (ou outro nome disponível)
   - Escolha a região mais próxima (ex: GRU para São Paulo)
   - Não configure banco de dados PostgreSQL
   - Não configure Redis

2. Configure o certificado para seu domínio (substitua example.com pelo seu domínio):
   ```
   fly certs create exemplo.com
   ```

3. Faça o deploy:
   ```
   fly deploy
   ```

4. Para configurar um domínio personalizado:
   - Adicione um registro DNS CNAME para seu domínio apontando para o app no fly.io
   - Depois execute:
   ```
   fly certs create meudominio.com
   ```

## Comandos úteis

- Ver logs: `fly logs`
- Ver status: `fly status`
- Abrir aplicação: `fly open`
- Escalar aplicação: `fly scale memory 1024`