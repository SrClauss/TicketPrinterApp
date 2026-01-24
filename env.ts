import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type EnvName = 'development' | 'production';

export const ENV_KEY = 'api_env';

// Returns a base URL suited for the current platform when in development.
export const getApiBaseUrl = (env: EnvName) => {
  if (env === 'development') {
    // Use project dev server IP (updated to user's server)
    return 'http://82.25.69.42';
  }
  return 'https://<host>';
};

export const getEnvironment = async (): Promise<EnvName> => {
  try {
    const v = await AsyncStorage.getItem(ENV_KEY);
    if (v === 'production') return 'production';
  } catch (e) {
    // ignore
  }
  return 'development';
};

export const setEnvironment = async (env: EnvName) => {
  try {
    await AsyncStorage.setItem(ENV_KEY, env);
  } catch (e) {
    // ignore
  }
};
