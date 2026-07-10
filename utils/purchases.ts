/**
 * RevenueCat integration.
 * Solo activo en Android — en web/Electron se usa el sistema de licencias de Firebase.
 */
import { Platform } from 'react-native';

export const RC_ENTITLEMENT = 'premium';
const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

export const isRCAvailable = Platform.OS === 'android' && !!RC_ANDROID_KEY;

/** Inicializa RevenueCat y vincula al usuario de Firebase. */
export async function rcConfigure(firebaseUid: string): Promise<void> {
  if (!isRCAvailable) return;
  const { default: Purchases, LOG_LEVEL } = require('react-native-purchases');
  Purchases.setLogLevel(LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey: RC_ANDROID_KEY });
  await Purchases.logIn(firebaseUid);
}

/** Devuelve true si el usuario tiene el entitlement premium activo. */
export async function rcIsLicensed(): Promise<boolean> {
  if (!isRCAvailable) return false;
  try {
    const { default: Purchases } = require('react-native-purchases');
    const info = await Purchases.getCustomerInfo();
    return RC_ENTITLEMENT in info.entitlements.active;
  } catch {
    return false;
  }
}

/** Desconecta el usuario de RevenueCat al cerrar sesión. */
export async function rcLogOut(): Promise<void> {
  if (!isRCAvailable) return;
  try {
    const { default: Purchases } = require('react-native-purchases');
    await Purchases.logOut();
  } catch {}
}

/** Suscribe un callback que se llama cada vez que cambian los entitlements. */
export function rcAddListener(cb: (licensed: boolean) => void): () => void {
  if (!isRCAvailable) return () => {};
  const { default: Purchases } = require('react-native-purchases');
  Purchases.addCustomerInfoUpdateListener((info: any) => {
    cb(RC_ENTITLEMENT in info.entitlements.active);
  });
  return () => Purchases.removeCustomerInfoUpdateListener(cb);
}

export interface RCOffering {
  packageIdentifier: string;
  product: {
    title: string;
    priceString: string;
    productIdentifier: string;
  };
  // objeto completo para pasar a purchasePackage
  _raw: any;
}

/** Obtiene la oferta activa de RevenueCat. */
export async function rcGetOffering(): Promise<RCOffering | null> {
  if (!isRCAvailable) return null;
  try {
    const { default: Purchases } = require('react-native-purchases');
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current || !current.availablePackages.length) return null;
    // Busca lifetime primero, luego el primer paquete disponible
    const pkg =
      current.availablePackages.find((p: any) => p.packageType === 'LIFETIME') ??
      current.availablePackages[0];
    return {
      packageIdentifier: pkg.identifier,
      product: {
        title: pkg.product.title,
        priceString: pkg.product.priceString,
        productIdentifier: pkg.product.productIdentifier,
      },
      _raw: pkg,
    };
  } catch {
    return null;
  }
}

/** Ejecuta la compra de un paquete. Lanza error si falla o es cancelada. */
export async function rcPurchase(offering: RCOffering): Promise<boolean> {
  if (!isRCAvailable) throw new Error('RevenueCat not available');
  const { default: Purchases } = require('react-native-purchases');
  const { customerInfo } = await Purchases.purchasePackage(offering._raw);
  return RC_ENTITLEMENT in customerInfo.entitlements.active;
}

/** Restaura compras anteriores. */
export async function rcRestore(): Promise<boolean> {
  if (!isRCAvailable) throw new Error('RevenueCat not available');
  const { default: Purchases } = require('react-native-purchases');
  const info = await Purchases.restorePurchases();
  return RC_ENTITLEMENT in info.entitlements.active;
}
