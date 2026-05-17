export default {
  expo: {
    name: "Contacts",
    slug: "contacts-app",
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
          androidAppId: process.env.ADMOB_ANDROID_APP_ID || "ca-app-pub-3940256099942544~3347511713",
          iosAppId: process.env.ADMOB_IOS_APP_ID || "ca-app-pub-3940256099942544~1458002511",
        }
      ],
      "@react-native-google-signin/google-signin",
      "expo-font",
      "expo-router",
      "expo-web-browser"
    ],
    owner: "luserv33",
    updates: {
      url: "https://u.expo.dev/7b4d5e70-eff4-4dc2-addf-c45fa80b6fa9"
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    extra: {
      eas: {
        projectId: "7b4d5e70-eff4-4dc2-addf-c45fa80b6fa9"
      }
    }
  }
};
