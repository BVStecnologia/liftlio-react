# Liftlio React

## Configuração do Ambiente

### Variáveis de Ambiente

Para executar este projeto, você precisa configurar as variáveis de ambiente necessárias. Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
REACT_APP_GOOGLE_CLIENT_ID=seu-client-id-do-google
REACT_APP_GOOGLE_CLIENT_SECRET=seu-client-secret-do-google
```

**Importante:** Nunca compartilhe suas credenciais ou faça commit do arquivo `.env` no repositório Git. O arquivo `.env` já está incluído no `.gitignore` para evitar que seja versionado acidentalmente.

### Obtendo Credenciais do Google

Para obter as credenciais do Google OAuth:

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá para "APIs e Serviços" > "Credenciais"
4. Clique em "Criar Credenciais" > "ID do Cliente OAuth"
5. Configure o tipo de aplicativo e os URIs de redirecionamento
   - Para desenvolvimento local: `http://localhost:3000`
   - Para produção: `https://liftlio.fly.dev`
6. Anote o Client ID e Client Secret gerados

## Comandos Git

Alguns comandos Git úteis:

```bash
# Atualizar o repositório local com as mudanças do remoto
git fetch --all
git reset --hard origin/main

# Adicionar, commitar e enviar mudanças
git add .
git commit -m "Descrição das alterações"
git push
```

## Executando o Projeto

```bash
# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm start

# Construir para produção
npm run build
