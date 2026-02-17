import Constants from 'expo-constants';

export interface RuntimeConfig {
  odooServerUrl: string;
  odooDatabase: string;
  odooUsername: string;
  odooApiKey: string;
  openAiApiKey: string;
}

function readFromExpoConfig(key: keyof RuntimeConfig): string {
  const extra = Constants.expoConfig?.extra as Partial<RuntimeConfig> | undefined;
  const easConfigExtra = (Constants.manifest2 as any)?.extra?.expoClient?.extra as
    | Partial<RuntimeConfig>
    | undefined;

  return extra?.[key] || easConfigExtra?.[key] || '';
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    odooServerUrl:
      process.env.EXPO_PUBLIC_ODOO_SERVER_URL ||
      process.env.ODOO_SERVER_URL ||
      readFromExpoConfig('odooServerUrl'),
    odooDatabase:
      process.env.EXPO_PUBLIC_ODOO_DATABASE ||
      process.env.ODOO_DATABASE ||
      readFromExpoConfig('odooDatabase'),
    odooUsername:
      process.env.EXPO_PUBLIC_ODOO_USERNAME ||
      process.env.ODOO_USERNAME ||
      readFromExpoConfig('odooUsername'),
    odooApiKey:
      process.env.EXPO_PUBLIC_ODOO_API_KEY ||
      process.env.ODOO_API_KEY ||
      readFromExpoConfig('odooApiKey'),
    openAiApiKey:
      process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      readFromExpoConfig('openAiApiKey'),
  };
}
