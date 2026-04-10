import 'dotenv/config';

export default {
  expo: {
    name: "Contacts",
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
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
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
      eas: {
        projectId: "018fed16-4d84-4465-93bc-6c4f29dbca24"
      }
    }
  }
};
