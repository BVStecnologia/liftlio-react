import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { FaYoutube, FaReddit, FaChartLine, FaDollarSign, FaUsers, FaRocket, FaCommentDots, FaFire, FaTrophy, FaEye, FaArrowRight, FaClock, FaCheckCircle, FaCalculator, FaBullhorn, FaCoins, FaInfinity } from 'react-icons/fa';
import { HiTrendingUp, HiLightningBolt } from 'react-icons/hi';
import { MdAutoGraph, MdTimeline } from 'react-icons/md';
import { renderIcon } from '../utils/IconHelper';

interface CommentData {
  comment: {
    pt: string;
    en: string;
  };
  justification: {
    pt: string;
    en: string;
  };
}

interface TrendTopic {
  id: string;
  name: string;
  growth: number;
  volume: string;
  relevance: number;
  category: string;
  status: 'exploding' | 'rising' | 'trending' | 'emerging';
  relatedTopics?: string[];
  opportunities: {
    youtube: {
      channels: number;
      videosPerWeek: number;
      avgViews: string;
      engagement: number;
    };
    reddit: {
      subreddits: number;
      dailyPosts: number;
      avgComments: number;
      karma: string;
    };
  };
  reachPotential: string;
  competitorActivity: 'low' | 'medium' | 'high';
  monthlyPosts: number;
  sampleComments?: {
    youtube: CommentData;
    reddit: CommentData;
  };
}

const mockTopics: TrendTopic[] = [
  {
    id: '1',
    name: 'AI Marketing',
    growth: 2300,
    volume: '245K',
    relevance: 95,
    category: 'technology',
    status: 'exploding',
    relatedTopics: ['ChatGPT Marketing', 'IA Generativa', 'Automação'],
    opportunities: {
      youtube: {
        channels: 23,
        videosPerWeek: 147,
        avgViews: '12.5K',
        engagement: 8.2
      },
      reddit: {
        subreddits: 8,
        dailyPosts: 34,
        avgComments: 156,
        karma: '2.3K'
      }
    },
    reachPotential: '10K-100K',
    competitorActivity: 'low',
    monthlyPosts: 150,
    sampleComments: {
      youtube: {
        comment: {
          pt: "3:42 me deu um flashback terrível kkkk ano passado eu tava EXATAMENTE nessa! O que salvou foi descobrir o [PRODUTO/SERVIÇO] - ele cria templates dinâmicos que se adaptam ao contexto automaticamente. Mudou meu workflow completamente, hoje levo 20% do tempo que levava antes. Ainda tô aprendendo muita coisa, mas essa ferramenta foi divisor de águas real.",
          en: "3:42 gave me terrible flashbacks lol last year I was EXACTLY there! What saved me was discovering [PRODUCT/SERVICE] - it creates dynamic templates that adapt to context automatically. Changed my workflow completely, now I take 20% of the time I used to. Still learning a lot, but this tool was a real game changer."
        },
        justification: {
          pt: "Menção natural do produto no final após construir credibilidade, conecta com momento específico do vídeo (3:42), compartilha transformação pessoal (20% do tempo), produto aparece como solução descoberta, não vendida",
          en: "Natural product mention at the end after building credibility, connects with specific video moment (3:42), shares personal transformation (20% of time), product appears as discovered solution, not sold"
        }
      },
      reddit: {
        comment: {
          pt: "Isso é real demais! Passei por algo parecido e quase desisti da automação completamente. O pulo do gato foi quando comecei a usar o [PRODUTO/SERVIÇO] - ele automatiza a parte chata mas mantém meu toque pessoal. Tipo, formatação, SEO, estrutura, tudo automático, mas o conteúdo e a voz continuam 100% minhas. Funciona especialmente bem pra conteúdo educacional. Em 3 meses já criei mais de 200 posts mantendo a qualidade. Alguém mais usa ferramentas assim?",
          en: "This is so real! Went through something similar and almost gave up on automation completely. The game changer was when I started using [PRODUCT/SERVICE] - it automates the boring stuff but keeps my personal touch. Like, formatting, SEO, structure, all automatic, but the content and voice stay 100% mine. Works especially well for educational content. In 3 months I've created over 200 posts maintaining quality. Anyone else use tools like this?"
        },
        justification: {
          pt: "Introduz produto como solução para problema específico do OP, compartilha benefício concreto (200 posts em 3 meses), posiciona como ferramenta que preserva autenticidade, não como substituto",
          en: "Introduces product as solution to OP's specific problem, shares concrete benefit (200 posts in 3 months), positions as tool that preserves authenticity, not replacement"
        }
      }
    }
  },
  {
    id: '2',
    name: 'No-Code para Startups',
    growth: 1850,
    volume: '180K',
    relevance: 88,
    category: 'technology',
    status: 'rising',
    relatedTopics: ['Bubble.io', 'Zapier', 'Make', 'Airtable'],
    opportunities: {
      youtube: {
        channels: 18,
        videosPerWeek: 89,
        avgViews: '8.7K',
        engagement: 6.5
      },
      reddit: {
        subreddits: 12,
        dailyPosts: 45,
        avgComments: 98,
        karma: '1.8K'
      }
    },
    reachPotential: '5K-50K',
    competitorActivity: 'medium',
    monthlyPosts: 120,
    sampleComments: {
      youtube: {
        comment: {
          pt: "Integração com pagamento sempre foi meu pesadelo até descobrir o [PRODUTO/SERVIÇO]! No 7:20 quando você falou da validação, lembrei que ele já vem com isso integrado - tipo um 'porteiro' pros dados. Reduzi erros em 95% e configurei tudo em 15 minutos. Salvou meu marketplace real! Vocês validam em múltiplas camadas também?",
          en: "Payment integration was always my nightmare until I discovered [PRODUCT/SERVICE]! At 7:20 when you mentioned validation, reminded me it comes with that built-in - like a 'bouncer' for data. Reduced errors by 95% and set everything up in 15 minutes. Really saved my marketplace! Do you validate in multiple layers too?"
        },
        justification: {
          pt: "Produto apresentado como descoberta após frustração, benefício específico e mensurável (95% menos erros), tempo de implementação (15 min), caso real (salvou marketplace), mantém tom técnico da conversa",
          en: "Product presented as discovery after frustration, specific measurable benefit (95% fewer errors), implementation time (15 min), real case (saved marketplace), maintains technical conversation tone"
        }
      },
      reddit: {
        comment: {
          pt: "Retool + Bubble + Supabase numa interface só? [PRODUTO/SERVIÇO] faz exatamente isso! Montei CRM completo com dashboards real-time em 3 dias (normalmente 3 semanas easy). Cliente edita sozinho sem quebrar nada = menos suporte pra mim. 200 horas economizadas só esse ano. Game changer total pra quem trabalha com no-code.",
          en: "Retool + Bubble + Supabase in one interface? [PRODUCT/SERVICE] does exactly that! Built complete CRM with real-time dashboards in 3 days (normally 3 weeks easy). Client self-edits without breaking = less support for me. 200 hours saved this year alone. Total game changer for no-code work."
        },
        justification: {
          pt: "Produto como evolução natural (não substitui, melhora), caso específico impressionante (3 dias vs 3 semanas), benefício único (cliente edita sozinho), métrica anual (200 horas economizadas), call-to-action entusiasmado",
          en: "Product as natural evolution (doesn't replace, improves), impressive specific case (3 days vs 3 weeks), unique benefit (client self-edits), annual metric (200 hours saved), enthusiastic call-to-action"
        }
      }
    }
  },
  {
    id: '3',
    name: 'Growth Hacking B2B',
    growth: 980,
    volume: '120K',
    relevance: 82,
    category: 'business',
    status: 'trending',
    relatedTopics: ['LinkedIn Automation', 'Cold Email', 'Sales Funnel'],
    opportunities: {
      youtube: {
        channels: 15,
        videosPerWeek: 67,
        avgViews: '5.4K',
        engagement: 5.8
      },
      reddit: {
        subreddits: 6,
        dailyPosts: 23,
        avgComments: 78,
        karma: '1.2K'
      }
    },
    reachPotential: '3K-30K',
    competitorActivity: 'high',
    monthlyPosts: 90,
    sampleComments: {
      youtube: {
        comment: {
          pt: "Rapaz, no 5:15 você desbloqueou algo na minha mente! Sempre olhei demografia e ficava frustrado com conversões baixas. Mudei pra comportamento e BOOM - conversões triplicaram! Agora uso o [PRODUTO/SERVIÇO] que rastreia micro-ações automaticamente (tipo: baixou eBook + visitou preço 3x + ficou 5min na FAQ = lead QUENTE). Ele me avisa em tempo real quando alguém tá pronto pra comprar. Minha taxa de fechamento foi de 2% pra 18%! Vocês rastreiam quantos pontos de comportamento?",
          en: "Holy smokes, at 5:15 you unlocked something in my mind! Always looked at demographics and got frustrated with low conversions. Switched to behavior and BOOM - conversions tripled! Now I use [PRODUCT/SERVICE] that tracks micro-actions automatically (like: downloaded eBook + visited pricing 3x + spent 5min on FAQ = HOT lead). It alerts me real-time when someone's ready to buy. My close rate went from 2% to 18%! How many behavior points do you track?"
        },
        justification: {
          pt: "Produto introduzido após validar insight do vídeo, exemplo específico de como funciona (micro-ações), benefício dramático e crível (2% → 18%), funcionalidade única (alertas em tempo real), pergunta técnica mantém conversa",
          en: "Product introduced after validating video insight, specific example of how it works (micro-actions), dramatic but believable benefit (2% → 18%), unique feature (real-time alerts), technical question maintains conversation"
        }
      },
      reddit: {
        comment: {
          pt: "47% de taxa de resposta vendendo B2B. Como? [PRODUTO/SERVIÇO] monitora sinais de compra em tempo real - mudanças LinkedIn, rodadas de investimento, contratações, tudo. Me avisa no momento EXATO com contexto: 'Empresa X contratou 5 devs + anunciou expansão' = falo sobre escalar processos. Antes era 3% no spray and pray. Agora é quase trapaça 😅",
          en: "47% response rate selling B2B. How? [PRODUCT/SERVICE] monitors buying signals real-time - LinkedIn changes, funding rounds, hiring, everything. Alerts me at the EXACT moment with context: 'Company X hired 5 devs + announced expansion' = I talk about scaling processes. Used to be 3% with spray and pray. Now it's almost cheating 😅"
        },
        justification: {
          pt: "Produto como solução para problema universal (timing), funcionalidade específica e poderosa (monitora sinais), exemplo real e contextual, métrica impressionante mas realista (3% → 47%), humor sobre eficiência",
          en: "Product as solution to universal problem (timing), specific powerful feature (monitors signals), real contextual example, impressive but realistic metric (3% → 47%), humor about efficiency"
        }
      }
    }
  },
  {
    id: '4',
    name: 'SaaS Metrics',
    growth: 650,
    volume: '85K',
    relevance: 75,
    category: 'business',
    status: 'emerging',
    relatedTopics: ['MRR', 'Churn Rate', 'LTV', 'CAC'],
    opportunities: {
      youtube: {
        channels: 12,
        videosPerWeek: 45,
        avgViews: '3.2K',
        engagement: 4.5
      },
      reddit: {
        subreddits: 4,
        dailyPosts: 15,
        avgComments: 56,
        karma: '890'
      }
    },
    reachPotential: '2K-20K',
    competitorActivity: 'low',
    monthlyPosts: 60,
    sampleComments: {
      youtube: {
        comment: {
          pt: "Nossa, 8:45 foi meu momento eureka também! 🤯 Gastava HORAS em planilhas tentando calcular CAC/LTV até achar o [PRODUTO/SERVIÇO]. Ele separa automaticamente por canal, pondera por volume E ainda projeta LTV baseado em cohorts. O mais louco: descobri que meu canal mais barato (email) tinha o PIOR LTV! Nunca teria visto isso nas minhas planilhas manuais. Agora tomo decisões baseadas em dados reais, não em achismo. CAC geral caiu 40% só realocando budget. Vocês calculam LTV por cohort também?",
          en: "Seriously, 8:45 was my eureka moment too! 🤯 Spent HOURS on spreadsheets trying to calculate CAC/LTV until I found [PRODUCT/SERVICE]. It automatically separates by channel, weights by volume AND projects LTV based on cohorts. The craziest part: discovered my cheapest channel (email) had the WORST LTV! Would never have seen this in my manual spreadsheets. Now I make decisions based on real data, not guesswork. Overall CAC dropped 40% just by reallocating budget. Do you also calculate LTV by cohort?"
        },
        justification: {
          pt: "Produto resolve problema específico mencionado no vídeo, descoberta contra-intuitiva (canal barato = LTV ruim), resultado tangível (CAC -40%), transição de planilhas manuais para automação, pergunta técnica relevante",
          en: "Product solves specific problem mentioned in video, counter-intuitive discovery (cheap channel = bad LTV), tangible result (CAC -40%), transition from manual spreadsheets to automation, relevant technical question"
        }
      },
      reddit: {
        comment: {
          pt: "73% dos usuários desistiam na tela de setup e eu nem sabia! [PRODUTO/SERVIÇO] mostrou isso com análise de cohort. Churn de 40% no mês 2 virou 8% depois que refiz o onboarding baseado nos dados. Melhor parte: previsão de churn em tempo real. Semana passada salvei 12 clientes antes de cancelarem. Análise preditiva é basicamente ter bola de cristal 🔮",
          en: "73% of users quit on setup screen and I had no idea! [PRODUCT/SERVICE] showed this with cohort analysis. 40% month 2 churn became 8% after I rebuilt onboarding based on data. Best part: real-time churn prediction. Last week saved 12 customers before they canceled. Predictive analysis is basically having a crystal ball 🔮"
        },
        justification: {
          pt: "Produto como salvador do negócio, insight específico impossível de ver manualmente (73% travavam em tela específica), ação + resultado (40% → 8%), feature matadora (previsão de churn), caso recente comprovando eficácia",
          en: "Product as business savior, specific insight impossible to see manually (73% stuck on specific screen), action + result (40% → 8%), killer feature (churn prediction), recent case proving effectiveness"
        }
      }
    }
  }
];

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.4); }
  50% { box-shadow: 0 0 40px rgba(102, 126, 234, 0.6), 0 0 60px rgba(102, 126, 234, 0.3); }
  100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.4); }
`;

const rippleEffect = keyframes`
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
`;

const floatAnimation = keyframes`
  0%, 100% { transform: translateY(0) translateX(-50%); }
  50% { transform: translateY(-10px) translateX(-50%); }
`;

const Container = styled.div`
  width: 100%;
  padding: 5rem 0;
  background: ${props => props.theme.name === 'dark' 
    ? 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)' 
    : 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)'};
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 50%, 
      ${props => props.theme.name === 'dark' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(102, 126, 234, 0.05)'} 0%, 
      transparent 70%
    );
  }
`;

const Wrapper = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  position: relative;
  z-index: 1;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 4rem;
`;

const Title = styled(motion.h2)`
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const Subtitle = styled(motion.p)`
  font-size: 1.25rem;
  color: ${props => props.theme.name === 'dark' ? '#a0a0a0' : '#666'};
  max-width: 700px;
  margin: 0 auto 2rem;
  line-height: 1.6;
`;

const PlatformBadges = styled(motion.div)`
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin-top: 1.5rem;
  flex-wrap: wrap;
`;

const PlatformBadge = styled.div<{ platform: 'youtube' | 'reddit' }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  border-radius: 30px;
  font-size: 1rem;
  font-weight: 600;
  background: ${props => props.platform === 'youtube' 
    ? 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)' 
    : 'linear-gradient(135deg, #FF4500 0%, #FF6A4D 100%)'};
  color: white;
  box-shadow: 0 4px 15px ${props => props.platform === 'youtube' 
    ? 'rgba(255, 0, 0, 0.3)' 
    : 'rgba(255, 69, 0, 0.3)'};
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px ${props => props.platform === 'youtube' 
      ? 'rgba(255, 0, 0, 0.4)' 
      : 'rgba(255, 69, 0, 0.4)'};
  }
  
  svg {
    font-size: 1.25rem;
  }
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 500px;
  gap: 4rem;
  align-items: start;
  margin-bottom: 4rem;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    gap: 3rem;
  }
`;

const TrendsContainer = styled.div`
  position: relative;
  min-height: 600px;
`;

const TrendsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const TrendCard = styled(motion.div)<{ isSelected: boolean; status: string }>`
  background: ${props => props.theme.name === 'dark' 
    ? props.isSelected ? '#2a2a3e' : '#1a1a2e'
    : props.isSelected ? '#f0f2ff' : '#ffffff'};
  border: 2px solid ${props => props.isSelected 
    ? '#667eea' 
    : props.theme.name === 'dark' ? '#2a2a3e' : '#e0e0e0'};
  border-radius: 20px;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  animation: ${props => props.isSelected ? pulseGlow : 'none'} 2s ease-in-out infinite;
  
  &:hover {
    transform: translateX(10px);
    border-color: #667eea;
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: ${props => {
      switch(props.status) {
        case 'exploding': return 'linear-gradient(180deg, #ff6b6b 0%, #ff4757 100%)';
        case 'rising': return 'linear-gradient(180deg, #4ecdc4 0%, #44a08d 100%)';
        case 'trending': return 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)';
        default: return 'linear-gradient(180deg, #95a5a6 0%, #7f8c8d 100%)';
      }
    }};
  }
`;

const TrendHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
`;

const TrendInfo = styled.div`
  flex: 1;
`;

const TrendName = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.name === 'dark' ? '#fff' : '#333'};
`;

const TrendMetrics = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
`;

const Metric = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${props => props.theme.name === 'dark' ? '#999' : '#666'};
  
  svg {
    color: #667eea;
  }
`;

const StatusBadge = styled.div<{ status: string }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  background: ${props => {
    switch(props.status) {
      case 'exploding': return '#ff4757';
      case 'rising': return '#44a08d';
      case 'trending': return '#764ba2';
      default: return '#7f8c8d';
    }
  }};
  color: white;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const OpportunityGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const OpportunityCard = styled.div<{ platform: 'youtube' | 'reddit' }>`
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'rgba(0, 0, 0, 0.03)'};
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'rgba(0, 0, 0, 0.1)'};
  border-radius: 12px;
  padding: 1rem;
  
  h4 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
    color: ${props => props.platform === 'youtube' ? '#FF0000' : '#FF4500'};
  }
`;

const OpportunityMetric = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  margin-bottom: 0.5rem;
  
  span:first-child {
    color: ${props => props.theme.name === 'dark' ? '#999' : '#666'};
  }
  
  span:last-child {
    font-weight: 600;
    color: ${props => props.theme.name === 'dark' ? '#fff' : '#333'};
  }
`;

const DetailPanel = styled(motion.div)`
  background: ${props => props.theme.name === 'dark' ? '#1a1a2e' : '#ffffff'};
  border: 2px solid ${props => props.theme.name === 'dark' ? '#2a2a3e' : '#e0e0e0'};
  border-radius: 24px;
  padding: 2.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 100px;
  
  @media (max-width: 1200px) {
    position: relative;
    top: 0;
  }
`;

const DetailHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const DetailTitle = styled.h3`
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: ${props => props.theme.name === 'dark' ? '#fff' : '#333'};
`;

const DetailSubtitle = styled.p`
  font-size: 1rem;
  color: ${props => props.theme.name === 'dark' ? '#999' : '#666'};
`;

const ROICalculator = styled.div`
  background: ${props => props.theme.name === 'dark' 
    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)' 
    : 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)'};
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(102, 126, 234, 0.3)' 
    : 'rgba(102, 126, 234, 0.2)'};
  padding: 1.5rem;
  border-radius: 16px;
  margin-bottom: 2rem;
`;

const ROITitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: ${props => props.theme.name === 'dark' ? '#fff' : '#333'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  svg {
    color: #667eea;
  }
`;

const ROIMetric = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  
  &:last-child {
    font-weight: 700;
    font-size: 1rem;
    color: #4ecdc4;
    border-top: 1px solid ${props => props.theme.name === 'dark' 
      ? 'rgba(255, 255, 255, 0.1)' 
      : 'rgba(0, 0, 0, 0.1)'};
    padding-top: 0.75rem;
    margin-bottom: 0;
  }
`;

const CommentPreview = styled.div`
  margin-bottom: 2rem;
`;

const CommentTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: ${props => props.theme.name === 'dark' ? '#fff' : '#333'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  svg {
    color: #667eea;
  }
`;

const CommentExample = styled.div<{ platform: 'youtube' | 'reddit' }>`
  background: ${props => props.theme.name === 'dark' ? '#2a2a3e' : '#f8f9fa'};
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 1rem;
  border-left: 3px solid ${props => props.platform === 'youtube' ? '#FF0000' : '#FF4500'};
  position: relative;
  
  &::before {
    content: ${props => props.platform === 'youtube' ? '"YouTube"' : '"Reddit"'};
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: ${props => props.platform === 'youtube' ? '#FF0000' : '#FF4500'};
    margin-bottom: 0.5rem;
  }
  
  p {
    font-style: italic;
    color: ${props => props.theme.name === 'dark' ? '#ccc' : '#555'};
    font-size: 0.875rem;
    line-height: 1.6;
    margin: 0;
    
    /* Destacar [PRODUTO/SERVIÇO] */
    strong {
      color: ${props => props.theme.name === 'dark' ? '#8b92f8' : '#6366f1'};
      font-weight: 600;
      background: ${props => props.theme.name === 'dark' 
        ? 'rgba(102, 126, 234, 0.08)' 
        : 'rgba(99, 102, 241, 0.06)'};
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
      position: relative;
      display: inline-block;
      transition: all 0.2s ease;
      
      &:hover {
        background: ${props => props.theme.name === 'dark' 
          ? 'rgba(102, 126, 234, 0.15)' 
          : 'rgba(99, 102, 241, 0.1)'};
      }
      
      &:hover::after {
        content: ${props => props.theme.name === 'dark' 
          ? "'Aqui entra o nome do seu produto/serviço'" 
          : "'Your product/service name goes here'"};
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: ${props => props.theme.name === 'dark' ? '#1a1a1a' : '#333'};
        color: white;
        padding: 0.4rem 0.8rem;
        border-radius: 6px;
        font-size: 0.7rem;
        white-space: nowrap;
        margin-bottom: 0.3rem;
        font-weight: 400;
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  flex-direction: column;
`;

const ActionButton = styled(motion.button)`
  width: 100%;
  padding: 1rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
    }
  }
  
  &.secondary {
    background: transparent;
    color: #667eea;
    border: 2px solid #667eea;
    
    &:hover {
      background: rgba(102, 126, 234, 0.1);
    }
  }
`;

// Revolutionary Snowball Effect Components
const SnowballSection = styled.div`
  margin: 6rem 0;
  padding: 4rem 0;
  background: ${props => props.theme.name === 'dark' 
    ? 'radial-gradient(ellipse at center, rgba(102, 126, 234, 0.05) 0%, transparent 70%)' 
    : 'radial-gradient(ellipse at center, rgba(102, 126, 234, 0.02) 0%, transparent 70%)'};
  position: relative;
  overflow: visible;
`;

const SnowballHeader = styled(motion.div)`
  text-align: center;
  margin-bottom: 4rem;
`;

const SnowballTitle = styled.h3`
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const SnowballSubtitle = styled.p`
  font-size: 1.125rem;
  color: ${props => props.theme.name === 'dark' ? '#a0a0a0' : '#666'};
  max-width: 600px;
  margin: 0 auto;
`;

// New Timeline Component for Snowball Effect
const SnowballTimeline = styled.div`
  position: relative;
  max-width: 1200px;
  margin: 4rem auto;
  padding: 2rem;
`;

const MonthsTrack = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1rem;
  align-items: flex-end;
  position: relative;
  padding-bottom: 250px;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    padding-bottom: 280px;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    padding-bottom: 300px;
  }
`;

const MonthColumn = styled(motion.div)<{ month: number; isActive: boolean }>`
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  
  &:hover {
    transform: translateY(-10px);
  }
`;

const PostAccumulator = styled.div<{ height: number }>`
  position: relative;
  width: 100%;
  height: ${props => props.height}px;
  display: flex;
  flex-direction: column-reverse;
  gap: 4px;
  margin-bottom: 1rem;
`;

const PostBlock = styled(motion.div)<{ index: number }>`
  width: 100%;
  height: 20px;
  background: linear-gradient(135deg, 
    ${props => props.index === 0 ? '#667eea' : '#4ecdc4'} 0%, 
    ${props => props.index === 0 ? '#764ba2' : '#44a08d'} 100%);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  box-shadow: 0 2px 10px ${props => props.index === 0 
    ? 'rgba(102, 126, 234, 0.3)' 
    : 'rgba(78, 205, 196, 0.3)'};
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(255, 255, 255, 0.3) 50%, 
      transparent 100%);
    animation: shimmer 3s infinite;
  }
  
  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }
`;

const MonthLabel = styled.div`
  text-align: center;
  font-weight: 600;
  font-size: 1rem;
  color: ${props => props.theme.name === 'dark' ? '#fff' : '#333'};
  margin-bottom: 0.5rem;
`;

const MonthMetrics = styled.div`
  text-align: center;
  font-size: 0.875rem;
  color: ${props => props.theme.name === 'dark' ? '#999' : '#666'};
`;

const TrafficMeter = styled(motion.div)`
  position: absolute;
  bottom: -200px;
  left: 0;
  right: 0;
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(26, 26, 46, 0.95)' 
    : 'rgba(255, 255, 255, 0.95)'};
  padding: 1rem;
  border-radius: 16px;
  border: 2px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(102, 126, 234, 0.3)' 
    : 'rgba(102, 126, 234, 0.2)'};
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  z-index: 10;
  width: 100%;
`;

const TrafficValue = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: #4ecdc4;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-direction: column;
  
  svg {
    font-size: 1.25rem;
  }
  
  span {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .label {
    font-size: 0.6rem;
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #667eea;
    margin-bottom: 0.25rem;
  }
`;

const GrowthIndicator = styled(motion.div)`
  position: absolute;
  top: -30px;
  right: -10px;
  background: #4ecdc4;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  box-shadow: 0 4px 15px rgba(78, 205, 196, 0.4);
`;



const InsightBox = styled(motion.div)`
  background: linear-gradient(135deg, 
    ${props => props.theme.name === 'dark' 
      ? 'rgba(102, 126, 234, 0.1)' 
      : 'rgba(102, 126, 234, 0.05)'} 0%, 
    ${props => props.theme.name === 'dark' 
      ? 'rgba(118, 75, 162, 0.1)' 
      : 'rgba(118, 75, 162, 0.05)'} 100%);
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(102, 126, 234, 0.3)' 
    : 'rgba(102, 126, 234, 0.2)'};
  border-radius: 16px;
  padding: 2rem;
  margin: 3rem auto;
  max-width: 800px;
  text-align: center;
`;

const InsightTitle = styled.h4`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: ${props => props.theme.name === 'dark' ? '#fff' : '#333'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  
  svg {
    color: #667eea;
    font-size: 1.75rem;
  }
`;

const InsightText = styled.p`
  font-size: 1.125rem;
  line-height: 1.6;
  color: ${props => props.theme.name === 'dark' ? '#ccc' : '#555'};
  
  strong {
    color: #4ecdc4;
    font-weight: 700;
  }
`;

const CompetitorAlert = styled(motion.div)`
  background: ${props => props.theme.name === 'dark' 
    ? 'rgba(255, 107, 107, 0.1)' 
    : 'rgba(255, 107, 107, 0.05)'};
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  
  svg {
    color: #ff6b6b;
    font-size: 1.25rem;
  }
  
  p {
    font-size: 0.875rem;
    color: ${props => props.theme.name === 'dark' ? '#fff' : '#333'};
    margin: 0;
    
    strong {
      color: #ff6b6b;
    }
  }
`;

const MarketTrends: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<TrendTopic>(mockTopics[0]);
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [monthlyInvestmentValue, setMonthlyInvestmentValue] = useState<number>(100);
  const { language } = useLanguage();
  const { theme } = useTheme();
  
  const lang: 'pt' | 'en' = language === 'pt' ? 'pt' : 'en';
  
  // Topic name translations
  const topicNameTranslations: {[key: string]: {pt: string, en: string}} = {
    'AI Marketing': { pt: 'Marketing com IA', en: 'AI Marketing' },
    'No-Code para Startups': { pt: 'No-Code para Startups', en: 'No-Code for Startups' },
    'Growth Hacking B2B': { pt: 'Growth Hacking B2B', en: 'B2B Growth Hacking' },
    'SaaS Metrics': { pt: 'Métricas SaaS', en: 'SaaS Metrics' }
  };
  
  const getTranslatedTopicName = (name: string) => {
    return topicNameTranslations[name]?.[lang as 'pt' | 'en'] || name;
  };
  
  const translations = {
    pt: {
      title: 'Descubra Oportunidades de Mercado',
      subtitle: 'Monitore tendências em tempo real no YouTube e Reddit. Transforme conversas em leads qualificados.',
      snowballTitle: 'O Poder do Conteúdo Perpétuo',
      snowballSubtitle: 'Cada comentário é um investimento que nunca para de gerar retorno',
      totalValue: 'Valor Total Gerado',
      monthLabels: ['Mês 1', 'Mês 2', 'Mês 3', 'Mês 4', 'Mês 5', 'Mês 6'],
      yourBusiness: ['SEU', 'NEGÓCIO'],
      growth: 'Crescimento',
      volumeMonth: 'Buscas/mês',
      relevance: 'Relevância',
      relatedTopics: 'Tópicos Relacionados',
      monitorTopic: 'Começar a Monitorar',
      analyzeCompetitors: 'Analisar Concorrência',
      reachPotential: 'Alcance Potencial',
      competitorActivity: 'Atividade dos Concorrentes',
      investmentTitle: 'Investimento Inteligente',
      monthlyInvestment: 'Investimento Mensal',
      estimatedPosts: 'Posts por Mês',
      costPerPost: 'Custo por Post',
      organicGrowth: 'Crescimento orgânico ilimitado',
      timelessContent: 'Cada comentário continua gerando resultados para sempre',
      postsGenerateValue: 'Posts que geram valor crescente',
      noLeadPromises: 'Alcance orgânico sem limites',
      commentPreview: 'Prévia de Comentários Inteligentes',
      commentNote: 'Comentários autênticos que agregam valor e mencionam sua empresa naturalmente',
      competitorAlert: 'concorrentes já estão capturando leads neste nicho!',
      clickToExplore: 'Clique para explorar',
      simulatorTitle: 'Simulador de Investimento',
      simulatorSubtitle: 'Ajuste o valor do investimento mensal para ver o impacto no crescimento',
      perMonth: 'por mês',
      postsPerMonthLabel: 'Posts/mês',
      costPerPostLabel: 'Custo/post',
      postsIn6Months: 'Posts em 6 meses',
      leadsHotAccumulated: 'Leads Quentes Acumulados',
      leadsPerMonth: 'leads/mês',
      cplRange: 'CPL: $5-20',
      decreasing: '↓ diminuindo',
      per: 'por',
      lead: 'lead',
      hotEngagedAudience: 'Audiência Quente e Engajada',
      hotAudienceText: function(topic: string) {
        return `Pessoas assistindo vídeos sobre ${topic} estão ativamente procurando soluções. Elas já estão interessadas no tema - seus comentários aparecem exatamente quando elas mais precisam de ajuda!`;
      },
      perpetualContent: 'O Poder do Conteúdo Perpétuo',
      perpetualSubtitle: 'Veja como cada post continua gerando valor ao longo do tempo',
      monthsLabel: ['Mês 1', 'Mês 2', 'Mês 3', 'Mês 4', 'Mês 5', 'Mês 6'],
      postsPerMonth: 'posts/mês',
      accumulatedTraffic: 'Tráfego Acumulado',
      infiniteValue: 'Valor Infinito',
      platforms: {
        youtube: 'Monitoramento YouTube',
        reddit: 'Monitoramento Reddit'
      },
      metrics: {
        channels: 'canais',
        videosWeek: 'vídeos/semana',
        avgViews: 'views médias',
        engagement: 'engajamento',
        subreddits: 'subreddits',
        dailyPosts: 'posts/dia',
        avgComments: 'comentários médios',
        karma: 'karma médio'
      },
      statusLabels: {
        exploding: 'EXPLODINDO',
        rising: 'SUBINDO',
        trending: 'TENDÊNCIA',
        emerging: 'EMERGENTE'
      },
      activityLevels: {
        low: 'Baixa',
        medium: 'Média',
        high: 'Alta'
      }
    },
    en: {
      title: 'Discover Market Opportunities',
      subtitle: 'Monitor real-time trends on YouTube and Reddit. Transform conversations into qualified leads.',
      snowballTitle: 'The Power of Perpetual Content',
      snowballSubtitle: 'Every comment is an investment that never stops generating returns',
      totalValue: 'Total Value Generated',
      monthLabels: ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'],
      yourBusiness: ['YOUR', 'BUSINESS'],
      growth: 'Growth',
      volumeMonth: 'Searches/month',
      relevance: 'Relevance',
      relatedTopics: 'Related Topics',
      monitorTopic: 'Start Monitoring',
      analyzeCompetitors: 'Analyze Competition',
      reachPotential: 'Reach Potential',
      competitorActivity: 'Competitor Activity',
      investmentTitle: 'Smart Investment',
      monthlyInvestment: 'Monthly Investment',
      estimatedPosts: 'Posts per Month',
      costPerPost: 'Cost per Post',
      organicGrowth: 'Unlimited organic growth',
      timelessContent: 'Each comment keeps generating results forever',
      postsGenerateValue: 'Posts that generate growing value',
      noLeadPromises: 'Organic reach without limits',
      commentPreview: 'Smart Comment Preview',
      commentNote: 'Authentic comments that add value and naturally mention your company',
      competitorAlert: 'competitors are already capturing leads in this niche!',
      clickToExplore: 'Click to explore',
      simulatorTitle: 'Investment Simulator',
      simulatorSubtitle: 'Adjust the monthly investment to see the growth impact',
      perMonth: 'per month',
      postsPerMonthLabel: 'Posts/month',
      costPerPostLabel: 'Cost/post',
      postsIn6Months: 'Posts in 6 months',
      leadsHotAccumulated: 'Accumulated Hot Leads',
      leadsPerMonth: 'leads/month',
      cplRange: 'CPL: $5-20',
      decreasing: '↓ decreasing',
      per: 'per',
      lead: 'lead',
      hotEngagedAudience: 'Hot and Engaged Audience',
      hotAudienceText: function(topic: string) {
        return `People watching videos about ${topic} are actively looking for solutions. They're already interested in the topic - your comments appear exactly when they need help the most!`;
      },
      perpetualContent: 'The Power of Perpetual Content',
      perpetualSubtitle: 'See how each post continues to generate value over time',
      monthsLabel: ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'],
      postsPerMonth: 'posts/month',
      accumulatedTraffic: 'Accumulated Traffic',
      infiniteValue: 'Infinite Value',
      platforms: {
        youtube: 'YouTube Monitoring',
        reddit: 'Reddit Monitoring'
      },
      metrics: {
        channels: 'channels',
        videosWeek: 'videos/week',
        avgViews: 'avg views',
        engagement: 'engagement',
        subreddits: 'subreddits',
        dailyPosts: 'posts/day',
        avgComments: 'avg comments',
        karma: 'avg karma'
      },
      statusLabels: {
        exploding: 'EXPLODING',
        rising: 'RISING',
        trending: 'TRENDING',
        emerging: 'EMERGING'
      },
      activityLevels: {
        low: 'Low',
        medium: 'Medium',
        high: 'High'
      }
    }
  };
  
  const t = translations[lang];

  // Calculate Investment
  const costPerPost = 0.50; // $0.50 por post
  const postsPerMonth = Math.floor(monthlyInvestmentValue / costPerPost); // Dynamic posts per month
  const totalPostCost = postsPerMonth * costPerPost;

  // Função para destacar menções da empresa nos comentários
  const highlightCompanyMentions = (text: string) => {
    // Destacar [PRODUTO/SERVIÇO] e [PRODUCT/SERVICE]
    let highlightedText = text;
    
    highlightedText = highlightedText.replace(
      /\[PRODUTO\/SERVIÇO\]/g,
      '<strong>[PRODUTO/SERVIÇO]</strong>'
    );
    
    highlightedText = highlightedText.replace(
      /\[PRODUCT\/SERVICE\]/g,
      '<strong>[PRODUCT/SERVICE]</strong>'
    );
    
    return highlightedText;
  };

  return (
    <Container>
      <Wrapper>
        <Header>
          <Title
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {t.title}
          </Title>
          <Subtitle
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {t.subtitle}
          </Subtitle>
          <PlatformBadges
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <PlatformBadge platform="youtube">
              {renderIcon(FaYoutube)}
              {t.platforms.youtube}
            </PlatformBadge>
            <PlatformBadge platform="reddit">
              {renderIcon(FaReddit)}
              {t.platforms.reddit}
            </PlatformBadge>
          </PlatformBadges>
        </Header>

        <MainContent>
          <TrendsList>
            {mockTopics.map((topic, index) => (
              <TrendCard
                key={topic.id}
                isSelected={selectedTopic.id === topic.id}
                status={topic.status}
                onClick={() => setSelectedTopic(topic)}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <TrendHeader>
                  <TrendInfo>
                    <TrendName>{getTranslatedTopicName(topic.name)}</TrendName>
                    <TrendMetrics>
                      <Metric>
                        {renderIcon(HiTrendingUp)}
                        +{topic.growth}%
                      </Metric>
                      <Metric>
                        {renderIcon(FaEye)}
                        {topic.volume}
                      </Metric>
                      <Metric>
                        {renderIcon(FaUsers)}
                        {topic.reachPotential}
                      </Metric>
                    </TrendMetrics>
                  </TrendInfo>
                  <StatusBadge status={topic.status}>
                    {topic.status === 'exploding' && '🔥'}
                    {topic.status === 'rising' && '🚀'}
                    {topic.status === 'trending' && '📈'}
                    {topic.status === 'emerging' && '🌱'}
                    {t.statusLabels[topic.status]}
                  </StatusBadge>
                </TrendHeader>

                <OpportunityGrid>
                  <OpportunityCard platform="youtube">
                    <h4>{renderIcon(FaYoutube)} YouTube</h4>
                    <OpportunityMetric>
                      <span>{t.metrics.channels}:</span>
                      <span>{topic.opportunities.youtube.channels}</span>
                    </OpportunityMetric>
                    <OpportunityMetric>
                      <span>{t.metrics.videosWeek}:</span>
                      <span>{topic.opportunities.youtube.videosPerWeek}</span>
                    </OpportunityMetric>
                    <OpportunityMetric>
                      <span>{t.metrics.avgViews}:</span>
                      <span>{topic.opportunities.youtube.avgViews}</span>
                    </OpportunityMetric>
                  </OpportunityCard>

                  <OpportunityCard platform="reddit">
                    <h4>{renderIcon(FaReddit)} Reddit</h4>
                    <OpportunityMetric>
                      <span>{t.metrics.subreddits}:</span>
                      <span>{topic.opportunities.reddit.subreddits}</span>
                    </OpportunityMetric>
                    <OpportunityMetric>
                      <span>{t.metrics.dailyPosts}:</span>
                      <span>{topic.opportunities.reddit.dailyPosts}</span>
                    </OpportunityMetric>
                    <OpportunityMetric>
                      <span>{t.metrics.avgComments}:</span>
                      <span>{topic.opportunities.reddit.avgComments}</span>
                    </OpportunityMetric>
                  </OpportunityCard>
                </OpportunityGrid>

                {topic.competitorActivity === 'high' && (
                  <CompetitorAlert
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderIcon(FaFire)}
                    <p>
                      <strong>{Math.floor(Math.random() * 5) + 3}</strong> {t.competitorAlert}
                    </p>
                  </CompetitorAlert>
                )}
              </TrendCard>
            ))}
          </TrendsList>

          <AnimatePresence mode="wait">
            {selectedTopic && (
              <DetailPanel
                key={selectedTopic.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
              >
                <DetailHeader>
                  <DetailTitle>{getTranslatedTopicName(selectedTopic.name)}</DetailTitle>
                  <DetailSubtitle>
                    {t.reachPotential}: <strong>{selectedTopic.reachPotential}</strong> | 
                    {' '}{t.competitorActivity}: <strong>{t.activityLevels[selectedTopic.competitorActivity]}</strong>
                  </DetailSubtitle>
                </DetailHeader>

                <ROICalculator>
                  <ROITitle>
                    {renderIcon(FaCalculator)}
                    {t.investmentTitle}
                  </ROITitle>
                  <ROIMetric>
                    <span>{t.monthlyInvestment}:</span>
                    <span>${monthlyInvestmentValue}</span>
                  </ROIMetric>
                  <ROIMetric>
                    <span>{t.estimatedPosts}:</span>
                    <span>{postsPerMonth}</span>
                  </ROIMetric>
                  <ROIMetric>
                    <span>{t.costPerPost}:</span>
                    <span>${costPerPost.toFixed(2)}</span>
                  </ROIMetric>
                  <ROIMetric>
                    <span>{t.organicGrowth}:</span>
                    <span style={{color: '#4ecdc4', fontWeight: 700}}>∞</span>
                  </ROIMetric>
                  <ROIMetric style={{borderTop: 'none', paddingTop: 0}}>
                    <span style={{fontSize: '0.75rem', fontStyle: 'italic', color: theme.name === 'dark' ? '#999' : '#666'}}>
                      {t.timelessContent}
                    </span>
                  </ROIMetric>
                </ROICalculator>

                <CommentPreview>
                  <CommentTitle>
                    {renderIcon(FaCommentDots)}
                    {t.commentPreview}
                  </CommentTitle>
                  <div style={{
                    fontSize: '0.75rem',
                    color: theme.name === 'dark' ? '#999' : '#666',
                    fontStyle: 'italic',
                    marginBottom: '1rem',
                    textAlign: 'center',
                    padding: '0.5rem',
                    background: theme.name === 'dark' ? 'rgba(102, 126, 234, 0.1)' : 'rgba(102, 126, 234, 0.05)',
                    borderRadius: '8px'
                  }}>
                    {renderIcon(FaEye)} {t.commentNote}
                  </div>
                  <div style={{
                    fontSize: '0.7rem',
                    color: theme.name === 'dark' ? '#4ecdc4' : '#2b7a78',
                    marginBottom: '1rem',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}>
                    <div style={{
                      width: '20px',
                      height: '3px',
                      background: theme.name === 'dark' ? '#4ecdc4' : '#2b7a78',
                      borderRadius: '2px'
                    }}></div>
                    {lang === 'pt' 
                      ? 'Palavras destacadas = oportunidades para menções naturais' 
                      : 'Highlighted words = opportunities for natural mentions'}
                    <div style={{
                      width: '20px',
                      height: '3px',
                      background: theme.name === 'dark' ? '#4ecdc4' : '#2b7a78',
                      borderRadius: '2px'
                    }}></div>
                  </div>
                  {selectedTopic.sampleComments && (
                    <>
                      <CommentExample platform="youtube">
                        <p dangerouslySetInnerHTML={{ 
                          __html: highlightCompanyMentions(
                            selectedTopic.sampleComments.youtube.comment[lang]
                          ) 
                        }} />
                        <div style={{
                          marginTop: '0.75rem',
                          padding: '0.75rem',
                          background: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          color: theme.name === 'dark' ? '#888' : '#666',
                          borderLeft: '3px solid #FF0000'
                        }}>
                          <strong style={{color: theme.name === 'dark' ? '#aaa' : '#444'}}>
                            {lang === 'pt' ? 'Justificativa:' : 'Justification:'}
                          </strong> {selectedTopic.sampleComments.youtube.justification[lang]}
                        </div>
                      </CommentExample>
                      <CommentExample platform="reddit">
                        <p dangerouslySetInnerHTML={{ 
                          __html: highlightCompanyMentions(
                            selectedTopic.sampleComments.reddit.comment[lang]
                          ) 
                        }} />
                        <div style={{
                          marginTop: '0.75rem',
                          padding: '0.75rem',
                          background: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          color: theme.name === 'dark' ? '#888' : '#666',
                          borderLeft: '3px solid #FF4500'
                        }}>
                          <strong style={{color: theme.name === 'dark' ? '#aaa' : '#444'}}>
                            {lang === 'pt' ? 'Justificativa:' : 'Justification:'}
                          </strong> {selectedTopic.sampleComments.reddit.justification[lang]}
                        </div>
                      </CommentExample>
                    </>
                  )}
                </CommentPreview>

                <ActionButtons>
                  <ActionButton
                    className="primary"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {renderIcon(FaRocket)}
                    {t.monitorTopic}
                  </ActionButton>
                  <ActionButton
                    className="secondary"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {renderIcon(FaChartLine)}
                    {t.analyzeCompetitors}
                  </ActionButton>
                </ActionButtons>
              </DetailPanel>
            )}
          </AnimatePresence>
        </MainContent>

        {/* Revolutionary Snowball Effect Section */}
        <SnowballSection>
          <SnowballHeader
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <SnowballTitle>{t.perpetualContent}</SnowballTitle>
            <SnowballSubtitle>{t.perpetualSubtitle}</SnowballSubtitle>
          </SnowballHeader>

          {/* Interactive Timeline showing accumulation */}
          <SnowballTimeline>
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '3rem',
              background: theme.name === 'dark' 
                ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
              padding: '2rem',
              borderRadius: '20px',
              border: `1px solid ${theme.name === 'dark' ? 'rgba(102, 126, 234, 0.3)' : 'rgba(102, 126, 234, 0.2)'}`
            }}>
              <h4 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '700',
                marginBottom: '1rem',
                color: theme.name === 'dark' ? '#fff' : '#333'
              }}>
                {t.simulatorTitle}
              </h4>
              <p style={{ 
                fontSize: '0.875rem', 
                color: theme.name === 'dark' ? '#999' : '#666',
                marginBottom: '1.5rem'
              }}>
                {t.simulatorSubtitle}
              </p>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '2rem',
                flexWrap: 'wrap'
              }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMonthlyInvestmentValue(Math.max(100, monthlyInvestmentValue - 100))}
                  style={{
                    background: 'rgba(255, 107, 107, 0.1)',
                    border: '2px solid rgba(255, 107, 107, 0.3)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    color: '#ff6b6b',
                    fontWeight: '700'
                  }}
                >
                  -
                </motion.button>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '2.5rem', 
                    fontWeight: '800',
                    color: '#667eea',
                    marginBottom: '0.5rem'
                  }}>
                    ${monthlyInvestmentValue}
                  </div>
                  <div style={{ 
                    fontSize: '0.875rem',
                    color: theme.name === 'dark' ? '#999' : '#666'
                  }}>
                    {t.perMonth}
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMonthlyInvestmentValue(monthlyInvestmentValue + 100)}
                  style={{
                    background: 'rgba(78, 205, 196, 0.1)',
                    border: '2px solid rgba(78, 205, 196, 0.3)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    color: '#4ecdc4',
                    fontWeight: '700'
                  }}
                >
                  +
                </motion.button>
              </div>
              
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                borderRadius: '12px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: theme.name === 'dark' ? '#999' : '#666', marginBottom: '0.25rem' }}>
                    {t.postsPerMonthLabel}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#667eea' }}>
                    {Math.floor(monthlyInvestmentValue / 0.50)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: theme.name === 'dark' ? '#999' : '#666', marginBottom: '0.25rem' }}>
                    {t.costPerPostLabel}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#4ecdc4' }}>
                    $0.50
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: theme.name === 'dark' ? '#999' : '#666', marginBottom: '0.25rem' }}>
                    {t.postsIn6Months}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#764ba2' }}>
                    {Math.floor(monthlyInvestmentValue / 0.50) * 6}
                  </div>
                </div>
              </div>
            </div>
            
            <MonthsTrack>
              {[1, 2, 3, 4, 5, 6].map((month) => {
                const postsThisMonth = Math.floor(monthlyInvestmentValue / 0.50); // Dynamic posts based on investment
                const totalPosts = postsThisMonth * month;
                
                // Realistic lead calculation: 30-50 hot leads per 200 posts
                const baseLeadsPer200Posts = 40; // Average of 30-50
                const leadsRatio = postsThisMonth / 200; // Scale leads based on post count
                const monthlyBaseLeads = baseLeadsPer200Posts * leadsRatio;
                
                // Compound growth as authority builds
                let totalLeads = 0;
                for (let m = 1; m <= month; m++) {
                  const ageBonus = Math.pow(1.5, m - 1); // 50% growth per month as authority builds
                  totalLeads += monthlyBaseLeads * ageBonus;
                }
                
                // Calculate equivalent Google Ads cost
                const avgCPL = 12.5; // Average Cost Per Lead $5-20
                const adsCostEquivalent = Math.round(totalLeads * avgCPL);
                
                // Calculate cost per hot lead with Liftlio
                const costPerLeadLiftlio = (monthlyInvestmentValue * month) / totalLeads;
                
                const isActive = activeMonth === month;

                return (
                  <MonthColumn
                    key={month}
                    month={month}
                    isActive={isActive}
                    onClick={() => setActiveMonth(month)}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: month * 0.1 }}
                    whileHover={{ y: -10 }}
                  >
                    <MonthLabel>{t.monthsLabel[month - 1]}</MonthLabel>
                    
                    <PostAccumulator height={Math.min(month * 40, 200)}>
                      {Array.from({ length: Math.min(month, 5) }).map((_, index) => (
                        <PostBlock
                          key={index}
                          index={index}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            duration: 0.4,
                            delay: (month - 1) * 0.2 + index * 0.1,
                            type: "spring",
                            stiffness: 260,
                            damping: 20
                          }}
                          style={{
                            height: '35px',
                            fontSize: '0.75rem',
                            fontWeight: '700'
                          }}
                        >
                          {index === 0 ? `${postsThisMonth}` : `+${postsThisMonth}`}
                        </PostBlock>
                      ))}
                      {month > 5 && (
                        <PostBlock
                          index={0}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 0.7 }}
                          transition={{
                            duration: 0.4,
                            delay: month * 0.2,
                            type: "spring"
                          }}
                          style={{
                            height: '25px',
                            fontSize: '0.625rem',
                            background: 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)'
                          }}
                        >
                          ...
                        </PostBlock>
                      )}
                    </PostAccumulator>

                    <MonthMetrics>
                      <div style={{ fontWeight: '700', fontSize: '1rem' }}>{totalPosts} posts</div>
                    </MonthMetrics>

                    <TrafficMeter
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        duration: 0.5,
                        delay: month * 0.2,
                        type: "spring"
                      }}
                    >
                      <TrafficValue>
                        <div className="label">
                          {t.leadsHotAccumulated}
                        </div>
                        <span style={{ fontSize: '1rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                          {renderIcon(FaFire)}
                          {Math.round(totalLeads).toLocaleString()}
                        </span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.8, marginBottom: '0.4rem' }}>
                          {t.leadsPerMonth}
                        </span>
                        <div style={{
                          borderTop: '1px solid rgba(102, 126, 234, 0.2)',
                          paddingTop: '0.5rem',
                          marginTop: '0.25rem',
                          fontSize: '0.625rem'
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div style={{ color: '#ff6b6b' }}>
                              <div style={{ fontSize: '0.5rem', marginBottom: '0.2rem' }}>
                                {lang === 'pt' ? 'Google Ads' : 'Google Ads'}
                              </div>
                              <div style={{ fontSize: '0.75rem', fontWeight: '700' }}>
                                ${adsCostEquivalent.toLocaleString()}
                              </div>
                              <div style={{ fontSize: '0.45rem', opacity: 0.7 }}>
                                {t.cplRange}
                              </div>
                            </div>
                            <div style={{ color: '#4ecdc4' }}>
                              <div style={{ fontSize: '0.5rem', marginBottom: '0.2rem' }}>
                                {lang === 'pt' ? 'Liftlio' : 'Liftlio'}
                              </div>
                              <div style={{ fontSize: '0.75rem', fontWeight: '700' }}>
                                ${costPerLeadLiftlio.toFixed(2)}/lead
                              </div>
                              <div style={{ fontSize: '0.45rem', opacity: 0.7 }}>
                                {t.decreasing}
                              </div>
                            </div>
                          </div>
                        </div>
                      </TrafficValue>
                    </TrafficMeter>

                    {month > 1 && (
                      <GrowthIndicator
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3, delay: month * 0.3 }}
                      >
                        {month === 2 && '+50%'}
                        {month === 3 && '+125%'}
                        {month === 4 && '+237%'}
                        {month === 5 && '+406%'}
                        {month === 6 && '+659%'}
                      </GrowthIndicator>
                    )}
                  </MonthColumn>
                );
              })}
            </MonthsTrack>
          </SnowballTimeline>

          {/* Hot Audience Insight Box */}
          <InsightBox
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            style={{
              background: `linear-gradient(135deg, 
                ${theme.name === 'dark' ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 107, 107, 0.05)'} 0%, 
                ${theme.name === 'dark' ? 'rgba(255, 71, 87, 0.1)' : 'rgba(255, 71, 87, 0.05)'} 100%)`,
              borderColor: theme.name === 'dark' ? 'rgba(255, 107, 107, 0.3)' : 'rgba(255, 107, 107, 0.2)'
            }}
          >
            <InsightTitle>
              {renderIcon(FaFire)}
              {t.hotEngagedAudience}
            </InsightTitle>
            <InsightText dangerouslySetInnerHTML={{ 
              __html: t.hotAudienceText(getTranslatedTopicName(selectedTopic.name)).replace(
                new RegExp(`(${getTranslatedTopicName(selectedTopic.name)})`, 'g'),
                '<strong>$1</strong>'
              ).replace(
                /(ativamente procurando soluções|actively looking for solutions)/g,
                '<strong>$1</strong>'
              )
            }} />
          </InsightBox>



          {/* Key Insight Box */}
          <InsightBox
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          >
            <InsightTitle>
              {renderIcon(HiLightningBolt)}
              {t.postsGenerateValue}
            </InsightTitle>
            <InsightText>
              {lang === 'pt' 
                ? <>Com <strong>{postsPerMonth} posts por mês em vídeos quentes sobre {getTranslatedTopicName(selectedTopic.name)}</strong>, após 6 meses você terá <strong>{postsPerMonth * 6} comentários estratégicos em vídeos com milhares de views ativas</strong>. Cada comentário fica visível em vídeos que <strong>pessoas assistem todos os dias procurando soluções</strong>, gerando tráfego qualificado 24/7. Seus comentários continuam sendo lidos por um <strong>público já engajado e interessado no tema</strong> - para sempre!</>
                : <>With <strong>{postsPerMonth} posts per month on hot videos about {getTranslatedTopicName(selectedTopic.name)}</strong>, after 6 months you'll have <strong>{postsPerMonth * 6} strategic comments on videos with thousands of active views</strong>. Each comment remains visible on videos that <strong>people watch daily looking for solutions</strong>, generating qualified traffic 24/7. Your comments keep being read by an <strong>already engaged audience interested in the topic</strong> - forever!</>
              }
            </InsightText>
          </InsightBox>
        </SnowballSection>
      </Wrapper>
    </Container>
  );
};

export default MarketTrends;