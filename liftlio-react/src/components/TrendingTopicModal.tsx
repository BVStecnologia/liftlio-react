import React from 'react';
import styled from 'styled-components';
import { X, TrendingUp, Users, Globe, Hash } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface TrendingTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: {
    topic?: string;
    name?: string;
    volume: string;
    growth: string;
    status: string;
    category: string;
    sentiment: string;
    keywords: string[];
    geographic_distribution: Record<string, number>;
    age_demographics: Record<string, number>;
  } | null;
}

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  display: ${props => props.isOpen ? 'flex' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: ${props => props.theme.colors.background};
  border-radius: 16px;
  padding: 32px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.theme.colors.bg.secondary};
    color: ${props => props.theme.colors.text.primary};
  }
`;

const Header = styled.div`
  margin-bottom: 24px;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin-bottom: 8px;
`;

const CategoryBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => props.theme.colors.primary}20;
  color: ${props => props.theme.colors.primary};
  margin-right: 8px;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const MetricCard = styled.div`
  background: ${props => props.theme.colors.bg.secondary};
  padding: 16px;
  border-radius: 12px;
  text-align: center;
`;

const MetricLabel = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 4px;
`;

const MetricValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const KeywordsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Keyword = styled.span`
  padding: 6px 12px;
  background: ${props => props.theme.colors.bg.secondary};
  border-radius: 20px;
  font-size: 14px;
  color: ${props => props.theme.colors.text};
  border: 1px solid ${props => props.theme.colors.border};
`;

const DemographicsGrid = styled.div`
  display: grid;
  gap: 8px;
`;

const DemographicBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const DemographicLabel = styled.span`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
  min-width: 60px;
`;

const DemographicProgress = styled.div`
  flex: 1;
  height: 24px;
  background: ${props => props.theme.colors.bg.secondary};
  border-radius: 12px;
  overflow: hidden;
  position: relative;
`;

const DemographicFill = styled.div<{ width: number }>`
  width: ${props => props.width}%;
  height: 100%;
  background: linear-gradient(90deg, ${props => props.theme.colors.primary}, ${props => props.theme.colors.accent});
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  color: white;
  font-size: 12px;
  font-weight: 600;
`;

export const TrendingTopicModal: React.FC<TrendingTopicModalProps> = ({ isOpen, onClose, topic }) => {
  const { language } = useLanguage();

  console.log('TrendingTopicModal - topic:', topic, 'isOpen:', isOpen);
  
  if (!topic || !isOpen) return null;
  
  // Extra safety check
  if (!topic.volume || !topic.growth) {
    console.error('Topic missing required fields:', topic);
    return null;
  }

  const translations = {
    pt: {
      volume: 'Volume',
      growth: 'Crescimento',
      sentiment: 'Sentimento',
      keywords: 'Palavras-chave',
      demographics: 'Demografia por Idade',
      geographic: 'Distribuição Geográfica'
    },
    en: {
      volume: 'Volume',
      growth: 'Growth',
      sentiment: 'Sentiment',
      keywords: 'Keywords',
      demographics: 'Age Demographics',
      geographic: 'Geographic Distribution'
    }
  };

  const labels = translations[language as 'pt' | 'en'] || translations.en;

  return (
    <ModalOverlay isOpen={isOpen} onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>
          <X size={20} />
        </CloseButton>

        <Header>
          <Title>{topic.name || topic.topic}</Title>
          <CategoryBadge>{topic.category}</CategoryBadge>
          <CategoryBadge>{topic.status}</CategoryBadge>
        </Header>

        <MetricsGrid>
          <MetricCard>
            <MetricLabel>{labels.volume}</MetricLabel>
            <MetricValue>{topic.volume}</MetricValue>
          </MetricCard>
          <MetricCard>
            <MetricLabel>{labels.growth}</MetricLabel>
            <MetricValue style={{ color: '#10b981' }}>{topic.growth}</MetricValue>
          </MetricCard>
          <MetricCard>
            <MetricLabel>{labels.sentiment}</MetricLabel>
            <MetricValue>{topic.sentiment}</MetricValue>
          </MetricCard>
        </MetricsGrid>

        {topic.keywords && topic.keywords.length > 0 && (
          <Section>
            <SectionTitle>
              <Hash size={16} />
              {labels.keywords}
            </SectionTitle>
            <KeywordsList>
              {topic.keywords.map((keyword, index) => (
                <Keyword key={index}>{keyword}</Keyword>
              ))}
            </KeywordsList>
          </Section>
        )}

        {topic.age_demographics && Object.keys(topic.age_demographics).length > 0 && (
          <Section>
            <SectionTitle>
              <Users size={16} />
              {labels.demographics}
            </SectionTitle>
            <DemographicsGrid>
              {Object.entries(topic.age_demographics).map(([age, percentage]) => (
                <DemographicBar key={age}>
                  <DemographicLabel>{age}</DemographicLabel>
                  <DemographicProgress>
                    <DemographicFill width={percentage * 100}>
                      {Math.round(percentage * 100)}%
                    </DemographicFill>
                  </DemographicProgress>
                </DemographicBar>
              ))}
            </DemographicsGrid>
          </Section>
        )}

        {topic.geographic_distribution && Object.keys(topic.geographic_distribution).length > 0 && (
          <Section>
            <SectionTitle>
              <Globe size={16} />
              {labels.geographic}
            </SectionTitle>
            <KeywordsList>
              {Object.entries(topic.geographic_distribution).map(([region, count]) => (
                <Keyword key={region}>
                  {region}: {count}
                </Keyword>
              ))}
            </KeywordsList>
          </Section>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};