# 🔐 ACESSO AO SERVIDOR - WINDOWS

## ⚠️ SENHA DESABILITADA - APENAS CHAVE SSH!

Por questões de segurança, o acesso ao servidor **NÃO USA MAIS SENHA**.
Apenas chave SSH é aceita.

## 📍 Dados do Servidor
- **IP**: 173.249.22.2
- **Usuário**: root
- **Porta**: 22 (padrão SSH)

## 🔑 Como Acessar

### Método Recomendado
```bash
ssh -i "C:/c/Users/User/.ssh/contabo_key_new" root@173.249.22.2
```

### Método Alternativo (PowerShell)
```powershell
ssh -i "C:\c\Users\User\.ssh\contabo_key_new" root@173.249.22.2
```

## 📂 Localização da Chave SSH

### Chave Principal (Windows)
- **Privada** (SECRETA!): `C:\c\Users\User\.ssh\contabo_key_new`
- **Pública**: `C:\c\Users\User\.ssh\contabo_key_new.pub`

### Configuração SSH
- **Config**: `C:\c\Users\User\.ssh\config`

## 🚨 REGRAS DE SEGURANÇA

1. **NUNCA** compartilhe a chave privada (`contabo_key_new`)
2. **NUNCA** commite a chave no Git
3. **SEMPRE** mantenha backup seguro
4. **JAMAIS** coloque a chave em pastas do projeto

## ❌ O QUE NÃO FUNCIONA MAIS

```bash
# ISSO NÃO FUNCIONA!
ssh root@173.249.22.2  # Pedirá senha mas está desabilitada
```

## 🛡️ Proteções Ativas

- ✅ **UFW Firewall**: Porta 22 liberada
- ✅ **Fail2ban desabilitado**: Não bloqueia mais (por enquanto)
- ✅ **Senha root desabilitada**: Apenas chave SSH
- ✅ **Monitoramento**: Glances em http://173.249.22.2:61208

## 📝 Exemplos de Uso

### Copiar arquivo para o servidor
```bash
scp -i "C:/c/Users/User/.ssh/contabo_key_new" arquivo.txt root@173.249.22.2:/root/
```

### Executar comando remoto
```bash
ssh -i "C:/c/Users/User/.ssh/contabo_key_new" root@173.249.22.2 "docker ps"
```

### Ver containers rodando
```bash
ssh -i "C:/c/Users/User/.ssh/contabo_key_new" root@173.249.22.2 "docker ps --format 'table {{.Names}}\t{{.Status}}'"
```

## 🆘 Problemas?

### "Permission denied"
- Verifique se a chave existe: `ls "C:/c/Users/User/.ssh/contabo_key_new"`
- Permissões (Git Bash): `chmod 600 "C:/c/Users/User/.ssh/contabo_key_new"`
- Permissões (PowerShell): `icacls "C:\c\Users\User\.ssh\contabo_key_new" /inheritance:r /grant:r "%USERNAME%:(R)"`

### "Host key verification failed"
- Limpe known_hosts: `ssh-keygen -R 173.249.22.2`

### "Load key: invalid format"
- Use a chave NOVA: `contabo_key_new` (não a antiga `contabo_key`)
- A chave antiga está corrompida

### Perdeu a chave?
- Será necessário:
  1. Acessar painel Contabo (https://new.contabo.com)
  2. Usar Rescue Mode ou Console VNC
  3. Gerar nova chave
  4. Adicionar no painel

## 🔄 Compatibilidade Mac ↔ Windows

A chave `contabo_key_new` funciona tanto no Mac quanto no Windows.

**Para usar no Mac:**
1. Copie a chave privada: `C:\c\Users\User\.ssh\contabo_key_new`
2. Cole no Mac: `~/.ssh/contabo_key_new`
3. Ajuste permissões: `chmod 600 ~/.ssh/contabo_key_new`
4. Conecte: `ssh -i ~/.ssh/contabo_key_new root@173.249.22.2`

---

**Última atualização**: 14/11/2025
**Motivo**: Nova chave SSH gerada via painel Contabo (chave anterior corrompida)
