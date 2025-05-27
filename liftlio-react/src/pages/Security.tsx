import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaLock, FaShieldAlt, FaKey, FaServer, FaCheckCircle } from 'react-icons/fa';
import { BiPulse } from 'react-icons/bi';
import { useLanguage } from '../context/LanguageContext';
import { IconComponent } from '../utils/IconHelper';
import InstitutionalWrapper from './InstitutionalWrapper';

const SecurityContainer = styled.div`
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

const Intro = styled.p`
  font-size: 20px;
  line-height: 1.6;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 48px;
  font-weight: 500;
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

const SecurityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-top: 32px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SecurityFeature = styled.div`
  padding: 24px;
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.borderLight};
  border-radius: 16px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px ${props => props.theme.colors.shadowLarge};
  }
`;

const FeatureIcon = styled.div`
  font-size: 32px;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 16px;
`;

const FeatureTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: ${props => props.theme.colors.text.primary};
`;

const FeatureDescription = styled.p`
  font-size: 14px;
  line-height: 1.6;
  color: ${props => props.theme.colors.textSecondary};
`;

const CertificationBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: ${props => props.theme.colors.primary}20;
  color: ${props => props.theme.colors.primary};
  padding: 8px 16px;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 600;
  margin-right: 12px;
  margin-bottom: 12px;
`;

const Security: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  const content = {
    en: {
      back: "Back",
      title: "Security Center",
      intro: "Your trust is our foundation. We've built Liftlio with enterprise-grade security from day one, because your business data deserves nothing less.",
      sections: {
        infrastructure: {
          title: "Infrastructure Security",
          icon: FaServer,
          features: [
            {
              title: "Enterprise Hosting",
              description: "Hosted on AWS with 99.99% uptime SLA and automatic failover systems"
            },
            {
              title: "Global CDN",
              description: "Content delivered through CloudFlare's global network for speed and DDoS protection"
            },
            {
              title: "Isolated Environments",
              description: "Each customer's data is logically isolated with strict access controls"
            },
            {
              title: "Regular Backups",
              description: "Automated hourly backups with point-in-time recovery capabilities"
            }
          ]
        },
        dataProtection: {
          title: "Data Protection",
          icon: FaShieldAlt,
          features: [
            {
              title: "Encryption at Rest",
              description: "All data encrypted using AES-256 encryption standard"
            },
            {
              title: "Encryption in Transit",
              description: "TLS 1.3 encryption for all data transmission"
            },
            {
              title: "Zero-Knowledge Architecture",
              description: "We can't access your sensitive data even if we wanted to"
            },
            {
              title: "Data Residency",
              description: "Choose where your data is stored to meet compliance requirements"
            }
          ]
        },
        accessControl: {
          title: "Access Control",
          icon: FaKey,
          features: [
            {
              title: "OAuth 2.0",
              description: "Secure authentication through Google/YouTube without password storage"
            },
            {
              title: "Two-Factor Authentication",
              description: "Optional 2FA for additional account security"
            },
            {
              title: "API Security",
              description: "Rate limiting and API key authentication for all endpoints"
            },
            {
              title: "Session Management",
              description: "Automatic session timeout and secure token handling"
            }
          ]
        },
        compliance: {
          title: "Compliance & Certifications",
          icon: FaCheckCircle,
          content: "We maintain the highest standards of security compliance:",
          certifications: ["SOC 2 Type II", "GDPR Compliant", "CCPA Ready", "ISO 27001", "PCI DSS"]
        },
        monitoring: {
          title: "Security Monitoring",
          content: "Our security team monitors threats 24/7:",
          features: [
            "Real-time threat detection and response",
            "Regular penetration testing by third parties",
            "Automated vulnerability scanning",
            "Detailed audit logs for all activities",
            "Incident response team on standby"
          ]
        }
      }
    },
    pt: {
      back: "Voltar",
      title: "Central de Segurança",
      intro: "Sua confiança é nossa base. Construímos o Liftlio com segurança de nível empresarial desde o primeiro dia, porque seus dados comerciais merecem nada menos.",
      sections: {
        infrastructure: {
          title: "Segurança da Infraestrutura",
          icon: FaServer,
          features: [
            {
              title: "Hospedagem Empresarial",
              description: "Hospedado na AWS com SLA de 99,99% de uptime e sistemas de failover automático"
            },
            {
              title: "CDN Global",
              description: "Conteúdo entregue pela rede global da CloudFlare para velocidade e proteção DDoS"
            },
            {
              title: "Ambientes Isolados",
              description: "Dados de cada cliente logicamente isolados com controles de acesso rígidos"
            },
            {
              title: "Backups Regulares",
              description: "Backups automáticos por hora com capacidade de recuperação pontual"
            }
          ]
        },
        dataProtection: {
          title: "Proteção de Dados",
          icon: FaShieldAlt,
          features: [
            {
              title: "Criptografia em Repouso",
              description: "Todos os dados criptografados usando padrão AES-256"
            },
            {
              title: "Criptografia em Trânsito",
              description: "Criptografia TLS 1.3 para toda transmissão de dados"
            },
            {
              title: "Arquitetura Zero-Knowledge",
              description: "Não podemos acessar seus dados sensíveis mesmo se quiséssemos"
            },
            {
              title: "Residência de Dados",
              description: "Escolha onde seus dados são armazenados para atender requisitos de conformidade"
            }
          ]
        },
        accessControl: {
          title: "Controle de Acesso",
          icon: FaKey,
          features: [
            {
              title: "OAuth 2.0",
              description: "Autenticação segura via Google/YouTube sem armazenar senhas"
            },
            {
              title: "Autenticação de Dois Fatores",
              description: "2FA opcional para segurança adicional da conta"
            },
            {
              title: "Segurança de API",
              description: "Limitação de taxa e autenticação por chave API em todos endpoints"
            },
            {
              title: "Gerenciamento de Sessão",
              description: "Timeout automático de sessão e manipulação segura de tokens"
            }
          ]
        },
        compliance: {
          title: "Conformidade e Certificações",
          icon: FaCheckCircle,
          content: "Mantemos os mais altos padrões de conformidade de segurança:",
          certifications: ["SOC 2 Type II", "Conformidade LGPD", "CCPA Ready", "ISO 27001", "PCI DSS"]
        },
        monitoring: {
          title: "Monitoramento de Segurança",
          content: "Nossa equipe de segurança monitora ameaças 24/7:",
          features: [
            "Detecção e resposta a ameaças em tempo real",
            "Testes de penetração regulares por terceiros",
            "Varredura automatizada de vulnerabilidades",
            "Logs de auditoria detalhados para todas atividades",
            "Equipe de resposta a incidentes em prontidão"
          ]
        }
      }
    }
  };
  
  const t = content[language];
  
  return (
    <InstitutionalWrapper>
      <SecurityContainer>
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
        <Intro>{t.intro}</Intro>
        
        <Section>
          <SectionTitle>
            <SectionIcon><IconComponent icon={t.sections.infrastructure.icon} /></SectionIcon>
            {t.sections.infrastructure.title}
          </SectionTitle>
          <SecurityGrid>
            {t.sections.infrastructure.features.map((feature: any, index: number) => (
              <SecurityFeature key={index}>
                <FeatureIcon><IconComponent icon={FaServer} /></FeatureIcon>
                <FeatureTitle>{feature.title}</FeatureTitle>
                <FeatureDescription>{feature.description}</FeatureDescription>
              </SecurityFeature>
            ))}
          </SecurityGrid>
        </Section>
        
        <Section>
          <SectionTitle>
            <SectionIcon><IconComponent icon={t.sections.dataProtection.icon} /></SectionIcon>
            {t.sections.dataProtection.title}
          </SectionTitle>
          <SecurityGrid>
            {t.sections.dataProtection.features.map((feature: any, index: number) => (
              <SecurityFeature key={index}>
                <FeatureIcon><IconComponent icon={FaLock} /></FeatureIcon>
                <FeatureTitle>{feature.title}</FeatureTitle>
                <FeatureDescription>{feature.description}</FeatureDescription>
              </SecurityFeature>
            ))}
          </SecurityGrid>
        </Section>
        
        <Section>
          <SectionTitle>
            <SectionIcon><IconComponent icon={t.sections.accessControl.icon} /></SectionIcon>
            {t.sections.accessControl.title}
          </SectionTitle>
          <SecurityGrid>
            {t.sections.accessControl.features.map((feature: any, index: number) => (
              <SecurityFeature key={index}>
                <FeatureIcon><IconComponent icon={FaKey} /></FeatureIcon>
                <FeatureTitle>{feature.title}</FeatureTitle>
                <FeatureDescription>{feature.description}</FeatureDescription>
              </SecurityFeature>
            ))}
          </SecurityGrid>
        </Section>
        
        <Section>
          <SectionTitle>
            <SectionIcon><IconComponent icon={t.sections.compliance.icon} /></SectionIcon>
            {t.sections.compliance.title}
          </SectionTitle>
          <Paragraph>{t.sections.compliance.content}</Paragraph>
          <div style={{ marginTop: '24px' }}>
            {t.sections.compliance.certifications.map((cert: string, index: number) => (
              <CertificationBadge key={index}>
                <IconComponent icon={FaCheckCircle} />
                {cert}
              </CertificationBadge>
            ))}
          </div>
        </Section>
        
        <Section>
          <SectionTitle>{t.sections.monitoring.title}</SectionTitle>
          <Paragraph>{t.sections.monitoring.content}</Paragraph>
          <ul style={{ marginTop: '16px', paddingLeft: '24px' }}>
            {t.sections.monitoring.features.map((feature: string, index: number) => (
              <li key={index} style={{ 
                fontSize: '16px', 
                lineHeight: '1.8', 
                color: 'var(--text-secondary)',
                marginBottom: '8px'
              }}>
                {feature}
              </li>
            ))}
          </ul>
        </Section>
      </Content>
    </SecurityContainer>
    </InstitutionalWrapper>
  );
};

export default Security;