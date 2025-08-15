import React from 'react';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

const Indicator = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #00ff00;
  border-radius: 50%;
  box-shadow: 0 0 10px #00ff00;
  animation: ${pulse} 2s infinite;
`;

export default function PulseIndicator() {
  return <Indicator />;
}