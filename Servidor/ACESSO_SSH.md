# 🔐 ACESSO AO SERVIDOR - INSTRUÇÕES IMPORTANTES

## ⚠️ SENHA DESABILITADA - APENAS CHAVE SSH!

Por questões de segurança, o acesso ao servidor **NÃO USA MAIS SENHA**.
Apenas chave SSH é aceita.

## 📍 Dados do Servidor
- **IP**: 173.249.22.2
- **Usuário**: root
- **Porta**: 22 (padrão SSH)

## 🔑 Como Acessar

### Método 1 - Usando o Atalho (Recomendado)
```bash
contabo
```

### Método 2 - Comando Completo
```bash
ssh -i ~/.ssh/contabo_key root@173.249.22.2
```

## 📂 Localização da Chave SSH

### Chave Principal
- **Privada** (SECRETA!): `~/.ssh/contabo_key`
- **Pública**: `~/.ssh/contabo_key.pub`

### Backup (iCloud)
- `~/Library/Mobile Documents/com~apple~CloudDocs/Backup/SSH/`

## 🚨 REGRAS DE SEGURANÇA

1. **NUNCA** compartilhe a chave privada (`contabo_key`)
2. **NUNCA** commite a chave no Git
3. **SEMPRE** mantenha backup seguro
4. **JAMAIS** coloque a chave em pastas do projeto

## ❌ O QUE NÃO FUNCIONA MAIS

```bash
# ISSO NÃO FUNCIONA!
ssh root@173.249.22.2  # Pedirá senha mas está desabilitada
sshpass -p 'qualquer_senha' ssh root@173.249.22.2  # Bloqueado
```

## 🛡️ Proteções Ativas

- ✅ **Fail2ban**: Bloqueia após 3 tentativas falhas
- ✅ **Senha root desabilitada**: Apenas chave SSH
- ✅ **Firewall ativo**: Apenas portas necessárias
- ✅ **Monitoramento**: Glances em http://173.249.22.2:61208

## 📝 Exemplos de Uso

### Copiar arquivo para o servidor
```bash
scp -i ~/.ssh/contabo_key arquivo.txt root@173.249.22.2:/root/
```

### Executar comando remoto
```bash
ssh -i ~/.ssh/contabo_key root@173.249.22.2 "docker ps"
```

### Túnel SSH para serviço
```bash
ssh -i ~/.ssh/contabo_key -L 8080:localhost:8080 root@173.249.22.2
```

## 🆘 Problemas?

### "Permission denied"
- Verifique se a chave existe: `ls -la ~/.ssh/contabo_key`
- Permissões corretas: `chmod 600 ~/.ssh/contabo_key`

### "Host key verification failed"
- Limpe known_hosts: `ssh-keygen -R 173.249.22.2`

### Perdeu a chave?
- Verifique backup no iCloud
- Se perdeu completamente, será necessário:
  1. Acessar painel Contabo
  2. Usar console VNC
  3. Reabilitar temporariamente senha
  4. Gerar nova chave

---

**Última atualização**: 09/09/2025
**Motivo**: Servidor comprometido, segurança reforçada