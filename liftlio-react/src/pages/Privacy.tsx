import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaShieldAlt, FaLock, FaUserShield, FaDatabase } from 'react-icons/fa';
import { BiPulse } from 'react-icons/bi';
import { useLanguage } from '../context/LanguageContext';
import { IconComponent } from '../utils/IconHelper';
import InstitutionalWrapper from './InstitutionalWrapper';

const PrivacyContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text.primary};
`;

const Header = styled.header`
  padding: 20px 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${props => props.theme.colors.borderLight};
  
  @media (max-width: 768px) {
    padding: 20px 32px;
  }
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: ${props => props.theme.colors.text.primary};
  font-size: 16px;
  cursor: pointer;
  transition: color 0.3s ease;
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: 900;
  color: ${props => props.theme.colors.primary};
`;

const Content = styled.main`
  max-width: 800px;
  margin: 0 auto;
  padding: 80px 32px;
`;

const Title = styled.h1`
  font-size: 48px;
  font-weight: 900;
  margin-bottom: 24px;
  color: ${props => props.theme.colors.text.primary};
  
  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const LastUpdated = styled.p`
  font-size: 16px;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 48px;
`;

const Section = styled.section`
  margin-bottom: 48px;
`;

const SectionTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 16px;
  color: ${props => props.theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SectionIcon = styled.span`
  font-size: 24px;
  color: ${props => props.theme.colors.primary};
`;

const Paragraph = styled.p`
  font-size: 16px;
  line-height: 1.8;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 16px;
`;

const List = styled.ul`
  margin: 16px 0;
  padding-left: 24px;
`;

const ListItem = styled.li`
  font-size: 16px;
  line-height: 1.8;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 8px;
`;

const Privacy: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  const content = {
    en: {
      back: "Back",
      title: "Privacy Policy",
      lastUpdated: "Last updated: January 2024",
      sections: {
        commitment: {
          title: "Our Commitment",
          icon: FaShieldAlt,
          content: "At Liftlio, we operate with a fundamental principle: your data is your business asset, not ours. We've built our entire infrastructure around protecting your privacy while delivering exceptional value."
        },
        dataCollection: {
          title: "Data We Collect",
          icon: FaDatabase,
          content: "We collect only what's essential to deliver our service:",
          items: [
            "Account information (email, company name) for authentication",
            "YouTube channel preferences for monitoring",
            "Performance metrics to improve our service",
            "Usage patterns to enhance user experience"
          ]
        },
        dataUsage: {
          title: "How We Use Your Data",
          icon: FaUserShield,
          content: "Your data powers your success, nothing more:",
          items: [
            "Monitoring relevant YouTube channels based on your preferences",
            "Generating intelligent responses to identified opportunities",
            "Providing analytics and insights about your performance",
            "Improving our AI algorithms (anonymized and aggregated only)"
          ]
        },
        dataSecurity: {
          title: "Data Security",
          icon: FaLock,
          content: "We employ bank-level security measures:",
          items: [
            "End-to-end encryption for all data transmission",
            "Encrypted storage with regular security audits",
            "Limited access controls with detailed audit logs",
            "Regular penetration testing and vulnerability assessments"
          ]
        },
        yourRights: {
          title: "Your Rights",
          content: "You maintain complete control over your data:",
          items: [
            "Access all your data anytime through your dashboard",
            "Export your data in standard formats",
            "Delete your account and all associated data instantly",
            "Opt-out of any non-essential data processing"
          ]
        },
        sharing: {
          title: "Data Sharing",
          content: "We never sell, rent, or trade your data. Period. We share data only when:",
          items: [
            "You explicitly request us to (e.g., integrations)",
            "Required by law (with notification unless legally prohibited)",
            "Necessary to protect rights, safety, or property"
          ]
        }
      }
    },
    pt: {
      back: "Voltar",
      title: "Política de Privacidade",
      lastUpdated: "Última atualização: Janeiro 2024",
      sections: {
        commitment: {
          title: "Nosso Compromisso",
          icon: FaShieldAlt,
          content: "No Liftlio, operamos com um princípio fundamental: seus dados são seu ativo empresarial, não nosso. Construímos toda nossa infraestrutura para proteger sua privacidade enquanto entregamos valor excepcional."
        },
        dataCollection: {
          title: "Dados que Coletamos",
          icon: FaDatabase,
          content: "Coletamos apenas o essencial para entregar nosso serviço:",
          items: [
            "Informações de conta (email, nome da empresa) para autenticação",
            "Preferências de canais do YouTube para monitoramento",
            "Métricas de desempenho para melhorar nosso serviço",
            "Padrões de uso para aprimorar a experiência do usuário"
          ]
        },
        dataUsage: {
          title: "Como Usamos Seus Dados",
          icon: FaUserShield,
          content: "Seus dados impulsionam seu sucesso, nada mais:",
          items: [
            "Monitorar canais relevantes do YouTube baseado em suas preferências",
            "Gerar respostas inteligentes para oportunidades identificadas",
            "Fornecer análises e insights sobre seu desempenho",
            "Melhorar nossos algoritmos de IA (apenas anonimizados e agregados)"
          ]
        },
        dataSecurity: {
          title: "Segurança dos Dados",
          icon: FaLock,
          content: "Empregamos medidas de segurança de nível bancário:",
          items: [
            "Criptografia ponta a ponta para toda transmissão de dados",
            "Armazenamento criptografado com auditorias regulares",
            "Controles de acesso limitados com logs detalhados",
            "Testes de penetração e avaliações de vulnerabilidade regulares"
          ]
        },
        yourRights: {
          title: "Seus Direitos",
          content: "Você mantém controle total sobre seus dados:",
          items: [
            "Acesse todos seus dados a qualquer momento pelo dashboard",
            "Exporte seus dados em formatos padrão",
            "Delete sua conta e todos os dados associados instantaneamente",
            "Opte por não participar de processamento não essencial"
          ]
        },
        sharing: {
          title: "Compartilhamento de Dados",
          content: "Nunca vendemos, alugamos ou negociamos seus dados. Ponto. Compartilhamos dados apenas quando:",
          items: [
            "Você solicita explicitamente (ex: integrações)",
            "Exigido por lei (com notificação, exceto se proibido legalmente)",
            "Necessário para proteger direitos, segurança ou propriedade"
          ]
        }
      }
    }
  };
  
  const t = content[language];
  
  return (
    <InstitutionalWrapper>
      <PrivacyContainer>
      <Header>
        <BackButton onClick={() => navigate('/')}>
          <IconComponent icon={FaArrowLeft} />
          {t.back}
        </BackButton>
        <Logo>
          <IconComponent icon={BiPulse} />
          LIFTLIO
        </Logo>
      </Header>
      
      <Content>
        <Title>{t.title}</Title>
        <LastUpdated>{t.lastUpdated}</LastUpdated>
        
        <Section>
          <SectionTitle>
            <SectionIcon><IconComponent icon={t.sections.commitment.icon} /></SectionIcon>
            {t.sections.commitment.title}
          </SectionTitle>
          <Paragraph>{t.sections.commitment.content}</Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>
            <SectionIcon><IconComponent icon={t.sections.dataCollection.icon} /></SectionIcon>
            {t.sections.dataCollection.title}
          </SectionTitle>
          <Paragraph>{t.sections.dataCollection.content}</Paragraph>
          <List>
            {t.sections.dataCollection.items.map((item: string, index: number) => (
              <ListItem key={index}>{item}</ListItem>
            ))}
          </List>
        </Section>
        
        <Section>
          <SectionTitle>
            <SectionIcon><IconComponent icon={t.sections.dataUsage.icon} /></SectionIcon>
            {t.sections.dataUsage.title}
          </SectionTitle>
          <Paragraph>{t.sections.dataUsage.content}</Paragraph>
          <List>
            {t.sections.dataUsage.items.map((item: string, index: number) => (
              <ListItem key={index}>{item}</ListItem>
            ))}
          </List>
        </Section>
        
        <Section>
          <SectionTitle>
            <SectionIcon><IconComponent icon={t.sections.dataSecurity.icon} /></SectionIcon>
            {t.sections.dataSecurity.title}
          </SectionTitle>
          <Paragraph>{t.sections.dataSecurity.content}</Paragraph>
          <List>
            {t.sections.dataSecurity.items.map((item: string, index: number) => (
              <ListItem key={index}>{item}</ListItem>
            ))}
          </List>
        </Section>
        
        <Section>
          <SectionTitle>{t.sections.yourRights.title}</SectionTitle>
          <Paragraph>{t.sections.yourRights.content}</Paragraph>
          <List>
            {t.sections.yourRights.items.map((item: string, index: number) => (
              <ListItem key={index}>{item}</ListItem>
            ))}
          </List>
        </Section>
        
        <Section>
          <SectionTitle>{t.sections.sharing.title}</SectionTitle>
          <Paragraph>{t.sections.sharing.content}</Paragraph>
          <List>
            {t.sections.sharing.items.map((item: string, index: number) => (
              <ListItem key={index}>{item}</ListItem>
            ))}
          </List>
        </Section>
      </Content>
    </PrivacyContainer>
    </InstitutionalWrapper>
  );
};

export default Privacy;