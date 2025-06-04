import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { FaYoutube, FaReddit, FaChartLine, FaDollarSign, FaUsers, FaRocket, FaCommentDots, FaFire, FaTrophy, FaEye, FaArrowRight, FaClock, FaCheckCircle, FaCalculator, FaBullhorn, FaCoins, FaInfinity } from 'react-icons/fa';
import { HiTrendingUp, HiLightningBolt } from 'react-icons/hi';
import { MdAutoGraph, MdTimeline } from 'react-icons/md';
import { renderIcon } from '../utils/IconHelper';

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
    youtube: string | { pt: string; en: string };
    reddit: string | { pt: string; en: string };
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
        pt: "Excelente explicação sobre IA no marketing! No minuto 3:42 você mencionou automação de conteúdo - já testaram ferramentas específicas para isso? Na nossa experiência com clientes, descobrimos que combinar IA com estratégia humana traz resultados incríveis. Adoraria trocar ideias sobre isso!",
        en: "Excellent explanation about AI in marketing! At 3:42 you mentioned content automation - have you tested specific tools for this? In our experience with clients, we've found that combining AI with human strategy brings incredible results. Would love to exchange ideas on this!"
      },
      reddit: {
        pt: "Concordo totalmente com seu ponto sobre eficiência da IA. Trabalhamos com automação de marketing e posso confirmar que a chave está em manter o toque humano. Recentemente ajudamos uma startup a aumentar o engajamento em 300% usando essa abordagem. Alguém mais teve experiências similares?",
        en: "Totally agree with your point about AI efficiency. We work with marketing automation and I can confirm that the key is maintaining the human touch. We recently helped a startup increase engagement by 300% using this approach. Has anyone else had similar experiences?"
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
        pt: "Tutorial incrível! A parte sobre integração com APIs (minuto 7:20) foi muito útil. Desenvolvemos soluções no-code para várias startups e essa abordagem que você mostrou é game-changer. Vocês já consideraram criar um template específico para SaaS? Temos alguns cases interessantes nessa área.",
        en: "Amazing tutorial! The part about API integration (minute 7:20) was very helpful. We develop no-code solutions for various startups and the approach you showed is a game-changer. Have you considered creating a specific template for SaaS? We have some interesting cases in this area."
      },
      reddit: {
        pt: "Ótima lista de ferramentas no-code! Como consultoria especializada, posso adicionar que o Retool também é excelente para dashboards internos. Implementamos para um cliente recente e economizou 3 meses de desenvolvimento. Alguém aqui já combinou Bubble + Retool?",
        en: "Great list of no-code tools! As a specialized consultancy, I can add that Retool is also excellent for internal dashboards. We implemented it for a recent client and it saved 3 months of development. Has anyone here combined Bubble + Retool?"
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
        pt: "Estratégia muito boa! No ponto sobre qualificação de leads (5:15), vocês usam alguma ferramenta específica? Na nossa agência de growth, desenvolvemos um framework próprio que tem dado ótimos resultados. Seria legal trocar experiências sobre isso!",
        en: "Great strategy! On the point about lead qualification (5:15), do you use any specific tools? At our growth agency, we developed our own framework that has been giving great results. Would be cool to exchange experiences on this!"
      },
      reddit: {
        pt: "Testei a técnica de cold email que você sugeriu e a taxa de resposta aumentou 3x! Como agência B2B, posso confirmar que personalização em escala é o segredo. Desenvolvemos um sistema que automatiza isso mantendo a autenticidade. Alguém quer saber mais detalhes?",
        en: "I tested the cold email technique you suggested and the response rate increased 3x! As a B2B agency, I can confirm that personalization at scale is the secret. We developed a system that automates this while maintaining authenticity. Anyone want more details?"
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
        pt: "Análise perfeita sobre CAC vs LTV! Uma dúvida: como vocês calculam o CAC quando têm múltiplos canais de aquisição? Ajudamos várias SaaS com essa questão e criamos uma metodologia específica para isso. Posso compartilhar alguns insights se houver interesse!",
        en: "Perfect analysis on CAC vs LTV! A question: how do you calculate CAC when you have multiple acquisition channels? We help several SaaS with this issue and created a specific methodology for it. I can share some insights if there's interest!"
      },
      reddit: {
        pt: "Para quem está começando com métricas SaaS, como consultor especializado, recomendo focar primeiro em MRR e Churn. Temos um dashboard template que monitora essas métricas em tempo real - já ajudou mais de 50 startups. DM aberto para quem quiser conversar sobre isso!",
        en: "For those starting with SaaS metrics, as a specialized consultant, I recommend focusing first on MRR and Churn. We have a dashboard template that monitors these metrics in real-time - it has already helped over 50 startups. DM open for anyone who wants to talk about this!"
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
    
    /* Destacar menções naturais da empresa */
    strong {
      color: ${props => props.theme.name === 'dark' ? '#667eea' : '#5a67d8'};
      font-weight: 600;
      background: ${props => props.theme.name === 'dark' 
        ? 'rgba(102, 126, 234, 0.1)' 
        : 'rgba(102, 126, 234, 0.05)'};
      padding: 0 0.25rem;
      border-radius: 4px;
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

const ComparisonVisual = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  max-width: 1000px;
  margin: 4rem auto;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const VisualCard = styled(motion.div)<{ type: 'organic' | 'ads' }>`
  background: ${props => props.theme.name === 'dark' ? '#1a1a2e' : '#ffffff'};
  border: 2px solid ${props => props.type === 'organic' 
    ? props.theme.name === 'dark' ? 'rgba(102, 126, 234, 0.3)' : 'rgba(102, 126, 234, 0.2)'
    : props.theme.name === 'dark' ? 'rgba(255, 107, 107, 0.3)' : 'rgba(255, 107, 107, 0.2)'};
  border-radius: 24px;
  padding: 2rem;
  position: relative;
  overflow: hidden;
`;

const VisualHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  
  .icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }
  
  h4 {
    font-size: 1.25rem;
    font-weight: 700;
    color: ${props => props.theme.name === 'dark' ? '#fff' : '#333'};
  }
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
      googleAds: 'Google Ads',
      contentMarketing: 'Marketing de Conteúdo',
      adsFeatures: [
        'Custo por clique (desaparece após o clique)',
        'Resultados apenas durante a campanha',
        'Custo crescente com a concorrência',
        'ROI limitado ao orçamento'
      ],
      contentFeatures: [
        'Posts vivem para sempre na internet',
        'Tráfego orgânico contínuo 24/7',
        'Autoridade cresce com o tempo',
        'Custo fixo, retorno infinito'
      ],
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
      payPerClick: 'Paga por clique',
      userClicks: 'Usuário clica',
      disappears: 'Desaparece',
      costPerClickDisappears: 'Custo por clique (desaparece após o clique)',
      resultsOnlyDuringCampaign: 'Resultados apenas durante a campanha',
      increasingCostWithCompetition: 'Custo crescente com a concorrência',
      roiLimitedToBudget: 'ROI limitado ao orçamento',
      postCreated: 'Post criado',
      generatesTraffic: 'Gera tráfego',
      forever: 'Para sempre',
      postsLiveForever: 'Posts vivem para sempre na internet',
      continuousOrganicTraffic: 'Tráfego orgânico contínuo 24/7',
      authorityGrowsOverTime: 'Autoridade cresce com o tempo',
      fixedCostInfiniteReturn: 'Custo fixo, retorno infinito',
      perpetualContent: 'O Poder do Conteúdo Perpétuo',
      perpetualSubtitle: 'Veja como cada post continua gerando valor ao longo do tempo',
      monthsLabel: ['Mês 1', 'Mês 2', 'Mês 3', 'Mês 4', 'Mês 5', 'Mês 6'],
      postsPerMonth: 'posts/mês',
      accumulatedTraffic: 'Tráfego Acumulado',
      infiniteValue: 'Valor Infinito',
      adsDisappear: 'Ads param após o clique',
      contentGrows: 'Conteúdo cresce para sempre',
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
      googleAds: 'Google Ads',
      contentMarketing: 'Content Marketing',
      adsFeatures: [
        'Cost per click (disappears after click)',
        'Results only during campaign',
        'Increasing cost with competition',
        'ROI limited to budget'
      ],
      contentFeatures: [
        'Posts live forever on the internet',
        'Continuous organic traffic 24/7',
        'Authority grows over time',
        'Fixed cost, infinite return'
      ],
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
      payPerClick: 'Pay per click',
      userClicks: 'User clicks',
      disappears: 'Disappears',
      costPerClickDisappears: 'Cost per click (disappears after click)',
      resultsOnlyDuringCampaign: 'Results only during campaign',
      increasingCostWithCompetition: 'Increasing cost with competition',
      roiLimitedToBudget: 'ROI limited to budget',
      postCreated: 'Post created',
      generatesTraffic: 'Generates traffic',
      forever: 'Forever',
      postsLiveForever: 'Posts live forever on the internet',
      continuousOrganicTraffic: 'Continuous organic traffic 24/7',
      authorityGrowsOverTime: 'Authority grows over time',
      fixedCostInfiniteReturn: 'Fixed cost, infinite return',
      perpetualContent: 'The Power of Perpetual Content',
      perpetualSubtitle: 'See how each post continues to generate value over time',
      monthsLabel: ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'],
      postsPerMonth: 'posts/month',
      accumulatedTraffic: 'Accumulated Traffic',
      infiniteValue: 'Infinite Value',
      adsDisappear: 'Ads stop after click',
      contentGrows: 'Content grows forever',
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
    const highlights = [
      'nossa experiência com clientes',
      'Na nossa agência',
      'nossa equipe',
      'Trabalhamos com',
      'Desenvolvemos',
      'consultoria especializada',
      'Como consultoria',
      'Como agência',
      'Ajudamos',
      'Implementamos',
      'nosso',
      'nossa',
      'consultoria',
      'agência'
    ];
    
    let highlightedText = text;
    highlights.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<strong>$1</strong>');
    });
    
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
                  {selectedTopic.sampleComments && (
                    <>
                      <CommentExample platform="youtube">
                        <p dangerouslySetInnerHTML={{ 
                          __html: highlightCompanyMentions(
                            typeof selectedTopic.sampleComments.youtube === 'string' 
                              ? selectedTopic.sampleComments.youtube 
                              : (selectedTopic.sampleComments.youtube as {pt: string, en: string})[lang]
                          ) 
                        }} />
                      </CommentExample>
                      <CommentExample platform="reddit">
                        <p dangerouslySetInnerHTML={{ 
                          __html: highlightCompanyMentions(
                            typeof selectedTopic.sampleComments.reddit === 'string' 
                              ? selectedTopic.sampleComments.reddit 
                              : (selectedTopic.sampleComments.reddit as {pt: string, en: string})[lang]
                          ) 
                        }} />
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


          {/* Original Visual Comparison - Ads vs Content */}
          <ComparisonVisual>
            {/* Ads Visualization */}
            <VisualCard
              type="ads"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <VisualHeader>
                <div className="icon" style={{ 
                  background: 'rgba(255, 107, 107, 0.1)', 
                  color: '#ff6b6b' 
                }}>
                  {renderIcon(FaBullhorn)}
                </div>
                <h4>{t.googleAds}</h4>
              </VisualHeader>

              <div style={{ padding: '2rem 0' }}>
                {/* Ad Click Lifecycle */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '2rem'
                }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'rgba(255, 107, 107, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.5rem',
                      fontSize: '2rem',
                      color: '#ff6b6b'
                    }}>
                      {renderIcon(FaDollarSign)}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                      {t.payPerClick}
                    </div>
                  </div>
                  
                  <div style={{ color: '#ff6b6b', fontSize: '1.5rem' }}>
                    {renderIcon(FaArrowRight)}
                  </div>
                  
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'rgba(255, 107, 107, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.5rem',
                      fontSize: '2rem',
                      color: '#ff6b6b',
                      opacity: 0.5
                    }}>
                      {renderIcon(FaEye)}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', opacity: 0.7 }}>
                      {t.userClicks}
                    </div>
                  </div>
                  
                  <div style={{ color: '#ff6b6b', fontSize: '1.5rem' }}>
                    {renderIcon(FaArrowRight)}
                  </div>
                  
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <motion.div
                      animate={{ scale: [1, 0.8, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'rgba(255, 107, 107, 0.05)',
                        border: '2px dashed rgba(255, 107, 107, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.5rem',
                        fontSize: '2rem',
                        color: '#ff6b6b'
                      }}
                    >
                      ❌
                    </motion.div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#ff6b6b' }}>
                      {t.disappears}
                    </div>
                  </div>
                </div>

                {/* Features List */}
                <div style={{ 
                  background: theme.name === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                  borderRadius: '12px',
                  padding: '1rem'
                }}>
                  {t.adsFeatures.map((feature, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: index < t.adsFeatures.length - 1 ? '0.75rem' : 0,
                      fontSize: '0.875rem',
                      color: theme.name === 'dark' ? '#ccc' : '#666'
                    }}>
                      <span style={{ color: '#ff6b6b', fontSize: '1rem' }}>✗</span>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </VisualCard>

            {/* Organic Content Visualization */}
            <VisualCard
              type="organic"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <VisualHeader>
                <div className="icon" style={{ 
                  background: 'rgba(102, 126, 234, 0.1)', 
                  color: '#667eea' 
                }}>
                  {renderIcon(FaCommentDots)}
                </div>
                <h4>{t.contentMarketing}</h4>
              </VisualHeader>

              <div style={{ padding: '2rem 0' }}>
                {/* Content Lifecycle */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '2rem'
                }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'rgba(102, 126, 234, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.5rem',
                      fontSize: '2rem',
                      color: '#667eea'
                    }}>
                      {renderIcon(FaCommentDots)}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                      {t.postCreated}
                    </div>
                  </div>
                  
                  <div style={{ color: '#4ecdc4', fontSize: '1.5rem' }}>
                    {renderIcon(FaArrowRight)}
                  </div>
                  
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'rgba(78, 205, 196, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.5rem',
                        fontSize: '2rem',
                        color: '#4ecdc4'
                      }}
                    >
                      {renderIcon(FaUsers)}
                    </motion.div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                      {t.generatesTraffic}
                    </div>
                  </div>
                  
                  <div style={{ color: '#4ecdc4', fontSize: '1.5rem' }}>
                    {renderIcon(FaArrowRight)}
                  </div>
                  
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 360]
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(78, 205, 196, 0.3) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.5rem',
                        fontSize: '2rem',
                        color: '#667eea'
                      }}
                    >
                      {renderIcon(FaInfinity)}
                    </motion.div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#4ecdc4' }}>
                      {t.forever}
                    </div>
                  </div>
                </div>

                {/* Features List */}
                <div style={{ 
                  background: theme.name === 'dark' ? 'rgba(102, 126, 234, 0.05)' : 'rgba(102, 126, 234, 0.02)',
                  borderRadius: '12px',
                  padding: '1rem'
                }}>
                  {t.contentFeatures.map((feature, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: index < t.contentFeatures.length - 1 ? '0.75rem' : 0,
                      fontSize: '0.875rem',
                      color: theme.name === 'dark' ? '#ccc' : '#666'
                    }}>
                      <span style={{ color: '#4ecdc4', fontSize: '1rem' }}>✓</span>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </VisualCard>
          </ComparisonVisual>

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
                ? <>Com <strong>{postsPerMonth} posts por mês em vídeos quentes sobre {getTranslatedTopicName(selectedTopic.name)}</strong>, após 6 meses você terá <strong>{postsPerMonth * 6} comentários estratégicos em vídeos com milhares de views ativas</strong>. Cada comentário fica visível em vídeos que <strong>pessoas assistem todos os dias procurando soluções</strong>, gerando tráfego qualificado 24/7. Enquanto anúncios desaparecem após o clique, seus comentários continuam sendo lidos por um <strong>público já engajado e interessado no tema</strong> - para sempre!</>
                : <>With <strong>{postsPerMonth} posts per month on hot videos about {getTranslatedTopicName(selectedTopic.name)}</strong>, after 6 months you'll have <strong>{postsPerMonth * 6} strategic comments on videos with thousands of active views</strong>. Each comment remains visible on videos that <strong>people watch daily looking for solutions</strong>, generating qualified traffic 24/7. While ads disappear after the click, your comments keep being read by an <strong>already engaged audience interested in the topic</strong> - forever!</>
              }
            </InsightText>
          </InsightBox>
        </SnowballSection>
      </Wrapper>
    </Container>
  );
};

export default MarketTrends;