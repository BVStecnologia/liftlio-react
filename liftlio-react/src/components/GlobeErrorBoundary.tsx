import React, { Component, ErrorInfo, ReactNode } from 'react';
import GlobeFallback from './GlobeFallback';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class GlobeErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Globe component error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return <GlobeFallback />;
    }

    return this.props.children;
  }
}