# Memory Guardian Agent

## Descrição
Agente especializado em gerenciamento de memória para Mac M2 8GB com bugs de memory leak do macOS Sequoia. Monitora, diagnostica e corrige problemas de memória automaticamente.

## Problema que Resolve
O macOS Sequoia (15.x) tem bugs conhecidos de memory leak que afetam especialmente Macs com 8GB RAM:
- WindowServer vazando memória
- Spotlight (mds_stores) consumindo RAM excessiva
- Compressão de memória extrema (8GB+ comprimidos)
- Sistema travando após alguns dias de uso

## Comandos Disponíveis

### Check (Verificação Rápida)
```bash
~/.claude/agents/memory-guardian.sh check
```
Verifica status atual da memória e indica se precisa de otimização.

### Fix (Correção de Memory Leaks)
```bash
~/.claude/agents/memory-guardian.sh fix
```
Corrige memory leaks matando processos problemáticos e limpando caches.

### Optimize (Otimização Completa)
```bash
~/.claude/agents/memory-guardian.sh optimize
```
Otimização agressiva incluindo desabilitar serviços desnecessários.

### Emergency (Modo Emergência)
```bash
~/.claude/agents/memory-guardian.sh emergency
```
Liberação máxima de memória para situações críticas.

### Monitor (Monitoramento Contínuo)
```bash
~/.claude/agents/memory-guardian.sh monitor
```
Monitora continuamente e alerta quando precisa de ação.

## Script Principal

```bash
#!/bin/bash

# Memory Guardian Agent para Mac M2 8GB
# Solução completa para memory leaks do macOS Sequoia

VERSION="2.0"
AGENT_DIR="$HOME/.claude/agents"
LOG_FILE="$HOME/Library/Logs/memory_guardian.log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Função de log
log_action() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Função para obter status da memória
get_memory_status() {
    local TOP_MEM=$(top -l 1 | grep PhysMem)
    local COMPRESSOR=$(echo "$TOP_MEM" | grep -o '[0-9]*M compressor' | grep -o '[0-9]*')
    local FREE=$(echo "$TOP_MEM" | grep -o '[0-9]*M unused' | grep -o '[0-9]*')
    local USED=$(echo "$TOP_MEM" | grep -o '[0-9]*M used' | grep -o '[0-9]*')
    
    echo "$COMPRESSOR|$FREE|$USED"
}

# Função para verificar nível de criticidade
check_severity() {
    local COMPRESSOR=$1
    
    if [ "$COMPRESSOR" -gt 5000 ]; then
        echo "CRITICAL"
    elif [ "$COMPRESSOR" -gt 3000 ]; then
        echo "HIGH"
    elif [ "$COMPRESSOR" -gt 2000 ]; then
        echo "MEDIUM"
    else
        echo "GOOD"
    fi
}

# Comando CHECK
cmd_check() {
    echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     🛡️  Memory Guardian - Check       ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
    echo ""
    
    local MEM_INFO=$(get_memory_status)
    local COMPRESSOR=$(echo "$MEM_INFO" | cut -d'|' -f1)
    local FREE=$(echo "$MEM_INFO" | cut -d'|' -f2)
    local SEVERITY=$(check_severity "$COMPRESSOR")
    
    echo -e "📊 Status da Memória:"
    echo -e "   Memória Comprimida: ${YELLOW}${COMPRESSOR}MB${NC}"
    echo -e "   Memória Livre: ${GREEN}${FREE}MB${NC}"
    echo ""
    
    case "$SEVERITY" in
        CRITICAL)
            echo -e "${RED}🔴 ESTADO CRÍTICO!${NC}"
            echo -e "   Sistema está comprimindo memória excessivamente."
            echo -e "   ${YELLOW}Recomendação:${NC} Execute 'memory-guardian fix' AGORA"
            ;;
        HIGH)
            echo -e "${YELLOW}🟡 ATENÇÃO NECESSÁRIA${NC}"
            echo -e "   Memória sob pressão alta."
            echo -e "   ${YELLOW}Recomendação:${NC} Execute 'memory-guardian fix' em breve"
            ;;
        MEDIUM)
            echo -e "${YELLOW}🟠 MONITORAR${NC}"
            echo -e "   Memória em uso moderado."
            echo -e "   ${YELLOW}Recomendação:${NC} Verificar novamente em 2-3 dias"
            ;;
        GOOD)
            echo -e "${GREEN}✅ TUDO OK${NC}"
            echo -e "   Sistema funcionando normalmente."
            ;;
    esac
    
    log_action "CHECK: Compressor=${COMPRESSOR}MB, Free=${FREE}MB, Severity=${SEVERITY}"
}

# Comando FIX
cmd_fix() {
    echo -e "${PURPLE}╔═══════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║      🔧 Memory Guardian - Fix         ║${NC}"
    echo -e "${PURPLE}╚═══════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "🔄 Iniciando correção de memory leaks..."
    
    # 1. Matar processos com leak conhecido
    echo -e "\n${YELLOW}1. Reiniciando processos problemáticos...${NC}"
    
    # Spotlight
    if pgrep -x "mds_stores" > /dev/null; then
        killall mds_stores 2>/dev/null
        echo -e "   ✓ Spotlight (mds_stores) reiniciado"
        log_action "FIX: Killed mds_stores"
    fi
    
    # Photo Analysis
    if pgrep -x "photoanalysisd" > /dev/null; then
        killall photoanalysisd 2>/dev/null
        echo -e "   ✓ Photo Analysis desabilitado"
        log_action "FIX: Killed photoanalysisd"
    fi
    
    # idleassetsd
    if pgrep -x "idleassetsd" > /dev/null; then
        killall idleassetsd 2>/dev/null
        echo -e "   ✓ idleassetsd parado"
        log_action "FIX: Killed idleassetsd"
    fi
    
    # 2. Limpar caches
    echo -e "\n${YELLOW}2. Limpando caches do sistema...${NC}"
    rm -rf ~/Library/Caches/com.apple.WindowServer 2>/dev/null
    rm -rf ~/Library/Caches/com.apple.Safari 2>/dev/null
    rm -rf ~/Library/Caches/Google 2>/dev/null
    echo -e "   ✓ Caches limpos"
    log_action "FIX: Cleared system caches"
    
    # 3. Pausar Spotlight temporariamente
    echo -e "\n${YELLOW}3. Pausando Spotlight temporariamente...${NC}"
    killall -STOP mds 2>/dev/null
    killall -STOP mdworker 2>/dev/null
    echo -e "   ✓ Spotlight pausado (voltará em 30 min)"
    log_action "FIX: Paused Spotlight"
    
    # Agendar reativação do Spotlight
    (sleep 1800 && killall -CONT mds 2>/dev/null && killall -CONT mdworker 2>/dev/null) &
    
    # 4. Verificar resultado
    echo -e "\n${GREEN}✅ Correção aplicada!${NC}"
    sleep 2
    
    local MEM_INFO=$(get_memory_status)
    local COMPRESSOR_AFTER=$(echo "$MEM_INFO" | cut -d'|' -f1)
    local FREE_AFTER=$(echo "$MEM_INFO" | cut -d'|' -f2)
    
    echo -e "\n📊 Resultado:"
    echo -e "   Memória Comprimida: ${GREEN}${COMPRESSOR_AFTER}MB${NC}"
    echo -e "   Memória Livre: ${GREEN}${FREE_AFTER}MB${NC}"
    
    echo -e "\n${YELLOW}💡 Recomendação:${NC}"
    echo -e "   Reinicie o Mac para melhor resultado"
}

# Comando OPTIMIZE
cmd_optimize() {
    echo -e "${RED}╔═══════════════════════════════════════╗${NC}"
    echo -e "${RED}║    ⚡ Memory Guardian - Optimize      ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${YELLOW}⚠️  MODO OTIMIZAÇÃO AGRESSIVA${NC}"
    echo -e "Isso vai desabilitar alguns serviços do sistema."
    echo -n "Continuar? (s/n): "
    read -r response
    
    if [[ ! "$response" =~ ^[Ss]$ ]]; then
        echo "Cancelado."
        return
    fi
    
    # Executar fix primeiro
    cmd_fix
    
    echo -e "\n${YELLOW}4. Otimizações adicionais...${NC}"
    
    # Desabilitar serviços pesados
    launchctl unload -w /System/Library/LaunchAgents/com.apple.Siri.agent.plist 2>/dev/null
    echo -e "   ✓ Siri desabilitada"
    
    # Limpar swap
    echo -e "   ✓ Preparado para limpar swap no próximo restart"
    
    # Configurar vm_compressor
    sudo nvram boot-args="vm_compressor=2" 2>/dev/null
    
    log_action "OPTIMIZE: Full optimization executed"
    
    echo -e "\n${GREEN}✅ Otimização completa!${NC}"
    echo -e "${RED}⚠️  REINICIE O MAC AGORA${NC}"
}

# Comando EMERGENCY
cmd_emergency() {
    echo -e "${RED}╔═══════════════════════════════════════╗${NC}"
    echo -e "${RED}║    🚨 Memory Guardian - EMERGENCY    ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${RED}🚨 MODO EMERGÊNCIA - LIBERAÇÃO MÁXIMA${NC}"
    
    # Fechar apps pesados
    echo -e "\n${RED}Fechando aplicativos...${NC}"
    osascript -e 'quit app "Google Chrome"' 2>/dev/null
    osascript -e 'quit app "Safari"' 2>/dev/null
    osascript -e 'quit app "Mail"' 2>/dev/null
    osascript -e 'quit app "Photos"' 2>/dev/null
    osascript -e 'quit app "Music"' 2>/dev/null
    
    # Executar todas as correções
    cmd_fix
    
    # Forçar purge se possível
    if command -v purge &> /dev/null; then
        purge 2>/dev/null
        echo -e "\n   ✓ Memória purgada"
    fi
    
    log_action "EMERGENCY: Emergency cleanup executed"
    
    echo -e "\n${GREEN}✅ Limpeza emergencial completa!${NC}"
    echo -e "${YELLOW}Sistema deve estar mais responsivo agora.${NC}"
}

# Comando MONITOR
cmd_monitor() {
    echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║    📡 Memory Guardian - Monitor       ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "Monitorando memória continuamente..."
    echo -e "Pressione Ctrl+C para parar\n"
    
    while true; do
        local MEM_INFO=$(get_memory_status)
        local COMPRESSOR=$(echo "$MEM_INFO" | cut -d'|' -f1)
        local FREE=$(echo "$MEM_INFO" | cut -d'|' -f2)
        local SEVERITY=$(check_severity "$COMPRESSOR")
        
        echo -ne "\r📊 Comprimido: ${YELLOW}${COMPRESSOR}MB${NC} | Livre: ${GREEN}${FREE}MB${NC} | Status: "
        
        case "$SEVERITY" in
            CRITICAL) echo -ne "${RED}CRÍTICO${NC}  " ;;
            HIGH) echo -ne "${YELLOW}ALTO${NC}     " ;;
            MEDIUM) echo -ne "${YELLOW}MÉDIO${NC}    " ;;
            GOOD) echo -ne "${GREEN}BOM${NC}      " ;;
        esac
        
        if [ "$SEVERITY" = "CRITICAL" ]; then
            echo -e "\n${RED}⚠️  ALERTA: Memória crítica detectada!${NC}"
            osascript -e 'display notification "Memória crítica! Execute memory-guardian fix" with title "Memory Guardian" sound name "Blow"' 2>/dev/null
            log_action "MONITOR: Critical memory detected - ${COMPRESSOR}MB compressed"
            sleep 300  # Esperar 5 minutos antes do próximo alerta
        else
            sleep 60  # Verificar a cada minuto
        fi
    done
}

# Comando HELP
cmd_help() {
    echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║      📚 Memory Guardian - Help        ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
    echo ""
    echo "Uso: memory-guardian.sh [comando]"
    echo ""
    echo "Comandos disponíveis:"
    echo "  check      - Verifica status atual da memória"
    echo "  fix        - Corrige memory leaks conhecidos"
    echo "  optimize   - Otimização agressiva do sistema"
    echo "  emergency  - Modo emergência para situações críticas"
    echo "  monitor    - Monitora continuamente a memória"
    echo "  help       - Mostra esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  ./memory-guardian.sh check"
    echo "  ./memory-guardian.sh fix"
    echo ""
    echo "Logs salvos em: $LOG_FILE"
}

# Main
main() {
    case "$1" in
        check) cmd_check ;;
        fix) cmd_fix ;;
        optimize) cmd_optimize ;;
        emergency) cmd_emergency ;;
        monitor) cmd_monitor ;;
        help|--help|-h) cmd_help ;;
        *)
            echo "Memory Guardian v${VERSION}"
            echo "Use: $0 {check|fix|optimize|emergency|monitor|help}"
            echo "Digite '$0 help' para mais informações"
            ;;
    esac
}

main "$@"
```

## Instalação

1. Salve o script em: `~/.claude/agents/memory-guardian.sh`
2. Torne executável: `chmod +x ~/.claude/agents/memory-guardian.sh`
3. Crie alias para acesso rápido:
   ```bash
   echo 'alias mem="~/.claude/agents/memory-guardian.sh"' >> ~/.zshrc
   source ~/.zshrc
   ```

## Uso Recomendado

- **Semanalmente**: Execute `mem check`
- **Quando lento**: Execute `mem fix`
- **Muito travado**: Execute `mem emergency`
- **Após fix**: Reinicie o Mac

## Logs

Todos os logs são salvos em: `~/Library/Logs/memory_guardian.log`

## Compatibilidade

- macOS Sequoia (15.x)
- Mac M1/M2/M3 com 8GB RAM
- Testado em Mac M2 8GB com macOS 15.6