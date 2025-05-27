import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { FaYoutube, FaChartLine, FaBell, FaRocket, FaCheck, FaArrowRight, FaPlay, FaQuoteLeft, FaGlobe, FaSun, FaMoon, FaShieldAlt, FaClock, FaUsers, FaTrophy, FaFire, FaDollarSign, FaExclamationTriangle, FaLock, FaInfinity } from 'react-icons/fa';
import { HiSparkles, HiLightningBolt } from 'react-icons/hi';
import { BiPulse } from 'react-icons/bi';
import { MdAutoGraph, MdTrendingUp } from 'react-icons/md';
import { AiOutlineCalculator } from 'react-icons/ai';
import { renderIcon } from '../utils/IconHelper';
import { useTheme } from '../context/ThemeContext';
import Cookies from 'js-cookie';
import Testimonials from '../components/Testimonials';

// Internacionalização
const translations = {
  en: {
    nav: {
      features: "Features",
      pricing: "Pricing",
      testimonials: "Testimonials",
      login: "Sign In",
    },
    hero: {
      badge: "Organic Traffic Snowball Effect",
      title: "Multiply Your Organic Traffic",
      titleHighlight: "Exponentially",
      subtitle: "Liftlio finds videos about your niche and responds to comments from qualified leads. Monitor relevant channels to comment as soon as videos are posted, creating a snowball effect of organic traffic that grows forever.",
      cta: {
        primary: "Start Growing Today",
        secondary: "See How It Works"
      },
      metrics: {
        mentions: "Mentions",
        positive: "Positive",
        leads: "Leads"
      }
    },
    features: {
      title: "Features That",
      titleHighlight: "Drive Results",
      subtitle: "Everything you need to monitor, analyze, and convert mentions into real opportunities",
      items: [
        {
          title: "Real-Time Channel Monitoring",
          description: "Monitor relevant channels 24/7. Comment within minutes of new videos being posted to capture early traffic."
        },
        {
          title: "AI Sentiment Analysis",
          description: "Advanced AI analyzes context and sentiment, helping you prioritize responses and identify crises quickly."
        },
        {
          title: "Human-Like Comments",
          description: "AI creates genuine, helpful comments that cite specific timestamps and provide real value - just like a real user would."
        },
        {
          title: "Snowball Traffic Effect",
          description: "Comments stay forever on videos, continuously bringing qualified leads to your business month after month."
        },
        {
          title: "Intelligent Scheduling",
          description: "Posts are scheduled at different times daily, mixing promotional and non-promotional content to appear genuinely human."
        },
        {
          title: "No Blocks, No Bans",
          description: "Our AI behaves exactly like a helpful YouTube user, not a salesperson. Zero risk of channel penalties."
        }
      ]
    },
    stats: {
      monitored: "Mentions Monitored",
      leads: "Leads Generated",
      accuracy: "AI Accuracy",
      monitoring: "Monitoring"
    },
    exponential: {
      title: "The Organic Traffic",
      titleHighlight: "Snowball Effect",
      subtitle: "Unlike paid ads that stop when you stop paying, Liftlio creates permanent assets that grow exponentially",
      items: [
        {
          month: "Month 1",
          value: "147",
          description: "Initial comments on new videos"
        },
        {
          month: "Month 3",
          value: "892",
          description: "Comments accumulate as videos gain views"
        },
        {
          month: "Month 6",
          value: "3,241",
          description: "Older videos continue bringing traffic"
        },
        {
          month: "Month 12",
          value: "12,847",
          description: "Exponential growth from all comments"
        }
      ],
      benefits: [
        "Comments never expire - they work 24/7 forever",
        "Zero additional cost as traffic grows",
        "Builds authority in your niche over time",
        "Each comment is a permanent salesperson"
      ]
    },
    painPoints: {
      title: "Stop Burning Money on",
      titleHighlight: "Paid Ads",
      subtitle: "Every day you wait, your competitors are building permanent organic traffic while you're renting temporary clicks",
      items: [
        {
          icon: "fire",
          title: "Ads Cost $5-20 Per Click",
          description: "And they disappear the moment you stop paying"
        },
        {
          icon: "warning",
          title: "Ad Costs Keep Rising",
          description: "CPCs increased 50% last year alone"
        },
        {
          icon: "infinity",
          title: "Organic Traffic is Forever",
          description: "One comment can bring leads for years"
        }
      ]
    },
    calculator: {
      title: "See Your",
      titleHighlight: "Savings",
      subtitle: "Compare your current ad spend with Liftlio's permanent organic traffic",
      adSpendLabel: "Monthly Ad Spend",
      calculateButton: "Calculate Savings",
      results: {
        currentCost: "Cost Per Visitor (Ads)",
        liftlioCost: "Cost Per Visitor (Liftlio)",
        savings: "You Save Per Visitor",
        organicValue: "Lifetime Value Per Visitor",
        roi: "Your ROI"
      }
    },
    liveDemo: {
      title: "Watch Liftlio",
      titleHighlight: "In Action",
      subtitle: "See real comments being posted right now",
      recentActivity: "Recent Activity",
      viewMore: "View Live Dashboard"
    },
    urgency: {
      spots: "Only {spots} clients accepted this month",
      price: "Price per qualified visitor: $0.10 vs $5-20 in ads",
      guarantee: "10x cheaper than any advertising platform"
    },
    process: {
      title: "How Liftlio",
      titleHighlight: "Works",
      subtitle: "Our intelligent 6-step process creates an organic traffic snowball that grows forever",
      steps: [
        {
          title: "Channel Monitoring",
          description: "Monitor relevant channels 24/7. Get alerts the moment new videos are posted"
        },
        {
          title: "Video Analysis",
          description: "AI watches videos and identifies key topics, finding perfect moments to reference"
        },
        {
          title: "Lead Detection",
          description: "Identifies comments from potential customers asking questions or seeking solutions"
        },
        {
          title: "Human-Like Response",
          description: "Creates helpful comments citing specific timestamps (e.g., 'at 3:42 they mention...')"
        },
        {
          title: "Natural Behavior",
          description: "Mixes promotional and non-promotional comments to appear genuinely helpful"
        },
        {
          title: "Snowball Effect",
          description: "Comments stay forever, continuously bringing qualified traffic as videos grow"
        }
      ]
    },
    pricing: {
      title: "Simple Pricing,",
      titleHighlight: "Powerful Results",
      subtitle: "Choose the perfect plan for your monitoring needs",
      monthly: "per month",
      plans: {
        starter: {
          name: "Starter",
          description: "Perfect for small businesses",
          mentions: "mentions/month",
          features: [
            "Up to 80 mentions/month",
            "3 monitored channels",
            "Sentiment analysis",
            "Basic dashboard",
            "Email support"
          ]
        },
        professional: {
          name: "Professional",
          description: "Ideal for growing companies",
          mentions: "mentions/month",
          badge: "Most Popular",
          features: [
            "Up to 300 mentions/month",
            "Unlimited channels",
            "Advanced AI leads",
            "Custom reports",
            "API access",
            "Priority support"
          ]
        },
        enterprise: {
          name: "Enterprise",
          description: "For large organizations",
          mentions: "mentions/month",
          features: [
            "Up to 500 mentions/month",
            "All Professional features",
            "Custom AI training",
            "Dedicated account manager",
            "SLA guaranteed",
            "White-label options"
          ]
        }
      },
      cta: "Get Started Now"
    },
    testimonials: {
      title: "What Our",
      titleHighlight: "Customers Say",
      subtitle: "See how companies are transforming mentions into growth",
      items: [
        {
          text: "Liftlio revolutionized our marketing strategy. We can identify and convert leads that previously went unnoticed.",
          author: "Sarah Johnson",
          role: "CMO, TechStart"
        },
        {
          text: "Real-time sentiment analysis helped us prevent several crises and improve our customer service.",
          author: "Michael Chen",
          role: "CEO, E-commerce Plus"
        },
        {
          text: "Incredible ROI! In just 3 months, Liftlio paid for itself with the new customers we gained.",
          author: "Jessica Miller",
          role: "Sales Director, SaaS Co"
        }
      ]
    },
    cta: {
      title: "Ready to",
      titleHighlight: "Transform",
      titleEnd: "Your Mentions?",
      subtitle: "Join thousands of companies already converting mentions into real business opportunities",
      button: "Start Growing Your Traffic Today"
    },
    footer: {
      description: "Transforming mentions into business opportunities through intelligent monitoring and real-time analysis.",
      product: "Product",
      company: "Company",
      legal: "Legal",
      links: {
        features: "Features",
        pricing: "Pricing",
        integrations: "Integrations",
        api: "API",
        about: "About",
        blog: "Blog",
        careers: "Careers",
        contact: "Contact",
        privacy: "Privacy",
        terms: "Terms",
        security: "Security"
      },
      copyright: "© 2024 Liftlio. All rights reserved."
    }
  },
  pt: {
    nav: {
      features: "Recursos",
      pricing: "Preços",
      testimonials: "Depoimentos",
      login: "Entrar",
    },
    hero: {
      badge: "Efeito Bola de Neve de Tráfego Orgânico",
      title: "Multiplique Seu Tráfego Orgânico",
      titleHighlight: "Exponencialmente",
      subtitle: "O Liftlio encontra vídeos sobre seu nicho e responde comentários de leads qualificados. Monitora canais relevantes para comentar assim que vídeos são postados, criando uma bola de neve de tráfego orgânico que cresce para sempre.",
      cta: {
        primary: "Comece a Crescer Hoje",
        secondary: "Veja Como Funciona"
      },
      metrics: {
        mentions: "Menções",
        positive: "Positivas",
        leads: "Leads"
      }
    },
    features: {
      title: "Recursos que",
      titleHighlight: "Geram Resultados",
      subtitle: "Tudo o que você precisa para monitorar, analisar e converter menções em oportunidades reais",
      items: [
        {
          title: "Monitoramento de Canais em Tempo Real",
          description: "Monitore canais relevantes 24/7. Comente em minutos após novos vídeos serem postados para capturar o tráfego inicial."
        },
        {
          title: "Análise de Sentimentos IA",
          description: "IA avançada analisa contexto e sentimento, ajudando você a priorizar respostas rapidamente."
        },
        {
          title: "Comentários Humanizados",
          description: "IA cria comentários genuínos e úteis que citam timestamps específicos e fornecem valor real - como um usuário real faria."
        },
        {
          title: "Efeito Bola de Neve de Tráfego",
          description: "Comentários ficam para sempre nos vídeos, trazendo leads qualificados continuamente para seu negócio mês após mês."
        },
        {
          title: "Agendamento Inteligente",
          description: "Posts agendados em horários diferentes diariamente, misturando conteúdo promocional e não-promocional para parecer genuinamente humano."
        },
        {
          title: "Sem Bloqueios, Sem Banimentos",
          description: "Nossa IA se comporta exatamente como um usuário útil do YouTube, não como um vendedor. Zero risco de penalidades."
        }
      ]
    },
    stats: {
      monitored: "Menções Monitoradas",
      leads: "Leads Gerados",
      accuracy: "Precisão da IA",
      monitoring: "Monitoramento"
    },
    exponential: {
      title: "O Efeito",
      titleHighlight: "Bola de Neve",
      subtitle: "Diferente de anúncios pagos que param quando você para de pagar, o Liftlio cria ativos permanentes que crescem exponencialmente",
      items: [
        {
          month: "Mês 1",
          value: "147",
          description: "Comentários iniciais em novos vídeos"
        },
        {
          month: "Mês 3",
          value: "892",
          description: "Comentários acumulam conforme vídeos ganham views"
        },
        {
          month: "Mês 6",
          value: "3.241",
          description: "Vídeos antigos continuam trazendo tráfego"
        },
        {
          month: "Mês 12",
          value: "12.847",
          description: "Crescimento exponencial de todos comentários"
        }
      ],
      benefits: [
        "Comentários nunca expiram - trabalham 24/7 para sempre",
        "Zero custo adicional conforme tráfego cresce",
        "Constrói autoridade no seu nicho ao longo do tempo",
        "Cada comentário é um vendedor permanente"
      ]
    },
    painPoints: {
      title: "Pare de Queimar Dinheiro com",
      titleHighlight: "Anúncios Pagos",
      subtitle: "A cada dia que você espera, seus concorrentes estão construindo tráfego orgânico permanente enquanto você aluga cliques temporários",
      items: [
        {
          icon: "fire",
          title: "Anúncios Custam R$5-20 Por Clique",
          description: "E desaparecem no momento que você para de pagar"
        },
        {
          icon: "warning",
          title: "Custos de Anúncios Só Aumentam",
          description: "CPCs aumentaram 50% só no ano passado"
        },
        {
          icon: "infinity",
          title: "Tráfego Orgânico é Para Sempre",
          description: "Um comentário pode trazer leads por anos"
        }
      ]
    },
    calculator: {
      title: "Veja Sua",
      titleHighlight: "Economia",
      subtitle: "Compare seu gasto atual com anúncios com o tráfego orgânico permanente do Liftlio",
      adSpendLabel: "Gasto Mensal com Anúncios",
      calculateButton: "Calcular Economia",
      results: {
        currentCost: "Custo Por Visitante (Anúncios)",
        liftlioCost: "Custo Por Visitante (Liftlio)",
        savings: "Você Economiza Por Visitante",
        organicValue: "Valor Vitalício Por Visitante",
        roi: "Seu ROI"
      }
    },
    liveDemo: {
      title: "Veja o Liftlio",
      titleHighlight: "Em Ação",
      subtitle: "Veja comentários reais sendo postados agora mesmo",
      recentActivity: "Atividade Recente",
      viewMore: "Ver Dashboard Ao Vivo"
    },
    urgency: {
      spots: "Apenas {spots} clientes aceitos este mês",
      price: "Preço por visitante qualificado: R$0,50 vs R$25-100 em anúncios",
      guarantee: "10x mais barato que qualquer plataforma de anúncios"
    },
    process: {
      title: "Como o Liftlio",
      titleHighlight: "Funciona",
      subtitle: "Nosso processo inteligente de 6 etapas cria uma bola de neve de tráfego orgânico que cresce para sempre",
      steps: [
        {
          title: "Monitoramento de Canais",
          description: "Monitora canais relevantes 24/7. Recebe alertas no momento que novos vídeos são postados"
        },
        {
          title: "Análise de Vídeos",
          description: "IA assiste vídeos e identifica tópicos-chave, encontrando momentos perfeitos para referenciar"
        },
        {
          title: "Detecção de Leads",
          description: "Identifica comentários de potenciais clientes fazendo perguntas ou buscando soluções"
        },
        {
          title: "Resposta Humanizada",
          description: "Cria comentários úteis citando timestamps específicos (ex: 'aos 3:42 eles mencionam...')"
        },
        {
          title: "Comportamento Natural",
          description: "Mistura comentários promocionais e não-promocionais para parecer genuinamente útil"
        },
        {
          title: "Efeito Bola de Neve",
          description: "Comentários ficam para sempre, trazendo tráfego qualificado continuamente conforme vídeos crescem"
        }
      ]
    },
    pricing: {
      title: "Preços Simples,",
      titleHighlight: "Resultados Poderosos",
      subtitle: "Escolha o plano perfeito para suas necessidades",
      monthly: "por mês",
      plans: {
        starter: {
          name: "Iniciante",
          description: "Perfeito para pequenas empresas",
          mentions: "menções/mês",
          features: [
            "Até 80 menções/mês",
            "3 canais monitorados",
            "Análise de sentimentos",
            "Dashboard básico",
            "Suporte por email"
          ]
        },
        professional: {
          name: "Profissional",
          description: "Ideal para empresas em crescimento",
          mentions: "menções/mês",
          badge: "Mais Popular",
          features: [
            "Até 300 menções/mês",
            "Canais ilimitados",
            "IA avançada de leads",
            "Relatórios personalizados",
            "Acesso à API",
            "Suporte prioritário"
          ]
        },
        enterprise: {
          name: "Empresarial",
          description: "Para grandes organizações",
          mentions: "menções/mês",
          features: [
            "Até 500 menções/mês",
            "Todos recursos Professional",
            "IA personalizada",
            "Gerente de conta dedicado",
            "SLA garantido",
            "Opções white-label"
          ]
        }
      },
      cta: "Começar Agora"
    },
    testimonials: {
      title: "O Que Nossos",
      titleHighlight: "Clientes Dizem",
      subtitle: "Veja como empresas estão transformando menções em crescimento",
      items: [
        {
          text: "O Liftlio revolucionou nossa estratégia de marketing. Conseguimos identificar e converter leads que antes passavam despercebidos.",
          author: "Ana Silva",
          role: "CMO, TechStart"
        },
        {
          text: "A análise de sentimentos em tempo real nos ajudou a prevenir várias crises e melhorar nosso atendimento.",
          author: "Carlos Mendes",
          role: "CEO, E-commerce Plus"
        },
        {
          text: "ROI incrível! Em apenas 3 meses, o Liftlio se pagou com os novos clientes que conseguimos.",
          author: "Juliana Costa",
          role: "Diretora de Vendas, SaaS Co"
        }
      ]
    },
    cta: {
      title: "Pronto para",
      titleHighlight: "Transformar",
      titleEnd: "suas Menções?",
      subtitle: "Junte-se a milhares de empresas que já estão convertendo menções em oportunidades reais",
      button: "Comece a Crescer seu Tráfego Hoje"
    },
    footer: {
      description: "Transformando menções em oportunidades de negócio através de monitoramento inteligente e análise em tempo real.",
      product: "Produto",
      company: "Empresa",
      legal: "Legal",
      links: {
        features: "Recursos",
        pricing: "Preços",
        integrations: "Integrações",
        api: "API",
        about: "Sobre",
        blog: "Blog",
        careers: "Carreiras",
        contact: "Contato",
        privacy: "Privacidade",
        terms: "Termos",
        security: "Segurança"
      },
      copyright: "© 2024 Liftlio. Todos os direitos reservados."
    }
  }
};

// Animations
const slideUp = keyframes`
  from {
    transform: translateX(-50%) translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.3;
  }
  100% {
    transform: scale(1);
    opacity: 0.5;
  }
`;

// Styled Components com suporte a tema
const LandingContainer = styled.div`
  font-family: 'Inter', sans-serif;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.primary};
  overflow-x: hidden;
  position: relative;
  transition: background 0.3s ease, color 0.3s ease;
`;

const Header = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 20px 64px;
  background: ${props => props.theme.colors.headerBg};
  backdrop-filter: blur(10px);
  border-bottom: 1px solid ${props => props.theme.colors.borderLight};
  transition: all 0.3s ease;

  @media (max-width: 768px) {
    padding: 16px 32px;
  }

  @media (max-width: 480px) {
    padding: 12px 16px;
  }
`;

const HeaderContent = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled.div`
  font-size: 28px;
  font-weight: 900;
  letter-spacing: -1px;
  background: ${props => props.theme.colors.gradient.landing};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Nav = styled.nav`
  display: flex;
  gap: 40px;
  align-items: center;

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLink = styled.a`
  color: ${props => props.theme.colors.textSecondary};
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;

  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const NavButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const LangButton = styled.button`
  background: transparent;
  color: ${props => props.theme.colors.text.primary};
  border: none;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  transition: color 0.3s ease;

  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const ThemeToggle = styled.button`
  background: transparent;
  color: ${props => props.theme.colors.text.primary};
  border: none;
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: color 0.3s ease;

  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const LoginButton = styled.button`
  background: transparent;
  color: ${props => props.theme.colors.text.primary};
  border: 1px solid ${props => props.theme.colors.borderLight};
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.theme.colors.cardBg};
    border-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.primary};
  }
`;

const floatAnimation = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
`;

const shimmerAnimation = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const HeroSection = styled.section`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px 64px 80px;
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 100px 32px 60px;
  }

  @media (max-width: 480px) {
    padding: 80px 16px 40px;
  }
`;

const HeroBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: ${props => props.theme.name === 'dark' ? 0.3 : 0.1};
  background: radial-gradient(circle at 20% 50%, ${props => props.theme.colors.primaryAlpha} 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, ${props => props.theme.colors.secondaryAlpha} 0%, transparent 50%);
`;

const HeroContent = styled.div`
  max-width: 1440px;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
  z-index: 10;
  position: relative;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: 60px;
    text-align: center;
  }
`;

const HeroText = styled.div``;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: ${props => props.theme.colors.badgeBg};
  border: 1px solid ${props => props.theme.colors.badgeBorder};
  padding: 8px 16px;
  border-radius: 100px;
  margin-bottom: 24px;
  color: ${props => props.theme.colors.primary};
  font-size: 14px;
  font-weight: 600;
  animation: ${pulseAnimation} 3s infinite;
`;

const Title = styled.h1`
  font-size: 72px;
  font-weight: 900;
  line-height: 1.1;
  margin-bottom: 24px;
  letter-spacing: -2px;

  @media (max-width: 768px) {
    font-size: 48px;
  }

  @media (max-width: 480px) {
    font-size: 36px;
  }
`;

const Gradient = styled.span`
  background: ${props => props.theme.colors.gradient.landing};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Description = styled.p`
  font-size: 20px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
  margin-bottom: 40px;

  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

const CTAButtons = styled.div`
  display: flex;
  gap: 16px;

  @media (max-width: 968px) {
    justify-content: center;
  }

  @media (max-width: 480px) {
    flex-direction: column;
    width: 100%;
  }
`;

const PrimaryButton = styled.button`
  background: ${props => props.theme.colors.gradient.landing};
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  &:hover::before {
    width: 300px;
    height: 300px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px ${props => props.theme.colors.primaryAlpha};
  }

  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
  }
`;

const SecondaryButton = styled.button`
  background: transparent;
  color: ${props => props.theme.colors.text.primary};
  border: 2px solid ${props => props.theme.colors.borderLight};
  padding: 16px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: ${props => props.theme.colors.cardBg};
    border-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.primary};
  }

  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
  }
`;

const HeroVisual = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;

  @media (max-width: 968px) {
    display: none;
  }
`;

const DashboardPreview = styled.div`
  width: 100%;
  max-width: 600px;
  background: ${props => props.theme.name === 'light' 
    ? 'rgba(255, 255, 255, 0.95)' 
    : props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 16px;
  padding: 32px;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  box-shadow: 0 20px 60px ${props => props.theme.colors.shadowLarge};

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, ${props => props.theme.colors.primaryAlpha} 0%, transparent 70%);
    animation: ${pulseAnimation} 4s ease-in-out infinite;
  }
`;

const DashboardImage = styled.img`
  width: 100%;
  height: auto;
  border-radius: 8px;
  position: relative;
  z-index: 1;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
`;

const MetricCard = styled.div`
  background: ${props => props.theme.colors.metricCardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  padding: 16px;
  border-radius: 12px;
  text-align: center;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, ${props => props.theme.colors.shimmer}, transparent);
    animation: ${shimmerAnimation} 3s infinite;
  }
`;

const MetricValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 4px;
`;

const MetricLabel = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FloatingElement = styled.div`
  position: absolute;
  background: ${props => props.theme.colors.floatingBg};
  border: 1px solid ${props => props.theme.colors.floatingBorder};
  border-radius: 12px;
  padding: 16px;
  animation: ${floatAnimation} 6s ease-in-out infinite;
`;

const VideoContainer = styled.div`
  width: 100%;
  max-width: 800px;
  margin: 40px auto;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.3);
  position: relative;
  background: #000;
  border: 2px solid ${props => props.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
  
  video {
    width: 100%;
    height: auto;
    display: block;
  }
  
  @media (max-width: 968px) {
    max-width: 600px;
  }
  
  @media (max-width: 768px) {
    width: 95%;
    max-width: 500px;
    margin: 20px auto;
  }
`;

const FloatingVideo = styled.div`
  position: absolute;
  width: 200px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px ${props => props.theme.colors.shadowMedium};
  
  video {
    width: 100%;
    height: auto;
    display: block;
  }
`;

const LiveCounter = styled.div`
  position: fixed;
  top: 100px;
  right: 20px;
  background: ${props => props.theme.colors.gradient.landing};
  color: white;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  z-index: 999;
  min-width: 200px;
  animation: ${slideUp} 0.5s ease-out;

  @media (max-width: 768px) {
    display: none;
  }
`;

const LiveCounterTitle = styled.div`
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const LiveCounterNumber = styled.div`
  font-size: 32px;
  font-weight: 900;
  margin-bottom: 4px;
`;

const LiveCounterLabel = styled.div`
  font-size: 12px;
  opacity: 0.8;
`;

const TrustSection = styled.section`
  padding: 60px 64px;
  background: ${props => props.theme.colors.trustBg};
  border-top: 1px solid ${props => props.theme.colors.borderLight};
  border-bottom: 1px solid ${props => props.theme.colors.borderLight};

  @media (max-width: 768px) {
    padding: 40px 32px;
  }
`;

const TrustContainer = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
  gap: 40px;

  @media (max-width: 768px) {
    gap: 20px;
  }
`;

const TrustItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const TrustIcon = styled.div`
  font-size: 24px;
  color: ${props => props.theme.colors.primary};
`;

const TrustText = styled.div``;

const TrustValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
`;

const TrustLabel = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

const PainPointsSection = styled.section`
  padding: 100px 64px;
  background: linear-gradient(135deg, 
    ${props => props.theme.name === 'dark' 
      ? 'rgba(255, 0, 0, 0.05)' 
      : 'rgba(255, 0, 0, 0.02)'} 0%, 
    ${props => props.theme.colors.background} 100%
  );
  position: relative;

  @media (max-width: 768px) {
    padding: 60px 32px;
  }
`;

const PainPointsGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  margin-top: 60px;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const PainPointCard = styled.div`
  text-align: center;
  padding: 40px;
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 16px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 20px 40px ${props => props.theme.colors.shadowLarge};
    border-color: rgba(255, 0, 0, 0.3);
  }
`;

const PainPointIcon = styled.div<{ icon: string }>`
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: ${props => props.icon === 'fire' 
    ? 'linear-gradient(135deg, #FF6B6B 0%, #FF0000 100%)'
    : props.icon === 'warning'
    ? 'linear-gradient(135deg, #FFD93D 0%, #FF9800 100%)'
    : 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)'
  };
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  color: white;
`;

const PainPointTitle = styled.h3`
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 16px;
  color: ${props => props.theme.colors.text.primary};
`;

const PainPointDescription = styled.p`
  font-size: 16px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
`;

const CalculatorSection = styled.section`
  padding: 100px 64px;
  background: ${props => props.theme.colors.background};
  position: relative;

  @media (max-width: 768px) {
    padding: 60px 32px;
  }
`;

const CalculatorContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 24px;
  padding: 48px;
  box-shadow: 0 20px 60px ${props => props.theme.colors.shadowLarge};

  @media (max-width: 768px) {
    padding: 32px 24px;
  }
`;

const CalculatorInput = styled.div`
  margin-bottom: 40px;
`;

const CalculatorLabel = styled.label`
  display: block;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: ${props => props.theme.colors.text.primary};
`;

const CalculatorSlider = styled.input`
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: ${props => props.theme.colors.borderLight};
  outline: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${props => props.theme.colors.gradient.landing};
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${props => props.theme.colors.gradient.landing};
    cursor: pointer;
  }
`;

const CalculatorValue = styled.div`
  text-align: center;
  font-size: 48px;
  font-weight: 900;
  background: ${props => props.theme.colors.gradient.landing};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 20px 0;
`;

const CalculatorResults = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-top: 40px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ResultCard = styled.div<{ highlight?: boolean }>`
  padding: 24px;
  background: ${props => props.highlight 
    ? props.theme.colors.gradient.landing 
    : props.theme.colors.metricCardBg};
  border: 1px solid ${props => props.highlight 
    ? 'transparent' 
    : props.theme.colors.borderLight};
  border-radius: 12px;
  text-align: center;
  color: ${props => props.highlight ? 'white' : 'inherit'};
`;

const ResultLabel = styled.div`
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: 8px;
`;

const ResultValue = styled.div`
  font-size: 32px;
  font-weight: 800;
`;

const LiveDemoSection = styled.section`
  padding: 100px 64px;
  background: ${props => props.theme.colors.featuresBg};
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 60px 32px;
  }
`;

const LiveDemoContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const ActivityFeed = styled.div`
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 16px;
  padding: 32px;
  max-height: 400px;
  overflow-y: auto;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  margin-bottom: 16px;
  background: ${props => props.theme.colors.metricCardBg};
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateX(10px);
    box-shadow: 0 5px 20px ${props => props.theme.colors.shadowMedium};
  }
`;

const ActivityIcon = styled.div`
  width: 48px;
  height: 48px;
  background: ${props => props.theme.colors.gradient.landing};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
`;

const ActivityContent = styled.div`
  flex: 1;
`;

const ActivityTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.colors.text.primary};
`;

const ActivityTime = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

const UrgencyBanner = styled.div`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: ${props => props.theme.colors.gradient.landing};
  color: white;
  padding: 16px 32px;
  border-radius: 100px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 16px;
  font-weight: 600;
  animation: ${slideUp} 0.5s ease-out;

  @media (max-width: 640px) {
    width: calc(100% - 40px);
    padding: 12px 20px;
    font-size: 14px;
  }
`;

const FeaturesSection = styled.section`
  padding: 100px 64px;
  background: ${props => props.theme.colors.featuresBg};
  position: relative;

  @media (max-width: 768px) {
    padding: 60px 32px;
  }

  @media (max-width: 480px) {
    padding: 40px 16px;
  }
`;

const FeaturesContainer = styled.div`
  max-width: 1440px;
  margin: 0 auto;
`;

const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: 60px;
`;

const SectionTitle = styled.h2`
  font-size: 48px;
  font-weight: 900;
  margin-bottom: 16px;
  letter-spacing: -1px;

  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const SectionDescription = styled.p`
  font-size: 18px;
  color: ${props => props.theme.colors.textSecondary};
  max-width: 600px;
  margin: 0 auto;
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 32px;
  margin-bottom: 60px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureCard = styled.div`
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 16px;
  padding: 32px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-5px);
    border-color: ${props => props.theme.colors.primary};
    background: ${props => props.theme.colors.cardHoverBg};
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${props => props.theme.colors.gradient.landing};
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover::before {
    opacity: 1;
  }
`;

const FeatureIcon = styled.div`
  width: 60px;
  height: 60px;
  background: ${props => props.theme.colors.gradient.landing};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 20px;
  color: white;
`;

const FeatureTitle = styled.h3`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
  color: ${props => props.theme.colors.text.primary};
`;

const FeatureDescription = styled.p`
  font-size: 16px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
`;

const VisualDemoSection = styled.section`
  padding: 100px 64px;
  background: ${props => props.theme.colors.background};
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 60px 32px;
  }

  @media (max-width: 480px) {
    padding: 40px 16px;
  }
`;

const DemoGrid = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 80px;
`;

const DemoCard = styled.div<{ reverse?: boolean }>`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  
  ${props => props.reverse && `
    direction: rtl;
    & > * {
      direction: ltr;
    }
  `}

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    direction: ltr;
    
    & > * {
      direction: ltr;
    }
  }
`;

const DemoImage = styled.img`
  width: 100%;
  border-radius: 16px;
  box-shadow: 0 20px 60px ${props => props.theme.colors.shadowLarge};
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.02);
  }
`;

const DemoContent = styled.div`
  max-width: 500px;
`;

const DemoTitle = styled.h3`
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 16px;
  color: ${props => props.theme.colors.text.primary};

  @media (max-width: 768px) {
    font-size: 28px;
  }
`;

const DemoDescription = styled.p`
  font-size: 18px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
`;

const ProcessSection = styled.section`
  padding: 100px 64px;
  background: linear-gradient(180deg, 
    ${props => props.theme.colors.background} 0%, 
    ${props => props.theme.colors.statsBg} 100%
  );
  position: relative;

  @media (max-width: 768px) {
    padding: 60px 32px;
  }
`;

const ProcessGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  position: relative;

  @media (max-width: 968px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ProcessStep = styled.div`
  text-align: center;
  position: relative;
`;

const ProcessNumber = styled.div`
  width: 60px;
  height: 60px;
  background: ${props => props.theme.colors.gradient.landing};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 800;
  color: white;
  margin: 0 auto 20px;
  position: relative;
  z-index: 2;
`;

const ProcessTitle = styled.h4`
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
  color: ${props => props.theme.colors.text.primary};
`;

const ProcessDescription = styled.p`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
`;

const ProcessConnector = styled.div`
  position: absolute;
  top: 30px;
  left: 60px;
  right: -40px;
  height: 2px;
  background: ${props => props.theme.colors.borderLight};
  z-index: 1;

  @media (max-width: 968px) {
    display: none;
  }
`;

const ComparisonSection = styled.section`
  padding: 100px 64px;
  background: ${props => props.theme.colors.background};

  @media (max-width: 768px) {
    padding: 60px 32px;
  }
`;

const ComparisonImage = styled.img`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: block;
  border-radius: 16px;
  box-shadow: 0 20px 60px ${props => props.theme.colors.shadowLarge};
`;

// Laptop mockup components
const LaptopContainer = styled.div`
  position: relative;
  max-width: 100%;
  margin: 0 auto;
`;

const LaptopScreen = styled.div`
  position: relative;
  background: #1a1a1a;
  border-radius: 12px 12px 0 0;
  padding: 8px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 20px 40px rgba(0, 0, 0, 0.2);
  
  &::before {
    content: '';
    position: absolute;
    top: 4px;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 6px;
    background: #333;
    border-radius: 50%;
  }
`;

const LaptopScreenContent = styled.div`
  position: relative;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
  
  img {
    width: 100%;
    height: auto;
    display: block;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, 
      rgba(255, 255, 255, 0.1) 0%, 
      transparent 50%, 
      rgba(255, 255, 255, 0.05) 100%
    );
    pointer-events: none;
  }
`;

const LaptopBase = styled.div`
  background: linear-gradient(to bottom, #c5c5c5 0%, #a8a8a8 100%);
  height: 20px;
  border-radius: 0 0 20px 20px;
  position: relative;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 4px;
    background: #888;
    border-radius: 0 0 10px 10px;
  }
`;

const LaptopWrapper = styled.div<{ rotate?: number; scale?: number }>`
  transform: ${props => `perspective(1000px) rotateY(${props.rotate || 0}deg) scale(${props.scale || 1})`};
  transition: transform 0.3s ease;
  
  &:hover {
    transform: ${props => `perspective(1000px) rotateY(${props.rotate || 0}deg) scale(${(props.scale || 1) * 1.05})`};
  }
`;


const ExponentialSection = styled.section`
  padding: 100px 64px;
  background: linear-gradient(135deg, 
    ${props => props.theme.colors.primaryAlpha} 0%, 
    ${props => props.theme.colors.secondaryAlpha} 100%
  );
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 60px 32px;
  }
`;

const ExponentialContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const ExponentialGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32px;
  margin-bottom: 60px;

  @media (max-width: 968px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const ExponentialItem = styled.div`
  text-align: center;
  padding: 32px;
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 16px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 20px 40px ${props => props.theme.colors.shadowLarge};
  }
`;

const ExponentialMonth = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.primary};
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 12px;
`;

const ExponentialValue = styled.div`
  font-size: 48px;
  font-weight: 900;
  background: ${props => props.theme.colors.gradient.landing};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 12px;
`;

const ExponentialDescription = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.6;
`;

const BenefitsList = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const BenefitItem = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 12px;
`;

const BenefitIcon = styled.div`
  width: 40px;
  height: 40px;
  background: ${props => props.theme.colors.gradient.landing};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
`;

const BenefitText = styled.div`
  font-size: 16px;
  color: ${props => props.theme.colors.text.primary};
  line-height: 1.6;
`;

const StatsSection = styled.section`
  padding: 80px 64px;
  background: ${props => props.theme.colors.statsBg};

  @media (max-width: 768px) {
    padding: 60px 32px;
  }

  @media (max-width: 480px) {
    padding: 40px 16px;
  }
`;

const StatsGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;
  text-align: center;

  @media (max-width: 968px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const StatItem = styled.div``;

const StatNumber = styled.div`
  font-size: 48px;
  font-weight: 900;
  background: ${props => props.theme.colors.gradient.landing};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 18px;
  color: ${props => props.theme.colors.textSecondary};
`;

const PricingSection = styled.section`
  padding: 100px 64px;
  background: ${props => props.theme.colors.pricingBg};

  @media (max-width: 768px) {
    padding: 60px 32px;
  }

  @media (max-width: 480px) {
    padding: 40px 16px;
  }
`;

const PricingGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  margin-top: 60px;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    max-width: 400px;
  }
`;

const PricingCard = styled.div<{ featured?: boolean }>`
  background: ${props => props.featured ? props.theme.colors.pricingFeaturedBg : props.theme.colors.cardBg};
  border: 1px solid ${props => props.featured ? props.theme.colors.primary : props.theme.colors.borderLight};
  border-radius: 16px;
  padding: 40px 32px;
  position: relative;
  transition: all 0.3s ease;

  ${props => props.featured && css`
    transform: scale(1.05);
    
    @media (max-width: 968px) {
      transform: scale(1);
    }
  `}

  &:hover {
    transform: ${props => props.featured ? 'scale(1.08)' : 'translateY(-5px)'};
    
    @media (max-width: 968px) {
      transform: translateY(-5px);
    }
  }
`;

const PricingBadge = styled.div`
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: ${props => props.theme.colors.gradient.landing};
  color: white;
  padding: 4px 16px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
`;

const PricingPlan = styled.div`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 16px;
  color: ${props => props.theme.colors.text.primary};
`;

const PricingPrice = styled.div`
  font-size: 48px;
  font-weight: 900;
  margin-bottom: 8px;
  color: ${props => props.theme.colors.text.primary};
  
  span {
    font-size: 20px;
    font-weight: 400;
    color: ${props => props.theme.colors.textSecondary};
  }
`;

const PricingDescription = styled.p`
  font-size: 16px;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 32px;
`;

const PricingFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin-bottom: 32px;
`;

const PricingFeature = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  color: ${props => props.theme.colors.text.primary};
  
  svg {
    color: ${props => props.theme.colors.primary};
    flex-shrink: 0;
  }
`;

const TestimonialsSection = styled.section`
  padding: 100px 64px;
  background: ${props => props.theme.colors.testimonialsBg};

  @media (max-width: 768px) {
    padding: 60px 32px;
  }

  @media (max-width: 480px) {
    padding: 40px 16px;
  }
`;

const TestimonialsGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 32px;
  margin-top: 60px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const TestimonialCard = styled.div`
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 16px;
  padding: 32px;
  position: relative;
`;

const QuoteIcon = styled.div`
  font-size: 48px;
  color: ${props => props.theme.colors.primaryAlpha};
  margin-bottom: 16px;
`;

const TestimonialText = styled.p`
  font-size: 16px;
  line-height: 1.6;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 24px;
`;

const TestimonialAuthor = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const AuthorAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${props => props.theme.colors.gradient.landing};
`;

const AuthorInfo = styled.div``;

const AuthorName = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.colors.text.primary};
`;

const AuthorRole = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

const CTASection = styled.section`
  padding: 120px 64px;
  text-align: center;
  background: ${props => props.theme.colors.ctaBg};
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 80px 32px;
  }

  @media (max-width: 480px) {
    padding: 60px 16px;
  }

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, ${props => props.theme.colors.primaryAlpha} 0%, transparent 70%);
    animation: ${pulseAnimation} 6s ease-in-out infinite;
  }
`;

const CTAContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const CTATitle = styled.h2`
  font-size: 48px;
  font-weight: 900;
  margin-bottom: 24px;
  letter-spacing: -1px;

  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const CTADescription = styled.p`
  font-size: 20px;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 40px;
`;

const Footer = styled.footer`
  padding: 60px 64px 40px;
  background: ${props => props.theme.colors.footerBg};
  border-top: 1px solid ${props => props.theme.colors.borderLight};

  @media (max-width: 768px) {
    padding: 40px 32px;
  }

  @media (max-width: 480px) {
    padding: 32px 16px;
  }
`;

const FooterContent = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 60px;

  @media (max-width: 968px) {
    grid-template-columns: 1fr 1fr;
    gap: 40px;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const FooterColumn = styled.div``;

const FooterTitle = styled.h4`
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 20px;
  color: ${props => props.theme.name === 'light' ? '#ffffff' : props.theme.colors.text.primary};
`;

const FooterDescription = styled.p`
  font-size: 14px;
  color: ${props => props.theme.name === 'light' ? 'rgba(255, 255, 255, 0.8)' : props.theme.colors.textSecondary};
  line-height: 1.6;
  margin-bottom: 20px;
`;

const FooterLinks = styled.ul`
  list-style: none;
  padding: 0;
`;

const FooterLink = styled.li`
  margin-bottom: 12px;
  
  a {
    color: ${props => props.theme.name === 'light' ? 'rgba(255, 255, 255, 0.7)' : props.theme.colors.textSecondary};
    text-decoration: none;
    font-size: 14px;
    transition: color 0.3s ease;
    
    &:hover {
      color: ${props => props.theme.name === 'light' ? '#ffffff' : props.theme.colors.primary};
    }
  }
`;

const FooterBottom = styled.div`
  margin-top: 60px;
  padding-top: 32px;
  border-top: 1px solid ${props => props.theme.name === 'light' ? 'rgba(255, 255, 255, 0.2)' : props.theme.colors.borderLight};
  text-align: center;
  font-size: 14px;
  color: ${props => props.theme.name === 'light' ? 'rgba(255, 255, 255, 0.6)' : props.theme.colors.textSecondary};
`;

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  // Get initial language from cookie or browser preference
  const getInitialLanguage = (): 'en' | 'pt' => {
    // First check cookie
    const savedLang = Cookies.get('language');
    if (savedLang === 'pt' || savedLang === 'en') {
      return savedLang;
    }
    
    // Then check browser language
    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith('pt') ? 'pt' : 'en';
  };

  const [lang, setLang] = useState<'en' | 'pt'>(getInitialLanguage());
  const t = translations[lang];
  
  // Calculator state
  const [adSpend, setAdSpend] = useState(1000);
  const [showCalculatorResults, setShowCalculatorResults] = useState(false);
  
  // Urgency state
  const [showUrgencyBanner, setShowUrgencyBanner] = useState(false); // Disabled - removing floating elements
  const spotsLeft = 5;
  const daysUntilPriceIncrease = 3;
  
  // Live counter state
  const [liveVisitorCount, setLiveVisitorCount] = useState(12847);
  const [recentActivity, setRecentActivity] = useState([
    { channel: "Tech Reviews Brasil", time: "2 min ago", visitors: 47 },
    { channel: "Marketing Digital Pro", time: "5 min ago", visitors: 82 },
    { channel: "Empreendedor Online", time: "8 min ago", visitors: 134 }
  ]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show urgency banner after 10 seconds - DISABLED
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setShowUrgencyBanner(true);
  //   }, 10000);
  //   
  //   return () => clearTimeout(timer);
  // }, []);
  
  // Animate live visitor counter
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveVisitorCount(prev => prev + Math.floor(Math.random() * 5) + 1);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleGetStarted = () => {
    navigate('/login');
  };

  const handleDemo = () => {
    // Implementar demonstração
    window.open('https://www.youtube.com/watch?v=demo', '_blank');
  };

  const toggleLanguage = () => {
    const newLang = lang === 'en' ? 'pt' : 'en';
    setLang(newLang);
    // Save preference in cookie (expires in 365 days)
    Cookies.set('language', newLang, { expires: 365 });
  };

  // Calculator functions
  const calculateROI = () => {
    setShowCalculatorResults(true);
    // Scroll to results
    setTimeout(() => {
      document.getElementById('calculator-results')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Calculate cost per visitor
  const avgCPC = 5; // Average $5 per click in ads
  const monthlyVisitorsFromAds = Math.floor(adSpend / avgCPC);
  const annualVisitorsFromAds = monthlyVisitorsFromAds * 12;
  
  const liftlioPlan = adSpend > 5000 ? 200 : adSpend > 2000 ? 100 : 30; // Monthly cost
  const liftlioMentions = adSpend > 5000 ? 500 : adSpend > 2000 ? 300 : 80; // Mentions per month
  const visitorsPerMention = 10; // Average visitors per comment over time
  const monthlyVisitorsFromLiftlio = liftlioMentions * visitorsPerMention;
  
  const costPerVisitorAds = avgCPC;
  const costPerVisitorLiftlio = liftlioPlan / monthlyVisitorsFromLiftlio;
  const savingsPerVisitor = costPerVisitorAds - costPerVisitorLiftlio;
  const lifetimeValuePerVisitor = 50; // Each visitor worth $50 over time
  const roi = Math.round((lifetimeValuePerVisitor / costPerVisitorLiftlio) * 100);

  return (
    <LandingContainer>
      <Header style={{ 
        background: scrolled ? theme.colors.headerBgSolid : theme.colors.headerBg,
        backdropFilter: scrolled ? 'blur(20px)' : 'blur(10px)'
      }}>
        <HeaderContent>
          <Logo>
            {renderIcon(BiPulse)}
            LIFTLIO
          </Logo>
          <Nav>
            <NavLink href="#features">{t.nav.features}</NavLink>
            <NavLink href="#pricing">{t.nav.pricing}</NavLink>
            <NavLink href="#testimonials">{t.nav.testimonials}</NavLink>
            <NavButtons>
              <LangButton onClick={toggleLanguage}>
                {renderIcon(FaGlobe)} {lang.toUpperCase()}
              </LangButton>
              <ThemeToggle onClick={toggleTheme}>
                {renderIcon(theme.name === 'dark' ? FaSun : FaMoon)}
              </ThemeToggle>
              <LoginButton onClick={handleLogin}>{t.nav.login}</LoginButton>
            </NavButtons>
          </Nav>
        </HeaderContent>
      </Header>

      {/* Live Counter */}
      {/* LiveCounter removido 
      <LiveCounter>
        <LiveCounterTitle>
          <span style={{ color: '#00ff00' }}>●</span>
          {lang === 'pt' ? 'AO VIVO' : 'LIVE'}
        </LiveCounterTitle>
        <LiveCounterNumber>
          {liveVisitorCount.toLocaleString()}
        </LiveCounterNumber>
        <LiveCounterLabel>
          {lang === 'pt' 
            ? 'visitantes qualificados gerados hoje' 
            : 'qualified visitors generated today'
          }
        </LiveCounterLabel>
      </LiveCounter> */}

      <HeroSection>
        <HeroBackground />
        <HeroContent>
          <HeroText>
            <Badge>
              {renderIcon(HiSparkles)}
              <span>{t.hero.badge}</span>
            </Badge>
            <Title>
              {t.hero.title}
              <br />
              <Gradient>{t.hero.titleHighlight}</Gradient>
            </Title>
            <Description>
              {t.hero.subtitle}
            </Description>
            <CTAButtons>
              <PrimaryButton onClick={handleGetStarted}>
                {renderIcon(FaRocket)}
                {t.hero.cta.primary}
              </PrimaryButton>
              <SecondaryButton onClick={handleDemo}>
                {renderIcon(FaPlay)}
                {t.hero.cta.secondary}
              </SecondaryButton>
            </CTAButtons>
          </HeroText>

          <HeroVisual>
            <DashboardPreview>
              <h3 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '700' }}>
                Dashboard {lang === 'pt' ? 'em Tempo Real' : 'Real-Time'}
              </h3>
              
              {/* Imagem do Dashboard */}
              <DashboardImage 
                src={theme.name === 'dark' 
                  ? "/imagens/dashboard-hero-dark.png" 
                  : "/imagens/dashboard-hero-light.png"
                }
                alt="Liftlio Dashboard"
                onError={(e) => {
                  // Fallback se a imagem não existir
                  e.currentTarget.style.display = 'none';
                }}
              />
              
              <MetricsGrid>
                <MetricCard>
                  <MetricValue>2.8K</MetricValue>
                  <MetricLabel>{t.hero.metrics.mentions}</MetricLabel>
                </MetricCard>
                <MetricCard>
                  <MetricValue>89%</MetricValue>
                  <MetricLabel>{t.hero.metrics.positive}</MetricLabel>
                </MetricCard>
                <MetricCard>
                  <MetricValue>147</MetricValue>
                  <MetricLabel>{t.hero.metrics.leads}</MetricLabel>
                </MetricCard>
              </MetricsGrid>
            </DashboardPreview>
            
            {/* Elementos flutuantes */}
            <FloatingElement style={{ bottom: '40px', left: '-30px', animationDelay: '2s' }}>
              <span style={{ fontSize: '24px', color: theme.colors.secondary }}>{renderIcon(FaChartLine)}</span>
            </FloatingElement>
          </HeroVisual>
        </HeroContent>
      </HeroSection>

      {/* Trust Indicators */}
      <TrustSection>
        <TrustContainer>
          <TrustItem>
            <TrustIcon>{renderIcon(FaShieldAlt)}</TrustIcon>
            <TrustText>
              <TrustValue>100%</TrustValue>
              <TrustLabel>{lang === 'pt' ? 'Seguro' : 'Secure'}</TrustLabel>
            </TrustText>
          </TrustItem>
          <TrustItem>
            <TrustIcon>{renderIcon(FaClock)}</TrustIcon>
            <TrustText>
              <TrustValue>24/7</TrustValue>
              <TrustLabel>{lang === 'pt' ? 'Monitoramento' : 'Monitoring'}</TrustLabel>
            </TrustText>
          </TrustItem>
          <TrustItem>
            <TrustIcon>{renderIcon(FaUsers)}</TrustIcon>
            <TrustText>
              <TrustValue>2,000+</TrustValue>
              <TrustLabel>{lang === 'pt' ? 'Clientes Ativos' : 'Active Clients'}</TrustLabel>
            </TrustText>
          </TrustItem>
          <TrustItem>
            <TrustIcon>{renderIcon(FaTrophy)}</TrustIcon>
            <TrustText>
              <TrustValue>95%</TrustValue>
              <TrustLabel>{lang === 'pt' ? 'Satisfação' : 'Satisfaction'}</TrustLabel>
            </TrustText>
          </TrustItem>
        </TrustContainer>
      </TrustSection>

      {/* Video Section */}
      <section style={{
        padding: '100px 64px',
        background: theme.name === 'dark' ? '#0a0a0a' : '#fafafa',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <SectionHeader>
          <SectionTitle>
            {lang === 'pt' ? 'Veja o Liftlio em' : 'See Liftlio in'} 
            <Gradient> {lang === 'pt' ? 'Ação' : 'Action'}</Gradient>
          </SectionTitle>
          <SectionDescription>
            {lang === 'pt' 
              ? 'Descubra como transformamos comentários em oportunidades de negócio reais'
              : 'Discover how we transform comments into real business opportunities'
            }
          </SectionDescription>
        </SectionHeader>
        
        <VideoContainer>
          <video 
            controls
            autoPlay
            loop 
            muted 
            playsInline
            poster="/imagens/dashboard-hero-dark.png"
            style={{ borderRadius: '20px' }}
          >
            <source src="/Videos/video-liftlio-comentarios-clientes.mp4" type="video/mp4" />
            {lang === 'pt' ? 'Seu navegador não suporta vídeos HTML5.' : 'Your browser does not support HTML5 video.'}
          </video>
        </VideoContainer>
      </section>

      {/* Pain Points Section */}
      <PainPointsSection>
        <SectionHeader>
          <SectionTitle>
            {t.painPoints.title} <Gradient>{t.painPoints.titleHighlight}</Gradient>
          </SectionTitle>
          <SectionDescription>
            {t.painPoints.subtitle}
          </SectionDescription>
        </SectionHeader>

        <PainPointsGrid>
          {t.painPoints.items.map((item, index) => (
            <PainPointCard key={index}>
              <PainPointIcon icon={item.icon}>
                {renderIcon(
                  item.icon === 'fire' ? FaFire :
                  item.icon === 'warning' ? FaExclamationTriangle :
                  FaInfinity
                )}
              </PainPointIcon>
              <PainPointTitle>{item.title}</PainPointTitle>
              <PainPointDescription>{item.description}</PainPointDescription>
            </PainPointCard>
          ))}
        </PainPointsGrid>
      </PainPointsSection>

      <FeaturesSection id="features">
        <FeaturesContainer>
          <SectionHeader>
            <SectionTitle>
              {t.features.title} <Gradient>{t.features.titleHighlight}</Gradient>
            </SectionTitle>
            <SectionDescription>
              {t.features.subtitle}
            </SectionDescription>
          </SectionHeader>
          
          <FeaturesGrid>
            <FeatureCard>
              <FeatureIcon>
                {renderIcon(FaBell)}
              </FeatureIcon>
              <FeatureTitle>{t.features.items[0].title}</FeatureTitle>
              <FeatureDescription>
                {t.features.items[0].description}
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureIcon>
                {renderIcon(FaChartLine)}
              </FeatureIcon>
              <FeatureTitle>{t.features.items[1].title}</FeatureTitle>
              <FeatureDescription>
                {t.features.items[1].description}
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureIcon>
                {renderIcon(FaRocket)}
              </FeatureIcon>
              <FeatureTitle>{t.features.items[2].title}</FeatureTitle>
              <FeatureDescription>
                {t.features.items[2].description}
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureIcon>
                {renderIcon(FaYoutube)}
              </FeatureIcon>
              <FeatureTitle>{t.features.items[3].title}</FeatureTitle>
              <FeatureDescription>
                {t.features.items[3].description}
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureIcon>
                {renderIcon(MdAutoGraph)}
              </FeatureIcon>
              <FeatureTitle>{t.features.items[4].title}</FeatureTitle>
              <FeatureDescription>
                {t.features.items[4].description}
              </FeatureDescription>
            </FeatureCard>

            <FeatureCard>
              <FeatureIcon>
                {renderIcon(HiLightningBolt)}
              </FeatureIcon>
              <FeatureTitle>{t.features.items[5].title}</FeatureTitle>
              <FeatureDescription>
                {t.features.items[5].description}
              </FeatureDescription>
            </FeatureCard>
          </FeaturesGrid>
        </FeaturesContainer>
      </FeaturesSection>

      {/* Calculator Section */}
      <CalculatorSection>
        <SectionHeader>
          <SectionTitle>
            {t.calculator.title} <Gradient>{t.calculator.titleHighlight}</Gradient>
          </SectionTitle>
          <SectionDescription>
            {t.calculator.subtitle}
          </SectionDescription>
        </SectionHeader>

        <CalculatorContainer>
          <CalculatorInput>
            <CalculatorLabel>
              {t.calculator.adSpendLabel}: ${adSpend.toLocaleString()}
            </CalculatorLabel>
            <CalculatorSlider
              type="range"
              min="100"
              max="10000"
              step="100"
              value={adSpend}
              onChange={(e) => setAdSpend(Number(e.target.value))}
            />
          </CalculatorInput>

          <CalculatorValue>
            ${adSpend.toLocaleString()}/month
          </CalculatorValue>

          <PrimaryButton onClick={calculateROI} style={{ margin: '0 auto', display: 'block' }}>
            {renderIcon(AiOutlineCalculator)}
            {t.calculator.calculateButton}
          </PrimaryButton>

          {showCalculatorResults && (
            <CalculatorResults id="calculator-results">
              <ResultCard>
                <ResultLabel>{t.calculator.results.currentCost}</ResultLabel>
                <ResultValue>${costPerVisitorAds.toFixed(2)}</ResultValue>
              </ResultCard>
              <ResultCard>
                <ResultLabel>{t.calculator.results.liftlioCost}</ResultLabel>
                <ResultValue>${costPerVisitorLiftlio.toFixed(2)}</ResultValue>
              </ResultCard>
              <ResultCard highlight>
                <ResultLabel>{t.calculator.results.savings}</ResultLabel>
                <ResultValue>${savingsPerVisitor.toFixed(2)}</ResultValue>
              </ResultCard>
              <ResultCard highlight>
                <ResultLabel>{t.calculator.results.roi}</ResultLabel>
                <ResultValue>{roi.toLocaleString()}%</ResultValue>
              </ResultCard>
            </CalculatorResults>
          )}
        </CalculatorContainer>
      </CalculatorSection>

      {/* Visual Demo Section */}
      <VisualDemoSection>
        <SectionHeader>
          <SectionTitle>
            {lang === 'pt' ? 'Veja o' : 'See'} <Gradient>Liftlio</Gradient> {lang === 'pt' ? 'em Ação' : 'in Action'}
          </SectionTitle>
          <SectionDescription>
            {lang === 'pt' 
              ? 'Transforme menções em oportunidades com nossa plataforma inteligente'
              : 'Transform mentions into opportunities with our intelligent platform'
            }
          </SectionDescription>
        </SectionHeader>

        <DemoGrid>
          <DemoCard>
            <DemoImage 
              src={theme.name === 'dark' 
                ? "/imagens/DASHBOARD HERO - VERSÃO ESCURA.png" 
                : "/imagens/DASHBOARD HERO - VERSÃO clara.png"
              }
              alt="Liftlio Dashboard"
            />
            <DemoContent>
              <DemoTitle>
                {lang === 'pt' ? 'Dashboard em Tempo Real' : 'Real-Time Dashboard'}
              </DemoTitle>
              <DemoDescription>
                {lang === 'pt' 
                  ? 'Monitore menções, sentimentos e leads em um painel intuitivo e poderoso.'
                  : 'Monitor mentions, sentiment, and leads in an intuitive and powerful dashboard.'
                }
              </DemoDescription>
            </DemoContent>
          </DemoCard>

          <DemoCard reverse>
            <DemoImage 
              src="/imagens/transformacao-empresarial.png"
              alt="Business Transformation"
            />
            <DemoContent>
              <DemoTitle>
                {lang === 'pt' ? 'Transformação Comprovada' : 'Proven Transformation'}
              </DemoTitle>
              <DemoDescription>
                {lang === 'pt' 
                  ? 'De zero leads para 147 leads qualificados em apenas 30 dias. Resultados reais, crescimento real.'
                  : 'From zero leads to 147 qualified leads in just 30 days. Real results, real growth.'
                }
              </DemoDescription>
            </DemoContent>
          </DemoCard>

          <DemoCard>
            <DemoImage 
              src="/imagens/CEO CELEBRATION MOMENT.png"
              alt="Success Story"
            />
            <DemoContent>
              <DemoTitle>
                {lang === 'pt' ? 'Histórias de Sucesso' : 'Success Stories'}
              </DemoTitle>
              <DemoDescription>
                {lang === 'pt' 
                  ? 'CEOs e líderes celebram resultados extraordinários com o Liftlio. Junte-se a eles!'
                  : 'CEOs and leaders celebrate extraordinary results with Liftlio. Join them!'
                }
              </DemoDescription>
            </DemoContent>
          </DemoCard>
        </DemoGrid>
      </VisualDemoSection>

      {/* NEW Real Results Section - EXTREMELY PERSUASIVE */}
      <section style={{
        padding: '100px 64px',
        background: theme.name === 'dark' 
          ? 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)' 
          : 'linear-gradient(135deg, #ffffff 0%, #f8f8f8 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <SectionHeader>
          <SectionTitle>
            {lang === 'en' ? 'Real Results. Real Growth.' : 'Resultados Reais. Crescimento Real.'}
          </SectionTitle>
          <SectionDescription style={{ fontSize: '20px', fontWeight: '600', marginBottom: '40px' }}>
            {lang === 'en' 
              ? '🚀 See how companies are multiplying their organic traffic in just 30 days'
              : '🚀 Veja como empresas estão multiplicando seu tráfego orgânico em apenas 30 dias'
            }
          </SectionDescription>
        </SectionHeader>

        {/* Live Metrics Banner */}
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto 60px', 
          padding: '32px',
          background: theme.colors.gradient.landing,
          borderRadius: '24px',
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '40px' }}>
            <div>
              <div style={{ fontSize: '48px', fontWeight: '900' }}>1,118,903</div>
              <div style={{ fontSize: '18px', opacity: 0.9 }}>
                {lang === 'en' ? 'Views Monitored' : 'Visualizações Monitoradas'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '48px', fontWeight: '900' }}>90,573</div>
              <div style={{ fontSize: '18px', opacity: 0.9 }}>
                {lang === 'en' ? 'Engagements Generated' : 'Engajamentos Gerados'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '48px', fontWeight: '900' }}>8.2%</div>
              <div style={{ fontSize: '18px', opacity: 0.9 }}>
                {lang === 'en' ? 'Conversion Rate' : 'Taxa de Conversão'}
              </div>
            </div>
          </div>
        </div>

        <DemoGrid>
          {/* LIVE DASHBOARD PREVIEW */}
          <DemoCard style={{ gridColumn: 'span 2' }}>
            <LaptopWrapper rotate={-5} scale={0.95}>
              <LaptopContainer>
                <LaptopScreen>
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    background: theme.colors.gradient.landing,
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '700',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: 'white',
                      borderRadius: '50%',
                      animation: 'pulse 2s infinite'
                    }}></div>
                    LIVE DASHBOARD
                  </div>
                  <LaptopScreenContent>
                    <img 
                      src="/imagens/Captura de Tela 2025-05-27 às 15.58.00.png"
                      alt="Liftlio Live Dashboard"
                    />
                  </LaptopScreenContent>
                </LaptopScreen>
                <LaptopBase />
              </LaptopContainer>
            </LaptopWrapper>
            <DemoContent style={{ padding: '40px' }}>
              <DemoTitle style={{ fontSize: '32px', marginBottom: '20px' }}>
                {lang === 'en' 
                  ? '🎯 18 Channels. 30 Videos. 87 Qualified Mentions.'
                  : '🎯 18 Canais. 30 Vídeos. 87 Menções Qualificadas.'
                }
              </DemoTitle>
              <DemoDescription style={{ fontSize: '18px', lineHeight: '1.8' }}>
                {lang === 'en' 
                  ? 'This is a REAL dashboard from a client who started just 30 days ago. Each mention is a qualified lead who showed genuine interest. Imagine these numbers growing exponentially month after month.'
                  : 'Este é um dashboard REAL de um cliente que começou há apenas 30 dias. Cada menção é um lead qualificado que demonstrou interesse genuíno. Imagine esses números crescendo exponencialmente mês após mês.'
                }
              </DemoDescription>
              <div style={{ marginTop: '30px' }}>
                <PrimaryButton onClick={handleGetStarted} style={{ fontSize: '20px', padding: '20px 40px' }}>
                  {renderIcon(FaRocket)}
                  {lang === 'en' ? 'I Want These Results Now' : 'Quero Esses Resultados Agora'}
                </PrimaryButton>
              </div>
            </DemoContent>
          </DemoCard>

          {/* AI DETECTION SHOWCASE */}
          <DemoCard>
            <LaptopWrapper rotate={10} scale={0.9}>
              <LaptopContainer>
                <LaptopScreen>
                  <LaptopScreenContent>
                    <img 
                      src="/imagens/Captura de Tela 2025-05-27 às 15.57.31.png"
                      alt="AI-Powered Detection"
                    />
                  </LaptopScreenContent>
                </LaptopScreen>
                <LaptopBase />
              </LaptopContainer>
            </LaptopWrapper>
            <DemoContent>
              <DemoTitle style={{ color: theme.colors.success }}>
                {lang === 'en' 
                  ? '🤖 AI Detects Opportunities in Real-Time'
                  : '🤖 IA Detecta Oportunidades em Tempo Real'
                }
              </DemoTitle>
              <DemoDescription>
                {lang === 'en' 
                  ? 'Our AI identifies the best videos to comment on. Smart algorithms find opportunities before your competitors!'
                  : 'Nossa IA identifica os melhores vídeos para comentar. Algoritmos inteligentes encontram oportunidades antes dos concorrentes!'
                }
              </DemoDescription>
            </DemoContent>
          </DemoCard>

          {/* MONITORING POWER */}
          <DemoCard>
            <LaptopWrapper rotate={-10} scale={0.9}>
              <LaptopContainer>
                <LaptopScreen>
                  <LaptopScreenContent>
                    <img 
                      src="/imagens/Captura de Tela 2025-05-27 às 15.58.36.png"
                      alt="YouTube Monitoring Power"
                    />
                  </LaptopScreenContent>
                </LaptopScreen>
                <LaptopBase />
              </LaptopContainer>
            </LaptopWrapper>
            <DemoContent>
              <DemoTitle style={{ background: theme.colors.gradient.landing, 
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}> 
                {lang === 'en' 
                  ? '📈 1.1M+ Views Monitored'
                  : '📈 1.1M+ Visualizações Monitoradas'
                }
              </DemoTitle>
              <DemoDescription>
                {lang === 'en' 
                  ? '24/7 monitoring of ALL relevant videos. Never miss a business opportunity again.'
                  : 'Monitoramento 24/7 de TODOS os vídeos relevantes. Nunca perca uma oportunidade de negócio novamente.'
                }
              </DemoDescription>
            </DemoContent>
          </DemoCard>

          {/* MENTION DETAILS */}
          <DemoCard style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
              <LaptopWrapper rotate={15} scale={0.85}>
                <LaptopContainer>
                  <LaptopScreen>
                    <LaptopScreenContent>
                      <img 
                        src="/imagens/Captura de Tela 2025-05-27 às 15.56.49.png"
                        alt="Mentions Dashboard"
                      />
                    </LaptopScreenContent>
                  </LaptopScreen>
                  <LaptopBase />
                </LaptopContainer>
              </LaptopWrapper>
              <LaptopWrapper rotate={-15} scale={0.85}>
                <LaptopContainer>
                  <LaptopScreen>
                    <LaptopScreenContent>
                      <img 
                        src="/imagens/Captura de Tela 2025-05-27 às 15.58.57.png"
                        alt="Performance Analytics"
                      />
                    </LaptopScreenContent>
                  </LaptopScreen>
                  <LaptopBase />
                </LaptopContainer>
              </LaptopWrapper>
            </div>
            <DemoContent>
              <DemoTitle style={{ fontSize: '28px', textAlign: 'center' }}>
                {lang === 'en' 
                  ? '💬 Smart Comments that Convert'
                  : '💬 Comentários Inteligentes que Convertem'
                }
              </DemoTitle>
              <DemoDescription style={{ fontSize: '16px', textAlign: 'center' }}>
                {lang === 'en' 
                  ? 'Track every mention, analyze performance, and watch your organic traffic grow exponentially. Our AI ensures maximum conversion with human-like interactions.'
                  : 'Acompanhe cada menção, analise o desempenho e veja seu tráfego orgânico crescer exponencialmente. Nossa IA garante máxima conversão com interações humanizadas.'
                }
              </DemoDescription>
            </DemoContent>
          </DemoCard>
        </DemoGrid>

        {/* URGENCY CTA */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '80px',
          padding: '40px',
          background: theme.name === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderRadius: '24px',
          border: `2px dashed ${theme.colors.primary}`
        }}>
          <h3 style={{ fontSize: '36px', marginBottom: '20px' }}>
            {lang === 'en' 
              ? '⚠️ Every Day Without Liftlio = Money Lost'
              : '⚠️ Cada Dia Sem Liftlio = Dinheiro Perdido'
            }
          </h3>
          <p style={{ fontSize: '20px', marginBottom: '30px', opacity: 0.9 }}>
            {lang === 'en' 
              ? 'While you read this, your competitors are capturing leads that could be yours.'
              : 'Enquanto você lê isso, seus concorrentes estão capturando leads que poderiam ser seus.'
            }
          </p>
          <PrimaryButton onClick={handleGetStarted} style={{ fontSize: '20px', padding: '20px 40px' }}>
            {renderIcon(FaRocket)}
            {lang === 'en' ? 'Start Growing Today' : 'Comece a Crescer Hoje'}
          </PrimaryButton>
        </div>
      </section>

      {/* Process Section */}
      <ProcessSection>
        <SectionHeader>
          <SectionTitle>
            {t.process.title} <Gradient>{t.process.titleHighlight}</Gradient>
          </SectionTitle>
          <SectionDescription>
            {t.process.subtitle}
          </SectionDescription>
        </SectionHeader>

        <ProcessGrid>
          {t.process.steps.map((step, index) => (
            <ProcessStep key={index}>
              <ProcessNumber>{index + 1}</ProcessNumber>
              <ProcessTitle>{step.title}</ProcessTitle>
              <ProcessDescription>{step.description}</ProcessDescription>
              {index < t.process.steps.length - 1 && index % 3 !== 2 && (
                <ProcessConnector />
              )}
            </ProcessStep>
          ))}
        </ProcessGrid>
      </ProcessSection>

      <StatsSection>
        <StatsGrid>
          <StatItem>
            <StatNumber>10M+</StatNumber>
            <StatLabel>{t.stats.monitored}</StatLabel>
          </StatItem>
          <StatItem>
            <StatNumber>50K+</StatNumber>
            <StatLabel>{t.stats.leads}</StatLabel>
          </StatItem>
          <StatItem>
            <StatNumber>95%</StatNumber>
            <StatLabel>{t.stats.accuracy}</StatLabel>
          </StatItem>
          <StatItem>
            <StatNumber>24/7</StatNumber>
            <StatLabel>{t.stats.monitoring}</StatLabel>
          </StatItem>
        </StatsGrid>
      </StatsSection>

      {/* Exponential Growth Section */}
      <ExponentialSection>
        <ExponentialContent>
          <SectionHeader>
            <SectionTitle>
              {t.exponential.title} <Gradient>{t.exponential.titleHighlight}</Gradient>
            </SectionTitle>
            <SectionDescription>
              {t.exponential.subtitle}
            </SectionDescription>
          </SectionHeader>

          <ExponentialGrid>
            {t.exponential.items.map((item, index) => (
              <ExponentialItem key={index}>
                <ExponentialMonth>{item.month}</ExponentialMonth>
                <ExponentialValue>{item.value}</ExponentialValue>
                <ExponentialDescription>{item.description}</ExponentialDescription>
              </ExponentialItem>
            ))}
          </ExponentialGrid>

          <BenefitsList>
            {t.exponential.benefits.map((benefit, index) => (
              <BenefitItem key={index}>
                <BenefitIcon>
                  {renderIcon(FaCheck)}
                </BenefitIcon>
                <BenefitText>{benefit}</BenefitText>
              </BenefitItem>
            ))}
          </BenefitsList>
        </ExponentialContent>
      </ExponentialSection>

      <PricingSection id="pricing">
        <SectionHeader>
          <SectionTitle>
            {t.pricing.title} <Gradient>{t.pricing.titleHighlight}</Gradient>
          </SectionTitle>
          <SectionDescription>
            {t.pricing.subtitle}
          </SectionDescription>
        </SectionHeader>

        <PricingGrid>
          <PricingCard>
            <PricingPlan>{t.pricing.plans.starter.name}</PricingPlan>
            <PricingPrice>
              $30<span>/{t.pricing.monthly}</span>
            </PricingPrice>
            <PricingDescription>
              {t.pricing.plans.starter.description}
            </PricingDescription>
            <PricingFeatures>
              {t.pricing.plans.starter.features.map((feature, index) => (
                <PricingFeature key={index}>
                  {renderIcon(FaCheck)} {feature}
                </PricingFeature>
              ))}
            </PricingFeatures>
            <PrimaryButton onClick={handleGetStarted} style={{ width: '100%' }}>
              {t.pricing.cta}
            </PrimaryButton>
          </PricingCard>

          <PricingCard featured>
            <PricingBadge>{t.pricing.plans.professional.badge}</PricingBadge>
            <PricingPlan>{t.pricing.plans.professional.name}</PricingPlan>
            <PricingPrice>
              $100<span>/{t.pricing.monthly}</span>
            </PricingPrice>
            <PricingDescription>
              {t.pricing.plans.professional.description}
            </PricingDescription>
            <PricingFeatures>
              {t.pricing.plans.professional.features.map((feature, index) => (
                <PricingFeature key={index}>
                  {renderIcon(FaCheck)} {feature}
                </PricingFeature>
              ))}
            </PricingFeatures>
            <PrimaryButton onClick={handleGetStarted} style={{ width: '100%' }}>
              {t.pricing.cta}
            </PrimaryButton>
          </PricingCard>

          <PricingCard>
            <PricingPlan>{t.pricing.plans.enterprise.name}</PricingPlan>
            <PricingPrice>
              $200<span>/{t.pricing.monthly}</span>
            </PricingPrice>
            <PricingDescription>
              {t.pricing.plans.enterprise.description}
            </PricingDescription>
            <PricingFeatures>
              {t.pricing.plans.enterprise.features.map((feature, index) => (
                <PricingFeature key={index}>
                  {renderIcon(FaCheck)} {feature}
                </PricingFeature>
              ))}
            </PricingFeatures>
            <PrimaryButton onClick={handleGetStarted} style={{ width: '100%' }}>
              {t.pricing.cta}
            </PrimaryButton>
          </PricingCard>
        </PricingGrid>
      </PricingSection>

      <div id="testimonials">
        <Testimonials language={lang} />
      </div>

      <CTASection style={{ background: theme.name === 'dark' ? '#1a1a1a' : '#f5f5f5' }}>
        <CTAContent>
          <CTATitle>
            {t.cta.title} <Gradient>{t.cta.titleHighlight}</Gradient> {t.cta.titleEnd}
          </CTATitle>
          <CTADescription>
            {t.cta.subtitle}
          </CTADescription>
          <PrimaryButton onClick={handleGetStarted} style={{ fontSize: '18px', padding: '20px 40px', margin: '0 auto' }}>
            {renderIcon(FaRocket)}
            {t.cta.button}
          </PrimaryButton>
        </CTAContent>
      </CTASection>

      <Footer>
        <FooterContent>
          <FooterColumn>
            <FooterTitle>
              <Logo style={{ 
                fontSize: '24px', 
                color: theme.name === 'light' ? '#ffffff' : theme.colors.primary,
                fontWeight: 900,
                opacity: 1
              }}>
                {renderIcon(BiPulse)}
                LIFTLIO
              </Logo>
            </FooterTitle>
            <FooterDescription>
              {t.footer.description}
            </FooterDescription>
          </FooterColumn>

          <FooterColumn>
            <FooterTitle>{t.footer.product}</FooterTitle>
            <FooterLinks>
              <FooterLink><a href="#features">{t.footer.links.features}</a></FooterLink>
              <FooterLink><a href="#pricing">{t.footer.links.pricing}</a></FooterLink>
              <FooterLink><a href="#">{t.footer.links.integrations}</a></FooterLink>
              <FooterLink><a href="#">{t.footer.links.api}</a></FooterLink>
            </FooterLinks>
          </FooterColumn>

          <FooterColumn>
            <FooterTitle>{t.footer.company}</FooterTitle>
            <FooterLinks>
              <FooterLink><a href="/about">{t.footer.links.about}</a></FooterLink>
            </FooterLinks>
          </FooterColumn>

          <FooterColumn>
            <FooterTitle>{t.footer.legal}</FooterTitle>
            <FooterLinks>
              <FooterLink><a href="/privacy">{t.footer.links.privacy}</a></FooterLink>
              <FooterLink><a href="/terms">{t.footer.links.terms}</a></FooterLink>
              <FooterLink><a href="/security">{t.footer.links.security}</a></FooterLink>
            </FooterLinks>
          </FooterColumn>
        </FooterContent>

        <FooterBottom>
          {t.footer.copyright}
        </FooterBottom>
      </Footer>

      {/* Urgency Banner - DISABLED */}
      {/* {showUrgencyBanner && (
        <UrgencyBanner>
          <span>{renderIcon(FaDollarSign)}</span>
          <span style={{ fontSize: '16px' }}>
            {t.urgency.price}
          </span>
          <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '4px' }}>
            {t.urgency.guarantee}
          </div>
        </UrgencyBanner>
      )} */}
    </LandingContainer>
  );
};

export default LandingPage;