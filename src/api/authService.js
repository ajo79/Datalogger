import { getUser } from "../storage/userStorage";

const FACTORY_USER = "Company_A";
const FACTORY_PASSWORD = "1234";

/**
 * Basic, replaceable auth helper.
 * Currently checks factory credentials first, then any previously saved user.
 * Swap this with a real backend call when available.
 */
export async function authenticate(userId, password) {
  if (!userId || !password) {
    throw new Error("User ID and password are required.");
  }

  // Factory fallback
  if (userId === FACTORY_USER && password === FACTORY_PASSWORD) {
    return { userId, token: "factory-token" };
  }

  // Validate against locally saved user (acts as a lightweight demo backend)
  const saved = await getUser();
  if (saved && saved.userId === userId && saved.password === password) {
    return { userId: saved.userId, token: "local-token" };
  }

  throw new Error("Invalid credentials.");
}
