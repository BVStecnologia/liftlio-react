# Execução: Analytics Minimalista
**Data**: 25/10/2025
**Objetivo**: Transformar /analytics em design minimalista grayscale
**Status**: 🔴 EM EXECUÇÃO - NÃO COMMITADO

---

## 🎯 REGRAS DE SEGURANÇA
- ❌ **NÃO fazer git add/commit** durante execução
- ✅ Testar visualmente após cada mudança
- ✅ Marcar checkbox conforme concluo
- ✅ Se algo quebrar: `git restore src/pages/Analytics.tsx`
- ✅ Apenas commitar quando Valdair aprovar resultado final

---

## 📋 SPRINT 1: Cores e Cards Principais (1h)

### 1.1 MetricCard - Remover Ícones Grandes
- [ ] Localizar `MetricIcon` styled component
- [ ] Comentar/remover uso de MetricIcon
- [ ] Remover importação se não usado em outros lugares
- [ ] Testar: cards devem mostrar apenas título + valor + descrição

### 1.2 MetricCard - Aplicar Grayscale
- [ ] Background: rgba(26, 26, 26, 0.3)
- [ ] Border: rgba(161, 161, 170, 0.2)
- [ ] Hover border: rgba(161, 161, 170, 0.3)
- [ ] Remover box-shadow roxo do hover
- [ ] MetricTitle: color #a1a1aa
- [ ] MetricValue: color #ffffff
- [ ] MetricChange: color #a1a1aa
- [ ] Testar: cards devem ser cinza elegante

### 1.3 Tag Connection Status - Simplificar
- [ ] Remover ícone grande (40px)
- [ ] Background: rgba(26, 26, 26, 0.3)
- [ ] Badge "Tag Connected": rgba(139, 92, 246, 0.7) (sutil)
- [ ] Last seen text: rgba(255, 255, 255, 0.4)
- [ ] Total Events/Page Views: cinza claro
- [ ] Testar: status discreto mas visível

### 1.4 Remover Animações Excessivas
- [ ] Remover keyframe `shimmer`
- [ ] Remover keyframe `pulse` (InsightCard)
- [ ] Remover `whileHover={{ scale: 1.02 }}` nos MetricCards
- [ ] Manter apenas `transition: all 0.3s ease`
- [ ] Testar: hover suave sem "pulo"

---

## 📋 SPRINT 2: Charts e Tipografia (2h)

### 2.1 Traffic Growth Chart - Grayscale
- [ ] Área Liftlio: manter #8b5cf6 (identidade)
- [ ] Área Paid Ads: cinza #71717a
- [ ] Área Direct: cinza mais claro #a1a1aa
- [ ] Atualizar gradientes (colorAds, colorDirect) para grayscale
- [ ] Grid: rgba(161, 161, 170, 0.08)
- [ ] Eixos: cor cinza sutil
- [ ] Testar: gráfico clean com destaque roxo apenas em Liftlio

### 2.2 CityCard - Grayscale
- [ ] Background: rgba(26, 26, 26, 0.3)
- [ ] Border: rgba(161, 161, 170, 0.15)
- [ ] Hover border: rgba(161, 161, 170, 0.25)
- [ ] Remover background roxo (rgba(139, 92, 246, 0.05))
- [ ] CityName: #d4d4d8
- [ ] CityCountry: #a1a1aa
- [ ] CityVisits: #ffffff (não roxo)
- [ ] Testar: cards de cidade minimalistas

### 2.3 Padronizar Font-Weights
- [ ] MetricValue: weight 400 (não 300)
- [ ] ChartTitle: weight 600 (não 700)
- [ ] MetricTitle: weight 500 (manter)
- [ ] Remover letter-spacing exagerado (1.2px → 0.5px)
- [ ] Testar: tipografia consistente

### 2.4 Hierarquia de Cores de Texto
- [ ] Títulos principais: #ffffff
- [ ] Subtítulos: #d4d4d8
- [ ] Labels: #a1a1aa
- [ ] Descrições: #e5e5e5
- [ ] Secondary text: #71717a
- [ ] Testar: hierarquia clara e legível

---

## 📋 SPRINT 3: Polimento Final (1h)

### 3.1 Remover Box-Shadows Coloridos
- [ ] ChartCard: remover shadow roxo
- [ ] Tooltip: shadow neutro (preto com opacity)
- [ ] MetricCard: sem shadow ou shadow cinza sutil
- [ ] Testar: profundidade sutil sem cor

### 3.2 Ajustar Espaçamentos
- [ ] ChartSection margin-bottom: 32px → 40px
- [ ] MetricsGrid gap: 20px (manter)
- [ ] ChartCard padding: 24px → 20px
- [ ] Testar: mais respiração entre seções

### 3.3 InsightCard - Minimalista
- [ ] Remover gradient (#8b5cf6 → #7c3aed)
- [ ] Background: rgba(26, 26, 26, 0.5)
- [ ] Border: rgba(139, 92, 246, 0.2)
- [ ] Remover animação pulse ::after
- [ ] Testar: card de insight discreto

### 3.4 Outros Detalhes
- [ ] FilterButton: remover roxo sólido quando active
- [ ] PeriodDropdown: border cinza sutil
- [ ] ChartOption: grayscale quando não active
- [ ] Testar: UI consistentemente minimalista

---

## 📸 VALIDAÇÃO FINAL

### Testes Visuais
- [ ] Desktop (1920px): layout equilibrado
- [ ] Tablet (1024px): grid responsivo
- [ ] Mobile (375px): cards empilhados
- [ ] Dark mode: cores adequadas
- [ ] Hover states: transições suaves

### Checklist de Qualidade
- [ ] Roxo APENAS em: linha Liftlio, badge Tag Connected, border hover sutil
- [ ] Todos cards em grayscale
- [ ] Tipografia: 3 weights (400, 500, 600)
- [ ] Animações: apenas fade/collapse
- [ ] Box-shadows: cinza ou inexistentes
- [ ] Espaçamento: respiração adequada

### Aprovação do Usuário
- [ ] Screenshot da página completa
- [ ] Valdair aprova resultado
- [ ] Git commit + push
- [ ] Deploy Fly.io

---

## 📊 STATUS ATUAL
**Iniciado**: [TIMESTAMP]
**Última atualização**: Aguardando início
**Progresso**: 0/37 itens (0%)

**Próximo passo**: Iniciar Sprint 1.1 (Remover MetricIcon)
