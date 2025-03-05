import React, { ReactElement } from 'react';
import { IconType } from 'react-icons';

// Solução simples para evitar problemas com tipos
export const IconComponent = ({ icon }: { icon: IconType }): ReactElement => {
  if (!icon) return <></>;
  return React.createElement('span', {}, icon({}));
};

// Helper para renderizar ícones de forma segura
export const renderIcon = (Icon: IconType | undefined): ReactElement | null => {
  if (!Icon) return null;
  // @ts-ignore - ignorar verificação de tipo para contornar limites do TS
  return React.createElement(Icon);
}