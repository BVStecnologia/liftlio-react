#!/bin/bash

echo "🚀 Teste de Performance do Liftlio"
echo "================================="
echo ""

# Testa página principal
echo "📊 Testando https://liftlio.com ..."
echo ""

# Usa o PageSpeed Insights API
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://liftlio.com&category=performance&strategy=mobile" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'lighthouseResult' in data:
    score = data['lighthouseResult']['categories']['performance']['score'] * 100
    metrics = data['lighthouseResult']['audits']
    
    print(f'✅ Performance Score: {score:.0f}/100')
    print('')
    print('📈 Métricas Principais:')
    
    if 'first-contentful-paint' in metrics:
        fcp = metrics['first-contentful-paint']['displayValue']
        print(f'  • FCP: {fcp}')
    
    if 'largest-contentful-paint' in metrics:
        lcp = metrics['largest-contentful-paint']['displayValue']
        print(f'  • LCP: {lcp}')
    
    if 'total-blocking-time' in metrics:
        tbt = metrics['total-blocking-time']['displayValue']
        print(f'  • TBT: {tbt}')
    
    if 'cumulative-layout-shift' in metrics:
        cls = metrics['cumulative-layout-shift']['displayValue']
        print(f'  • CLS: {cls}')
    
    if 'speed-index' in metrics:
        si = metrics['speed-index']['displayValue']
        print(f'  • Speed Index: {si}')
    
    print('')
    if score >= 90:
        print('🎉 EXCELENTE! Score acima de 90!')
    elif score >= 80:
        print('👍 Muito bom! Score acima de 80!')
    elif score >= 70:
        print('⚠️  Bom, mas pode melhorar.')
    else:
        print('❌ Precisa de mais otimizações.')
else:
    print('❌ Erro ao obter dados do PageSpeed')
    print(json.dumps(data, indent=2))
"

echo ""
echo "================================="
echo "✅ Teste concluído!"