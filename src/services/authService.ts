import * as LocalAuthentication from 'expo-local-authentication';
import Storage from 'expo-sqlite/kv-store';
import * as Crypto from 'expo-crypto';

const PIN_HASH_KEY = 'app.pin.hash';
const PIN_SALT_KEY = 'app.pin.salt';
const LOCK_ENABLED_KEY = 'app.lock.enabled';

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export const authService = {
  async isLockEnabled(): Promise<boolean> {
    return (await Storage.getItem(LOCK_ENABLED_KEY)) === '1';
  },

  async hasPin(): Promise<boolean> {
    return (await Storage.getItem(PIN_HASH_KEY)) !== null;
  },

  async setPin(pin: string): Promise<void> {
    const salt = Crypto.randomUUID();
    await Storage.setItem(PIN_SALT_KEY, salt);
    await Storage.setItem(PIN_HASH_KEY, await hashPin(pin, salt));
    await Storage.setItem(LOCK_ENABLED_KEY, '1');
  },

  async verifyPin(pin: string): Promise<boolean> {
    const salt = await Storage.getItem(PIN_SALT_KEY);
    const stored = await Storage.getItem(PIN_HASH_KEY);
    if (!salt || !stored) return false;
    return (await hashPin(pin, salt)) === stored;
  },

  async disableLock(): Promise<void> {
    await Storage.removeItem(LOCK_ENABLED_KEY);
  },

  /** Returns true if unlocked (no lock set, or biometry/PIN succeeded). */
  async unlock(): Promise<boolean> {
    if (!(await this.isLockEnabled())) return true;
    const hasHw = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (hasHw && enrolled) {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Buka KasJersey',
        cancelLabel: 'Batal',
      });
      if (res.success) return true;
    }
    return false;
  },
};
