import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaFileContract, FaHandshake, FaBalanceScale, FaExclamationTriangle } from 'react-icons/fa';
import { BiPulse } from 'react-icons/bi';
import { useLanguage } from '../context/LanguageContext';
import { IconComponent } from '../utils/IconHelper';
import InstitutionalWrapper from './InstitutionalWrapper';

const TermsContainer = styled.div`
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

const Highlight = styled.span`
  color: ${props => props.theme.colors.primary};
  font-weight: 600;
`;

const Terms: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  const content = {
    en: {
      back: "Back",
      title: "Terms of Service",
      lastUpdated: "Last updated: January 2024",
      sections: {
        agreement: {
          title: "The Agreement",
          icon: FaFileContract,
          content: "By using Liftlio, you're entering a partnership designed for mutual success. These terms ensure we can deliver exceptional value while protecting both parties."
        },
        service: {
          title: "Our Service",
          content: "Liftlio provides intelligent YouTube monitoring and engagement automation that:",
          items: [
            "Monitors channels relevant to your business 24/7",
            "Identifies opportunities for organic engagement",
            "Generates authentic, valuable comments",
            "Tracks performance and delivers insights"
          ],
          note: "We guarantee authentic engagement that adds value. We never spam, mislead, or violate platform policies."
        },
        yourResponsibilities: {
          title: "Your Responsibilities",
          icon: FaHandshake,
          content: "To ensure success for everyone:",
          items: [
            "Provide accurate business information",
            "Use Liftlio for legitimate business purposes only",
            "Respect YouTube's terms of service",
            "Maintain confidentiality of your account credentials",
            "Review and approve content before publishing"
          ]
        },
        pricing: {
          title: "Fair Pricing",
          icon: FaBalanceScale,
          content: "Our pricing is transparent and value-based:",
          items: [
            "Billed monthly based on your selected plan",
            "No hidden fees or surprise charges",
            "Cancel anytime with no penalties",
            "Unused credits don't roll over to next month"
          ]
        },
        intellectualProperty: {
          title: "Intellectual Property",
          content: "Clear ownership rules:",
          items: [
            "You own all content about your business",
            "We own the Liftlio platform and technology",
            "Generated content becomes your property once published",
            "You grant us license to use your content for service delivery"
          ]
        },
        limitations: {
          title: "Limitations",
          icon: FaExclamationTriangle,
          content: "Important boundaries:",
          items: [
            "We don't guarantee specific results (though we have a great track record)",
            "We're not responsible for YouTube's actions or policy changes",
            "Our liability is limited to the amount you've paid us",
            "We can't control how viewers respond to your content"
          ]
        },
        termination: {
          title: "Termination",
          content: "Either party can end this agreement:",
          items: [
            "You can cancel anytime from your dashboard",
            "We may terminate for terms violations with notice",
            "Your data remains accessible for 30 days post-termination",
            "Refunds are prorated for unused time in current period"
          ]
        }
      }
    },
    pt: {
      back: "Voltar",
      title: "Termos de Serviço",
      lastUpdated: "Última atualização: Janeiro 2024",
      sections: {
        agreement: {
          title: "O Acordo",
          icon: FaFileContract,
          content: "Ao usar o Liftlio, você está entrando em uma parceria projetada para o sucesso mútuo. Estes termos garantem que possamos entregar valor excepcional enquanto protegemos ambas as partes."
        },
        service: {
          title: "Nosso Serviço",
          content: "O Liftlio fornece monitoramento inteligente do YouTube e automação de engajamento que:",
          items: [
            "Monitora canais relevantes para seu negócio 24/7",
            "Identifica oportunidades de engajamento orgânico",
            "Gera comentários autênticos e valiosos",
            "Rastreia desempenho e entrega insights"
          ],
          note: "Garantimos engajamento autêntico que agrega valor. Nunca fazemos spam, enganamos ou violamos políticas da plataforma."
        },
        yourResponsibilities: {
          title: "Suas Responsabilidades",
          icon: FaHandshake,
          content: "Para garantir sucesso para todos:",
          items: [
            "Fornecer informações comerciais precisas",
            "Usar o Liftlio apenas para fins comerciais legítimos",
            "Respeitar os termos de serviço do YouTube",
            "Manter a confidencialidade de suas credenciais",
            "Revisar e aprovar conteúdo antes de publicar"
          ]
        },
        pricing: {
          title: "Preços Justos",
          icon: FaBalanceScale,
          content: "Nossos preços são transparentes e baseados em valor:",
          items: [
            "Cobrado mensalmente com base no plano selecionado",
            "Sem taxas ocultas ou cobranças surpresa",
            "Cancele a qualquer momento sem penalidades",
            "Créditos não utilizados não acumulam para o próximo mês"
          ]
        },
        intellectualProperty: {
          title: "Propriedade Intelectual",
          content: "Regras claras de propriedade:",
          items: [
            "Você possui todo conteúdo sobre seu negócio",
            "Nós possuímos a plataforma e tecnologia Liftlio",
            "Conteúdo gerado torna-se sua propriedade após publicação",
            "Você nos concede licença para usar seu conteúdo na entrega do serviço"
          ]
        },
        limitations: {
          title: "Limitações",
          icon: FaExclamationTriangle,
          content: "Limites importantes:",
          items: [
            "Não garantimos resultados específicos (embora tenhamos ótimo histórico)",
            "Não somos responsáveis por ações ou mudanças de política do YouTube",
            "Nossa responsabilidade limita-se ao valor que você nos pagou",
            "Não podemos controlar como espectadores respondem ao seu conteúdo"
          ]
        },
        termination: {
          title: "Rescisão",
          content: "Qualquer parte pode encerrar este acordo:",
          items: [
            "Você pode cancelar a qualquer momento pelo dashboard",
            "Podemos rescindir por violações dos termos com aviso",
            "Seus dados permanecem acessíveis por 30 dias após rescisão",
            "Reembolsos são proporcionais ao tempo não usado no período atual"
          ]
        }
      }
    }
  };
  
  const t = content[language];
  
  return (
    <InstitutionalWrapper>
      <TermsContainer>
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
            <SectionIcon><IconComponent icon={t.sections.agreement.icon} /></SectionIcon>
            {t.sections.agreement.title}
          </SectionTitle>
          <Paragraph>{t.sections.agreement.content}</Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>{t.sections.service.title}</SectionTitle>
          <Paragraph>{t.sections.service.content}</Paragraph>
          <List>
            {t.sections.service.items.map((item: string, index: number) => (
              <ListItem key={index}>{item}</ListItem>
            ))}
          </List>
          <Paragraph>
            <Highlight>{t.sections.service.note}</Highlight>
          </Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>
            <SectionIcon><IconComponent icon={t.sections.yourResponsibilities.icon} /></SectionIcon>
            {t.sections.yourResponsibilities.title}
          </SectionTitle>
          <Paragraph>{t.sections.yourResponsibilities.content}</Paragraph>
          <List>
            {t.sections.yourResponsibilities.items.map((item: string, index: number) => (
              <ListItem key={index}>{item}</ListItem>
            ))}
          </List>
        </Section>
        
        <Section>
          <SectionTitle>
            <SectionIcon><IconComponent icon={t.sections.pricing.icon} /></SectionIcon>
            {t.sections.pricing.title}
          </SectionTitle>
          <Paragraph>{t.sections.pricing.content}</Paragraph>
          <List>
            {t.sections.pricing.items.map((item: string, index: number) => (
              <ListItem key={index}>{item}</ListItem>
            ))}
          </List>
        </Section>
        
        <Section>
          <SectionTitle>{t.sections.intellectualProperty.title}</SectionTitle>
          <Paragraph>{t.sections.intellectualProperty.content}</Paragraph>
          <List>
            {t.sections.intellectualProperty.items.map((item: string, index: number) => (
              <ListItem key={index}>{item}</ListItem>
            ))}
          </List>
        </Section>
        
        <Section>
          <SectionTitle>
            <SectionIcon><IconComponent icon={t.sections.limitations.icon} /></SectionIcon>
            {t.sections.limitations.title}
          </SectionTitle>
          <Paragraph>{t.sections.limitations.content}</Paragraph>
          <List>
            {t.sections.limitations.items.map((item: string, index: number) => (
              <ListItem key={index}>{item}</ListItem>
            ))}
          </List>
        </Section>
        
        <Section>
          <SectionTitle>{t.sections.termination.title}</SectionTitle>
          <Paragraph>{t.sections.termination.content}</Paragraph>
          <List>
            {t.sections.termination.items.map((item: string, index: number) => (
              <ListItem key={index}>{item}</ListItem>
            ))}
          </List>
        </Section>
      </Content>
    </TermsContainer>
    </InstitutionalWrapper>
  );
};

export default Terms;