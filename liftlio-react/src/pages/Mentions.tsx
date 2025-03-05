import React, { useState } from 'react';
import styled from 'styled-components';
import Card from '../components/Card';
import { IconContext } from 'react-icons';
import { FaHeart, FaPencilAlt } from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';

const PageTitle = styled.h1`
  font-size: ${props => props.theme.fontSizes['2xl']};
  font-weight: ${props => props.theme.fontWeights.bold};
  margin-bottom: 20px;
  color: ${props => props.theme.colors.text};
`;

const TabContainer = styled.div`
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
`;

const Tab = styled.button<{ active: boolean }>`
  padding: 12px 24px;
  background: ${props => props.active ? props.theme.colors.white : props.theme.colors.lightGrey};
  border: none;
  border-radius: ${props => props.theme.radius.md} ${props => props.theme.radius.md} 0 0;
  font-weight: ${props => props.active ? props.theme.fontWeights.semiBold : props.theme.fontWeights.normal};
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.darkGrey};
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.active ? props.theme.colors.white : '#e0e0e0'};
  }
`;

const MentionsTable = styled.div`
  width: 100%;
  border-spacing: 0;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 2fr 3fr 1fr;
  padding: 15px;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
  color: ${props => props.theme.colors.darkGrey};
  font-weight: ${props => props.theme.fontWeights.semiBold};
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 2fr 3fr 1fr;
  padding: 15px;
  border-bottom: 1px solid ${props => props.theme.colors.lightGrey};
  align-items: center;
  
  &:hover {
    background-color: ${props => props.theme.colors.lightGrey};
  }
`;

const TableCell = styled.div`
  display: flex;
  align-items: center;
`;

const VideoThumbnail = styled.div`
  width: 120px;
  height: 70px;
  background-color: #000;
  border-radius: ${props => props.theme.radius.sm};
  overflow: hidden;
  margin-right: 15px;
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 0;
    height: 0;
    border-top: 10px solid transparent;
    border-left: 20px solid white;
    border-bottom: 10px solid transparent;
    opacity: 0.8;
  }
`;

const VideoInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const VideoTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.md};
  margin-bottom: 5px;
  color: ${props => props.theme.colors.text};
`;

const VideoStats = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  color: ${props => props.theme.colors.darkGrey};
  font-size: ${props => props.theme.fontSizes.sm};
`;

const CommentInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const CommentAuthor = styled.div`
  font-weight: ${props => props.theme.fontWeights.semiBold};
  margin-bottom: 5px;
`;

const CommentDate = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.darkGrey};
  margin-bottom: 10px;
`;

const CommentText = styled.div`
  font-size: ${props => props.theme.fontSizes.sm};
  line-height: 1.4;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.darkGrey};
  cursor: pointer;
  padding: 5px;
  margin-left: 5px;
  border-radius: ${props => props.theme.radius.sm};
  transition: all 0.2s ease;
  
  &:hover {
    color: ${props => props.theme.colors.primary};
    background-color: rgba(0, 0, 0, 0.05);
  }
`;

const ActionsCell = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const LedScoreBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: ${props => props.color};
  color: white;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

// Sample data
const mentionsData = [
  {
    id: 1,
    video: {
      thumbnail: 'https://via.placeholder.com/120x70',
      title: 'Get Paid $847 Per Day With Google Books Using AI (Passive Income)',
      views: 30602,
      likes: 1788
    },
    type: 'Led score',
    score: 70,
    scoreColor: '#4caf50',
    comment: {
      author: '@yuliaklymenko4390',
      date: '27/11/2024 21:01',
      text: 'Just when I thought I knew everything about AI, Aliest comes in with methods that blew my mind. Seriously, check them out if you haven\'t yet.'
    },
    response: {
      text: 'Speaking of AI tools, I\'ve been using Humanlike Writer for my affiliate content and it\'s been a game changer. Their AI actually writes like a real person.',
      date: 'Post date:'
    }
  },
  {
    id: 2,
    video: {
      thumbnail: 'https://via.placeholder.com/120x70',
      title: 'How I Make $21,972/Month With AI Affiliate Marketing (Full Tutorial)',
      views: 73495,
      likes: 3548
    },
    type: 'Led score',
    score: 90,
    scoreColor: '#4caf50',
    comment: {
      author: '@bcpl2111',
      date: '25/11/2024 17:49',
      text: 'Hey Sara! There are two courses you share, which is the best to start with? What are the difference between both? Thank you!'
    },
    response: {
      text: 'While looking for good content tools, I discovered Humanlike Writer which has been amazing for creating genuine-sounding affiliate content. You can try',
      date: 'Post date:'
    }
  }
];

const Mentions: React.FC = () => {
  const [activeTab, setActiveTab] = useState('posted');
  
  const renderIcon = (Icon: any) => {
    return <IconComponent icon={Icon} />;
  };
  
  return (
    <IconContext.Provider value={{ className: 'react-icons' }}>
      <div>
        <PageTitle>Mentions</PageTitle>
        
        <TabContainer>
          <Tab active={activeTab === 'scheduled'} onClick={() => setActiveTab('scheduled')}>
            Scheduled
          </Tab>
          <Tab active={activeTab === 'posted'} onClick={() => setActiveTab('posted')}>
            Posted
          </Tab>
          <Tab active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')}>
            Favorites
          </Tab>
        </TabContainer>
        
        <Card padding="0">
          <MentionsTable>
            <TableHeader>
              <TableCell>Video</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Comment</TableCell>
              <TableCell>Response</TableCell>
              <TableCell></TableCell>
            </TableHeader>
            
            {mentionsData.map(mention => (
              <TableRow key={mention.id}>
                <TableCell>
                  <VideoThumbnail>
                    <img src={mention.video.thumbnail} alt={mention.video.title} />
                  </VideoThumbnail>
                  <VideoInfo>
                    <VideoTitle>{mention.video.title}</VideoTitle>
                    <VideoStats>
                      <span>{mention.video.likes} likes</span>
                      <span>{mention.video.views.toLocaleString()} views</span>
                    </VideoStats>
                  </VideoInfo>
                </TableCell>
                
                <TableCell>
                  {mention.type === 'Led score' && (
                    <LedScoreBadge color={mention.scoreColor}>
                      {mention.score}%
                    </LedScoreBadge>
                  )}
                </TableCell>
                
                <TableCell>
                  <CommentInfo>
                    <CommentAuthor>Author: {mention.comment.author}</CommentAuthor>
                    <CommentDate>Published: {mention.comment.date}</CommentDate>
                    <CommentText>Comment: {mention.comment.text}</CommentText>
                  </CommentInfo>
                </TableCell>
                
                <TableCell>
                  <CommentInfo>
                    <CommentText>{mention.response.text}</CommentText>
                    <CommentDate>{mention.response.date}</CommentDate>
                  </CommentInfo>
                </TableCell>
                
                <ActionsCell>
                  <ActionButton title="Add to favorites">
                    {renderIcon(FaHeart)}
                  </ActionButton>
                  <ActionButton title="Edit response">
                    {renderIcon(FaPencilAlt)}
                  </ActionButton>
                </ActionsCell>
              </TableRow>
            ))}
          </MentionsTable>
        </Card>
      </div>
    </IconContext.Provider>
  );
};

export default Mentions;