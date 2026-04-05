import { NativeModules, Platform } from 'react-native';
import { useAuth } from '../utils/authContext';

// IDs de prueba para desarrollo — reemplazar con los reales antes de publicar
const TEST_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111';

// IDs reales (reemplazar cuando tengas tu cuenta AdMob)
const REAL_APP_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX';
const REAL_BANNER_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';

const IS_DEV = __DEV__;
export const ADMOB_APP_ID = IS_DEV ? TEST_APP_ID : REAL_APP_ID;
const BANNER_ID = IS_DEV ? TEST_BANNER_ID : REAL_BANNER_ID;

// The native module is only available in a custom dev client / production build,
// not in Expo Go. Check before loading the package to avoid the invariant throw.
const isAdMobAvailable = !!NativeModules.RNGoogleMobileAdsModule;

export default function AdBanner() {
  const { licensed } = useAuth();

  // No mostrar si tiene licencia o si es web/Electron o si no hay módulo nativo
  if (licensed || Platform.OS === 'web' || !isAdMobAvailable) return null;

  const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads');
  return (
    <BannerAd
      unitId={BANNER_ID}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
    />
  );
}
