interface OidcConfig {
  isConfigured: boolean;
  providerUrl: string | null;
  clientId: string | null;
  redirectUri: string | null;
  authorizationEndpoint: string | null;
  scope: string;
  responseType: string;
}

interface AppConfig {
  apiBaseUrl: string;
  oidc: OidcConfig;
}

let RETAINED_CONFIG: AppConfig = {
  apiBaseUrl: '/api',
  oidc: {
    isConfigured: false,
    providerUrl: null,
    clientId: null,
    redirectUri: null,
    authorizationEndpoint: null,
    scope: 'openid profile email',
    responseType: 'code',
  },
};

// This function MUST be called from main.tsx before the app mounts.
export function initializeAppConfig(): void {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('CRITICAL: #root element not found. App configuration failed.');
    return;
  }

  let apiBaseUrl = '/api';
  if (rootElement.dataset.apiBaseUrl) {
    apiBaseUrl = rootElement.dataset.apiBaseUrl.replace(/\/$/, '');
    console.log("Base URL is:", apiBaseUrl);
  } else {
    console.warn('API base URL not found in data attribute on #root. Falling back to "/api".');
  }

  const oidcProviderUrl = rootElement.dataset.oidcProviderUrl; // ?.replace(/\/$/, '');
  const oidcClientId = rootElement.dataset.oidcClientId;
  const oidcRedirectPath = rootElement.dataset.oidcRedirectPath || '/oidc-callback.html';

  let oidcConfig: OidcConfig = { ...RETAINED_CONFIG.oidc };

  const isOidcEffectivelyConfigured =
    oidcProviderUrl &&
    oidcClientId &&
    oidcProviderUrl !== 'YOUR_OIDC_PROVIDER_URL' &&
    oidcClientId !== 'YOUR_OIDC_CLIENT_ID';

  if (isOidcEffectivelyConfigured) {
    const redirectUri = oidcRedirectPath;

    oidcConfig = {
      isConfigured: true,
      providerUrl: oidcProviderUrl,
      clientId: oidcClientId,
      redirectUri: redirectUri,
      authorizationEndpoint: oidcProviderUrl,
      scope: 'openid profile email',
      responseType: 'code',
    };
  }

  RETAINED_CONFIG = {
    apiBaseUrl: apiBaseUrl,
    oidc: oidcConfig,
  };

  Object.freeze(RETAINED_CONFIG);
  Object.freeze(RETAINED_CONFIG.oidc);
}

export function getApiBaseUrl(): string {
  console.log("Request for base url", RETAINED_CONFIG.apiBaseUrl);
  return RETAINED_CONFIG.apiBaseUrl;
}

export function getOidcConfig(): OidcConfig {
  return RETAINED_CONFIG.oidc;
}

export function isOidcConfigured(): boolean {
  console.log("OICD", RETAINED_CONFIG.oidc.isConfigured);
  return RETAINED_CONFIG.oidc.isConfigured;
}