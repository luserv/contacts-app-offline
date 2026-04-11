import 'dotenv/config';

const IS_PROD = process.env.APP_ENV === 'production';

export default {
  expo: {
    name: IS_PROD ? "Contacts" : "Contacts (dev)",
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
      package: "com.luserv.c0ntacts",
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
          androidAppId: process.env.ADMOB_ANDROID_APP_ID,
          iosAppId: process.env.ADMOB_IOS_APP_ID,
        }
      ],
      "@react-native-google-signin/google-signin",
      "expo-font",
      "expo-router",
      "expo-web-browser"
    ],
    extra: {
      appEnv: process.env.APP_ENV ?? "development",
      eas: {
        projectId: "018fed16-4d84-4465-93bc-6c4f29dbca24"
      }
    }
  }
};
