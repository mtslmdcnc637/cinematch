/// <reference types="vite/client" />

interface Window {
  gtag?: (...args: any[]) => void;
  ttq?: {
    track: (event: string, params?: Record<string, any>) => void;
    page: () => void;
    identify: (id: string, params?: Record<string, any>) => void;
    [key: string]: any;
  };
}
