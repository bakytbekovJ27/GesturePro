import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/api';

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const useSecureStore = async () => {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
};

const setStorage = async (key: string, value: string) => {
  if (await useSecureStore()) {
    return SecureStore.setItemAsync(key, value);
  }

  if (isBrowser) {
    window.localStorage.setItem(key, value);
    return;
  }

  throw new Error('Secure storage is not available.');
};

const getStorage = async (key: string) => {
  if (await useSecureStore()) {
    return SecureStore.getItemAsync(key);
  }

  if (isBrowser) {
    return window.localStorage.getItem(key);
  }

  return null;
};

const deleteStorage = async (key: string) => {
  if (await useSecureStore()) {
    return SecureStore.deleteItemAsync(key);
  }

  if (isBrowser) {
    window.localStorage.removeItem(key);
    return;
  }

  throw new Error('Secure storage is not available.');
};

export const saveTokens = async (access: string, refresh: string) => {
  await setStorage(STORAGE_KEYS.ACCESS_TOKEN, access);
  await setStorage(STORAGE_KEYS.REFRESH_TOKEN, refresh);
};

export const getAccessToken = async () => {
  return await getStorage(STORAGE_KEYS.ACCESS_TOKEN);
};

export const getRefreshToken = async () => {
  return await getStorage(STORAGE_KEYS.REFRESH_TOKEN);
};

export const clearTokens = async () => {
  await deleteStorage(STORAGE_KEYS.ACCESS_TOKEN);
  await deleteStorage(STORAGE_KEYS.REFRESH_TOKEN);
};

export const saveUser = async (user: any) => {
  await setStorage(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
};

export const getUser = async () => {
  const data = await getStorage(STORAGE_KEYS.USER_DATA);
  return data ? JSON.parse(data) : null;
};

export const clearUser = async () => {
  await deleteStorage(STORAGE_KEYS.USER_DATA);
};
