import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@user_credentials_v1';
const SESSION_KEY = '@user_session_v1';

export async function saveUser({ userId, password, name }) {
  const payload = {
    userId: userId ?? '',
    name: name ?? '',
  };
  if (password) payload.password = password;
  await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  return true;
}

export async function getUser() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function validateUser(inputUserId, inputPassword) {
  const saved = await getUser();
  if (!saved) return false;
  return saved.userId === inputUserId && saved.password === inputPassword;
}

export async function clearUser() {
  await AsyncStorage.removeItem(KEY);
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function saveSession({ userId, token }) {
  const payload = {
    userId: userId ?? '',
    token: token ?? '',
    signedInAt: Date.now(),
  };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  return true;
}

export async function getSession() {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}
