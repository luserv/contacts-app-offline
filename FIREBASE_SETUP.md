# Configuración de Firebase + Google Drive para Contacts App

## 1. Crear proyecto en Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Haz clic en **Crear un proyecto**
3. Ingresa el nombre del proyecto, ej: `c0ntacts`
4. Desactiva Google Analytics (no es necesario)
5. Espera a que se cree el proyecto

## 2. Registrar aplicación Android

1. Desde la consola de Firebase, ve a **Project Overview > Agregar app > Android**
2. Ingresa el **package name**: `com.luserv.c0ntacts` (producción)
3. El **App nickname** es opcional (ej: "Contacts App Android")
4. **No** necesitas SHA-1 para Firebase Auth básico (para Google Sign-In, Firebase lo maneja automáticamente)
5. Haz clic en **Registrar app**
6. **Descarga el archivo `google-services.json`** generado
7. Colócalo en la **raíz del proyecto** junto a `package.json`

## 3. Registrar aplicación Web (para Electron)

1. Ve a **Project Overview > Agregar app > Web**
2. Ingresa un nickname (ej: "Contacts App Electron")
3. Activa **Firebase Hosting** (opcional, pero necesario para obtener las configuraciones)
4. Copia el objeto `firebaseConfig` que se muestra (necesitarás estos valores para el `.env`)

## 4. Habilitar Google Sign-In en Firebase

1. En Firebase Console, ve a **Authentication > Sign-in method**
2. Haz clic en **Google** como proveedor
3. Actívalo (toggle)
4. **Importante:** En **Public-facing name for project**, pon un nombre visible (ej: "Contacts App")
5. Copia los **Client ID** generados:
   - **Web client ID**: Se usa para Electron (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`)
   - **Web client secret**: Se usa para el intercambio OAuth en Electron (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET`)
   - **Android client ID**: Se usa para Android nativo (`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`)

> El **Web client ID** se genera automáticamente al habilitar Google Sign-In. Si necesitas regenerarlo, ve a **APIs & Services > Credentials** en Google Cloud Console.

## 5. Habilitar la API de Google Drive

> **IMPORTANTE:** Firebase NO habilita automáticamente la API de Google Drive. Este paso es necesario para que el backup/restore funcione.

1. Ve a [console.cloud.google.com](https://console.cloud.google.com)
2. Asegúrate de tener seleccionado el proyecto correcto (el mismo de Firebase)
3. Navega a **APIs & Services > Library**
4. Busca **"Google Drive API"**
5. Selecciona **Google Drive API**
6. Haz clic en **Enable**

Esto permite que la app use el scope `https://www.googleapis.com/auth/drive.file` para crear y gestionar archivos de backup dentro de Google Drive del usuario.

## 6. Configurar pantalla de consentimiento OAuth

1. En Google Cloud Console, ve a **APIs & Services > OAuth consent screen**
2. Selecciona **External** (a menos que tengas Google Workspace)
3. Completa:
   - **App name**: "Contacts App"
   - **User support email**: tu email
   - **Developer contact information**: tu email
4. En **Scopes**, agrega:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
   - `https://www.googleapis.com/auth/drive.file` (para backup)
5. En **Test users**, agrega los emails de prueba
6. Publica la app cuando esté lista para producción

## 7. Configurar proyecto para desarrollo

Crear el archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Completar las variables con los valores de tu proyecto Firebase:

| Variable | Dónde obtenerla |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase Console > Project Settings > General > Web API Key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `{project-id}.firebaseapp.com` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Console > Project Settings > General > Project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `{project-id}.firebasestorage.app` |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console > Project Settings > Cloud Messaging > Sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase Console > Project Settings > General > App ID (Web) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Firebase Console > Authentication > Sign-in method > Google > Web client ID |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_SECRET` | Google Cloud Console > APIs & Services > Credentials > Web client secret |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Firebase Console > Authentication > Sign-in method > Google > Android client ID |

## 8. (Opcional) Proyecto Preview

Para un entorno de staging/preview separado:

1. Crea un **segundo proyecto Firebase** (ej: `contacts-preview`)
2. Registra una app Android con package `com.luserv.contacts.preview`
3. Descarga el `google-services.json` y guárdalo como `google-services.preview.json`
4. Crea un archivo `.env.preview` con las credenciales del proyecto preview
5. Habilita Google Sign-In y **Google Drive API** también en este proyecto

## 9. Verificar todo

```bash
# El proyecto debe tener estos archivos
ls -la .env google-services.json google-services.preview.json .env.preview

# Instalar dependencias
npm install

# Iniciar la app
npm run start
```

## Resumen técnico del flujo

```
Firebase Auth (Google Sign-In)
  ├─ Android: @react-native-google-signin (obtiene access_token nativo)
  ├─ Web: signInWithRedirect + getRedirectResult (Firebase SDK)
  └─ Electron: OAuth2 con BrowserWindow + intercambio code→token

Google Drive API (drive.file scope)
  └─ Backups en: contacts/db/backup-{timestamp}.db
     ├─ Subida (multipart/related)
     ├─ Descarga (alt=media)
     └─ Límite: 2 backups máximo (se podan automáticamente)

Token management:
  ├─ Android: GoogleSignin.getTokens() (refresh automático)
  ├─ Web: Token en AsyncStorage con expiración de 55 min
  └─ Electron: Refresh token en google_refresh_token.json + silent re-auth
```

## Notas importantes

- El scope de Drive es `drive.file` — la app solo ve/administra sus propios archivos
- Los tokens de acceso de Google duran 1 hora; la app usa un margen de 55 minutos
- En Android el refresh del token es automático (SDK nativo)
- En Electron el refresh token se persiste en disco para re-autenticación silenciosa
- Si la API de Drive no está habilitada, las llamadas fallarán con error 403
