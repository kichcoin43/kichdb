declare global {
  interface Window {
    electronAPI?: {
      getServerUrl: () => string;
      getWsUrl: () => string;
    };
  }
}

export const getApiUrl = (): string => {
  if (window.electronAPI) {
    return window.electronAPI.getServerUrl();
  }
  return '/api';
};

export const getWsUrl = (): string => {
  if (window.electronAPI) {
    return window.electronAPI.getWsUrl();
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
};

export const apiUrl = (path: string): string => {
  const base = getApiUrl();
  if (base.endsWith('/api')) {
    return `${base}${path}`;
  }
  return `${base}/api${path}`;
};
