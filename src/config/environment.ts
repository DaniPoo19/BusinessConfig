/**
 * Configuración de Entorno — ConfigAllManager
 */

interface EnvironmentConfig {
  apiUrl: string;
  appMode: 'development' | 'production';
  isDevelopment: boolean;
  isProduction: boolean;
}

function getApiUrl(): string {
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl && typeof envApiUrl === 'string' && envApiUrl.trim() !== '') {
    return envApiUrl.replace(/\/+$/, '');
  }
  return '';
}

function getAppMode(): 'development' | 'production' {
  const mode = import.meta.env.VITE_APP_MODE;
  if (mode === 'production') return 'production';
  return import.meta.env.MODE === 'production' ? 'production' : 'development';
}

export const env: EnvironmentConfig = {
  apiUrl: getApiUrl(),
  appMode: getAppMode(),
  isDevelopment: getAppMode() === 'development',
  isProduction: getAppMode() === 'production',
};

if (import.meta.env.DEV) {
  console.log('[Config] Environment:', env.appMode);
  console.log('[Config] API URL:', env.apiUrl || '(using proxy)');
}
