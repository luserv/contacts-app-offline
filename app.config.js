const dotenv = require('dotenv');
const path = require('path');

// Cargar .env como base (development / production)
dotenv.config({ path: path.join(__dirname, '.env') });

const APP_ENV = process.env.APP_ENV ?? 'development';
const IS_PREVIEW = APP_ENV === 'preview';

// Preview sobreescribe con .env.preview
if (IS_PREVIEW) {
  dotenv.config({ path: path.join(__dirname, '.env.preview'), override: true });
}

const getAppName = () => {
  if (IS_PREVIEW) return "Contacts (Preview)";
  return "Contacts";
};

const getPackageName = () => {
  if (IS_PREVIEW) return "com.luserv.contacts.preview";
  return "com.luserv.c0ntacts";
};

const getGoogleServicesFile = () => {
  if (IS_PREVIEW) return "./google-services.preview.json";
  return "./google-services.json";
};

export default {
  expo: {
    name: getAppName(),
    slug: "contacts-app-offline",
    version: "1.0.0",
    scheme: "contacts",
    orientation: "default",
    platforms: ["android", "web"],
    icon: "./assets/images/icon.png",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#007AFF"
    },
    android: {
      package: getPackageName(),
      googleServicesFile: getGoogleServicesFile(),
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#007AFF"
      }
    },
    plugins: [
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: process.env.ADMOB_ANDROID_APP_ID || "ca-app-pub-3940256099942544~3347511713",
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
