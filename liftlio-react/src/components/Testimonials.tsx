import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaChevronLeft, FaChevronRight, FaQuoteLeft, FaStar } from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  avatar: string;
}

interface TestimonialsProps {
  language?: 'pt' | 'en';
}

const Container = styled.section`
  padding: 80px 20px;
  background: ${props => props.theme.name === 'dark' 
    ? 'linear-gradient(180deg, rgba(20, 20, 25, 0.9) 0%, rgba(30, 30, 35, 0.9) 100%)'
    : 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)'};
  position: relative;
  overflow: hidden;
`;

const Wrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 60px;
`;

const Title = styled.h2`
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #2d3e50 0%, #00a9db 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.25rem;
  color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#6c757d'};
  max-width: 600px;
  margin: 0 auto;
`;

const CarouselContainer = styled.div`
  position: relative;
  padding: 0 60px;
  
  @media (max-width: 768px) {
    padding: 0 40px;
  }
`;

const CarouselTrack = styled.div<{ translateX: number }>`
  display: flex;
  transition: transform 0.5s ease-in-out;
  transform: translateX(${props => props.translateX}%);
  gap: 30px;
`;

const TestimonialCard = styled.div`
  min-width: calc(33.333% - 20px);
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(30, 30, 35, 0.8)'
    : 'white'};
  border-radius: 20px;
  padding: 30px;
  box-shadow: ${props => props.theme.name === 'dark'
    ? '0 10px 30px rgba(0, 0, 0, 0.5)'
    : '0 10px 30px rgba(0, 0, 0, 0.1)'};
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(0, 0, 0, 0.05)'};
  position: relative;
  
  @media (max-width: 1024px) {
    min-width: calc(50% - 15px);
  }
  
  @media (max-width: 768px) {
    min-width: 100%;
  }
`;

const QuoteIcon = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  font-size: 2rem;
  color: ${props => props.theme.name === 'dark' ? 'rgba(0, 169, 219, 0.2)' : 'rgba(0, 169, 219, 0.1)'};
`;

const TestimonialContent = styled.p`
  font-size: 1.1rem;
  line-height: 1.8;
  color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#495057'};
  margin-bottom: 20px;
  font-style: italic;
`;

const AuthorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
`;

const Avatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00a9db, #0066cc);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
  font-weight: bold;
`;

const AuthorDetails = styled.div`
  flex: 1;
`;

const AuthorName = styled.h4`
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  color: ${props => props.theme.name === 'dark' ? 'white' : '#2d3e50'};
`;

const AuthorRole = styled.p`
  font-size: 0.9rem;
  color: ${props => props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#6c757d'};
  margin: 0;
`;

const Rating = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 15px;
`;

const StarIcon = styled.div`
  color: #ffc107;
  font-size: 1.2rem;
  display: inline-block;
`;

const NavButton = styled.button<{ direction: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${props => props.direction === 'left' ? 'left: 0' : 'right: 0'};
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(0, 169, 219, 0.8)'
    : '#00a9db'};
  color: white;
  border: none;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  
  &:hover {
    background: ${props => props.theme.name === 'dark'
      ? '#00a9db'
      : '#0088cc'};
    transform: translateY(-50%) scale(1.1);
  }
  
  &:active {
    transform: translateY(-50%) scale(0.95);
  }
  
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
  }
`;

const Indicators = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 40px;
`;

const Indicator = styled.button<{ active: boolean }>`
  width: ${props => props.active ? '30px' : '10px'};
  height: 10px;
  border-radius: 5px;
  border: none;
  background: ${props => props.active
    ? '#00a9db'
    : props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.active
      ? '#0088cc'
      : props.theme.name === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)'};
  }
`;

const testimonialsData = {
  pt: [
    {
      id: 1,
      name: "Carlos Silva",
      role: "CEO",
      company: "TechStartup Brasil",
      content: "O Liftlio transformou completamente nossa estratégia de marketing. Encontramos leads que nunca imaginaríamos alcançar. ROI de 450% em apenas 3 meses!",
      rating: 5,
      avatar: "CS"
    },
    {
      id: 2,
      name: "Ana Rodrigues",
      role: "Diretora de Marketing",
      company: "E-commerce Plus",
      content: "Finalmente uma ferramenta que entende o mercado brasileiro! A identificação de menções é impressionante. Aumentamos nossas vendas em 280%.",
      rating: 5,
      avatar: "AR"
    },
    {
      id: 3,
      name: "Roberto Oliveira",
      role: "Fundador",
      company: "Digital Agency Pro",
      content: "Uso o Liftlio para todos os meus clientes. A economia de tempo é brutal - o que levava dias agora leva minutos. Melhor investimento do ano!",
      rating: 5,
      avatar: "RO"
    },
    {
      id: 4,
      name: "Mariana Costa",
      role: "Growth Manager",
      company: "SaaS Solutions",
      content: "Os insights gerados pelo Liftlio são ouro puro. Descobrimos nichos inexplorados e duplicamos nossa base de clientes em 6 meses.",
      rating: 5,
      avatar: "MC"
    },
    {
      id: 5,
      name: "Pedro Almeida",
      role: "CMO",
      company: "Fintech Innovations",
      content: "A precisão na identificação de oportunidades é surreal. Cada real investido no Liftlio retorna multiplicado. Indispensável!",
      rating: 5,
      avatar: "PA"
    },
    {
      id: 6,
      name: "Juliana Santos",
      role: "Head de Vendas",
      company: "B2B Masters",
      content: "Revolucionou nossa prospecção. Encontramos leads qualificados diariamente. Taxa de conversão aumentou 320%. Simplesmente incrível!",
      rating: 5,
      avatar: "JS"
    },
    {
      id: 7,
      name: "Fernando Lima",
      role: "Diretor Comercial",
      company: "Tech Solutions BR",
      content: "O Liftlio paga o investimento na primeira semana. Identificamos oportunidades que nossos concorrentes nem sonham em alcançar.",
      rating: 5,
      avatar: "FL"
    },
    {
      id: 8,
      name: "Beatriz Ferreira",
      role: "Gerente de Produto",
      company: "App Developers",
      content: "Feedback em tempo real dos usuários! Melhoramos nosso produto baseado em insights reais. Downloads aumentaram 400%.",
      rating: 5,
      avatar: "BF"
    },
    {
      id: 9,
      name: "Ricardo Mendes",
      role: "Empreendedor",
      company: "Startup Valley",
      content: "De 0 a 1000 clientes em 4 meses usando o Liftlio. A ferramenta é um divisor de águas para qualquer negócio digital.",
      rating: 5,
      avatar: "RM"
    },
    {
      id: 10,
      name: "Camila Souza",
      role: "VP de Marketing",
      company: "Retail Giants",
      content: "ROI comprovado! Cada campanha baseada nos dados do Liftlio supera as anteriores. Crescimento consistente mês após mês.",
      rating: 5,
      avatar: "CS"
    },
    {
      id: 11,
      name: "Thiago Barros",
      role: "Head de Growth",
      company: "EdTech Brasil",
      content: "Identificamos influenciadores micro e nano perfeitos para nosso nicho. CAC reduziu 65%. Resultados extraordinários!",
      rating: 5,
      avatar: "TB"
    },
    {
      id: 12,
      name: "Patricia Gomes",
      role: "Diretora Digital",
      company: "Fashion Brand",
      content: "O Liftlio nos conectou com nosso público de forma única. Engajamento triplicou, vendas dobraram. Ferramenta essencial!",
      rating: 5,
      avatar: "PG"
    },
    {
      id: 13,
      name: "Lucas Martins",
      role: "CEO",
      company: "Health Tech Co",
      content: "Monitoramento em tempo real salvou nossa reputação várias vezes. Respondemos rapidamente a qualquer menção. Invaluable!",
      rating: 5,
      avatar: "LM"
    },
    {
      id: 14,
      name: "Daniela Rocha",
      role: "Consultora",
      company: "Business Consulting",
      content: "Recomendo o Liftlio para todos os meus clientes. Os resultados falam por si. Crescimento garantido e mensurável.",
      rating: 5,
      avatar: "DR"
    },
    {
      id: 15,
      name: "Gabriel Torres",
      role: "Fundador",
      company: "AI Startup",
      content: "A inteligência do Liftlio é impressionante. Encontra oportunidades onde outros nem procuram. Nosso crescimento explodiu!",
      rating: 5,
      avatar: "GT"
    }
  ],
  en: [
    {
      id: 1,
      name: "John Smith",
      role: "CEO",
      company: "TechVentures USA",
      content: "Liftlio completely transformed our marketing strategy. We found leads we never imagined reaching. 450% ROI in just 3 months!",
      rating: 5,
      avatar: "JS"
    },
    {
      id: 2,
      name: "Sarah Johnson",
      role: "Marketing Director",
      company: "E-commerce Global",
      content: "Finally a tool that understands modern marketing! The mention identification is impressive. We increased sales by 280%.",
      rating: 5,
      avatar: "SJ"
    },
    {
      id: 3,
      name: "Michael Brown",
      role: "Founder",
      company: "Digital Agency Pro",
      content: "I use Liftlio for all my clients. The time savings is brutal - what took days now takes minutes. Best investment of the year!",
      rating: 5,
      avatar: "MB"
    },
    {
      id: 4,
      name: "Emily Davis",
      role: "Growth Manager",
      company: "SaaS Solutions",
      content: "The insights generated by Liftlio are pure gold. We discovered untapped niches and doubled our customer base in 6 months.",
      rating: 5,
      avatar: "ED"
    },
    {
      id: 5,
      name: "David Wilson",
      role: "CMO",
      company: "Fintech Innovations",
      content: "The precision in identifying opportunities is surreal. Every dollar invested in Liftlio returns multiplied. Indispensable!",
      rating: 5,
      avatar: "DW"
    },
    {
      id: 6,
      name: "Jessica Taylor",
      role: "Head of Sales",
      company: "B2B Masters",
      content: "Revolutionized our prospecting. We find qualified leads daily. Conversion rate increased 320%. Simply incredible!",
      rating: 5,
      avatar: "JT"
    },
    {
      id: 7,
      name: "Robert Anderson",
      role: "Commercial Director",
      company: "Tech Solutions Inc",
      content: "Liftlio pays for itself in the first week. We identify opportunities our competitors don't even dream of reaching.",
      rating: 5,
      avatar: "RA"
    },
    {
      id: 8,
      name: "Lisa Martinez",
      role: "Product Manager",
      company: "App Developers",
      content: "Real-time user feedback! We improved our product based on real insights. Downloads increased 400%.",
      rating: 5,
      avatar: "LM"
    },
    {
      id: 9,
      name: "William Thomas",
      role: "Entrepreneur",
      company: "Startup Valley",
      content: "From 0 to 1000 customers in 4 months using Liftlio. The tool is a game-changer for any digital business.",
      rating: 5,
      avatar: "WT"
    },
    {
      id: 10,
      name: "Amanda White",
      role: "VP of Marketing",
      company: "Retail Giants",
      content: "Proven ROI! Every campaign based on Liftlio data outperforms the previous ones. Consistent growth month after month.",
      rating: 5,
      avatar: "AW"
    },
    {
      id: 11,
      name: "James Garcia",
      role: "Head of Growth",
      company: "EdTech Global",
      content: "We identified perfect micro and nano influencers for our niche. CAC reduced by 65%. Extraordinary results!",
      rating: 5,
      avatar: "JG"
    },
    {
      id: 12,
      name: "Patricia Miller",
      role: "Digital Director",
      company: "Fashion Brand",
      content: "Liftlio connected us with our audience uniquely. Engagement tripled, sales doubled. Essential tool!",
      rating: 5,
      avatar: "PM"
    },
    {
      id: 13,
      name: "Christopher Lee",
      role: "CEO",
      company: "Health Tech Co",
      content: "Real-time monitoring saved our reputation several times. We respond quickly to any mention. Invaluable!",
      rating: 5,
      avatar: "CL"
    },
    {
      id: 14,
      name: "Jennifer Clark",
      role: "Consultant",
      company: "Business Consulting",
      content: "I recommend Liftlio to all my clients. The results speak for themselves. Guaranteed and measurable growth.",
      rating: 5,
      avatar: "JC"
    },
    {
      id: 15,
      name: "Daniel Rodriguez",
      role: "Founder",
      company: "AI Startup",
      content: "Liftlio's intelligence is impressive. It finds opportunities where others don't even look. Our growth exploded!",
      rating: 5,
      avatar: "DR"
    }
  ]
};

const Testimonials: React.FC<TestimonialsProps> = ({ language = 'pt' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(3);
  const testimonials = testimonialsData[language];

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setItemsPerView(1);
      } else if (window.innerWidth <= 1024) {
        setItemsPerView(2);
      } else {
        setItemsPerView(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.ceil(testimonials.length / itemsPerView) - 1;

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : maxIndex));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev < maxIndex ? prev + 1 : 0));
  };

  const handleIndicatorClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <Container>
      <Wrapper>
        <Header>
          <Title>
            {language === 'pt' 
              ? 'O Que Nossos Clientes Dizem' 
              : 'What Our Clients Say'}
          </Title>
          <Subtitle>
            {language === 'pt'
              ? 'Histórias reais de sucesso com resultados comprovados'
              : 'Real success stories with proven results'}
          </Subtitle>
        </Header>

        <CarouselContainer>
          <NavButton direction="left" onClick={handlePrev}>
            <IconComponent icon={FaChevronLeft} />
          </NavButton>

          <CarouselTrack translateX={-currentIndex * 100}>
            {testimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.id}>
                <QuoteIcon>
                  <IconComponent icon={FaQuoteLeft} />
                </QuoteIcon>
                <Rating>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarIcon key={i}>
                      <IconComponent icon={FaStar} />
                    </StarIcon>
                  ))}
                </Rating>
                <TestimonialContent>"{testimonial.content}"</TestimonialContent>
                <AuthorInfo>
                  <Avatar>{testimonial.avatar}</Avatar>
                  <AuthorDetails>
                    <AuthorName>{testimonial.name}</AuthorName>
                    <AuthorRole>{testimonial.role} - {testimonial.company}</AuthorRole>
                  </AuthorDetails>
                </AuthorInfo>
              </TestimonialCard>
            ))}
          </CarouselTrack>

          <NavButton direction="right" onClick={handleNext}>
            <IconComponent icon={FaChevronRight} />
          </NavButton>
        </CarouselContainer>

        <Indicators>
          {[...Array(Math.ceil(testimonials.length / itemsPerView))].map((_, index) => (
            <Indicator
              key={index}
              active={index === currentIndex}
              onClick={() => handleIndicatorClick(index)}
            />
          ))}
        </Indicators>
      </Wrapper>
    </Container>
  );
};

export default Testimonials;