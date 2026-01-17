import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@user_credentials_v1';

export async function saveUser({ userId, password, name }) {
  const payload = { userId, password, name: name ?? '' };
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
}
