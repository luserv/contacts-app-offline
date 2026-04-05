import 'dotenv/config';

export default {
  expo: {
    name: "Contacts",
    slug: "contacts-app-offline",
    version: "1.0.0",
    scheme: "contacts",
    orientation: "portrait",
    platforms: ["android", "web"],
    android: {
      package: "com.luserv2.contacts",
      googleServicesFile: "./google-services.json"
    },
    plugins: [
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: process.env.ADMOB_ANDROID_APP_ID,
          iosAppId: process.env.ADMOB_IOS_APP_ID,
        }
      ],
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
