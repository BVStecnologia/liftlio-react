import { useState, useCallback } from 'react';
import { createRoot, Root } from 'react-dom/client';
import GlobalLoader from '../components/GlobalLoader';
import { ThemeProvider } from 'styled-components';
import { useTheme } from '../context/ThemeContext';

interface LoaderOptions {
  message?: string;
  subMessage?: string;
  theme?: 'light' | 'dark';
}

// Store root instances to properly cleanup
const rootMap = new Map<string, Root>();

export const useGlobalLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loaderOptions, setLoaderOptions] = useState<LoaderOptions>({});

  const showLoader = useCallback((options?: LoaderOptions) => {
    setLoaderOptions(options || {});
    setIsLoading(true);

    // Create container if it doesn't exist
    let container = document.getElementById('global-loader-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'global-loader-container';
      document.body.appendChild(container);
    }

    // Get theme from styled-components instead of creating new theme objects
    const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

    // Create or get root
    let root = rootMap.get('global-loader');
    if (!root) {
      root = createRoot(container);
      rootMap.set('global-loader', root);
    }

    // Render loader
    root.render(
      <div data-theme={theme}>
        <GlobalLoader 
          message={options?.message}
          subMessage={options?.subMessage}
          fullScreen={true}
        />
      </div>
    );
  }, []);

  const hideLoader = useCallback(() => {
    setIsLoading(false);
    const root = rootMap.get('global-loader');
    if (root) {
      root.unmount();
      rootMap.delete('global-loader');
    }
    const container = document.getElementById('global-loader-container');
    if (container) {
      container.remove();
    }
  }, []);

  return {
    isLoading,
    showLoader,
    hideLoader
  };
};

// Global loader instance for use outside of React components
class GlobalLoaderService {
  private static instance: GlobalLoaderService;
  private root: Root | null = null;
  
  static getInstance(): GlobalLoaderService {
    if (!GlobalLoaderService.instance) {
      GlobalLoaderService.instance = new GlobalLoaderService();
    }
    return GlobalLoaderService.instance;
  }

  show(options?: LoaderOptions) {
    let container = document.getElementById('global-loader-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'global-loader-container';
      document.body.appendChild(container);
    }

    const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

    if (!this.root) {
      this.root = createRoot(container);
    }

    this.root.render(
      <div data-theme={theme}>
        <GlobalLoader 
          message={options?.message}
          subMessage={options?.subMessage}
          fullScreen={true}
        />
      </div>
    );
  }

  hide() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    const container = document.getElementById('global-loader-container');
    if (container) {
      container.remove();
    }
  }
}

export const globalLoader = GlobalLoaderService.getInstance();