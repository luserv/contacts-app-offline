import 'dotenv/config';

const APP_ENV = process.env.APP_ENV ?? 'development';
const IS_PROD = APP_ENV === 'production';
const IS_PREVIEW = APP_ENV === 'preview';

const getAppName = () => {
  if (IS_PROD) return "Contacts";
  if (IS_PREVIEW) return "Contacts (Preview)";
  return "Contacts (Dev)";
};

const getPackageName = () => {
  // Debe coincidir con un cliente en google-services.json. Solo tienes registrado
  // com.luserv.c0ntacts en Firebase; .dev / .preview requieren apps extra en la consola
  // y un JSON fusionado. Mismo ID en todos los APP_ENV: el nombre de la app (Dev/Preview)
  // sigue diferenciando builds en el launcher.
  return "com.luserv.c0ntacts";
};

export default {
  expo: {
    name: getAppName(),
    slug: "contacts-app-offline",
    version: "1.0.0",
    scheme: "contacts",
    orientation: "portrait",
    platforms: ["android", "web"],
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#007AFF"
    },
    android: {
      package: getPackageName(),
      googleServicesFile: "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#007AFF"
      }
    },
    plugins: [
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: process.env.ADMOB_ANDROID_APP_ID || "ca-app-pub-3940256099942544~3347511713", // Test ID if missing
          iosAppId: process.env.ADMOB_IOS_APP_ID || "ca-app-pub-3940256099942544~1458002511",
        }
      ],
      "@react-native-google-signin/google-signin",
      "expo-font",
      "expo-router",
      "expo-web-browser"
    ],
    extra: {
      appEnv: APP_ENV,
      eas: {
        projectId: "018fed16-4d84-4465-93bc-6c4f29dbca24"
      }
    }
  }
};
