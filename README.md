# Contacts App

App de gestión de contactos **100% offline** con base de datos SQLite local. Disponible para Android, Web y escritorio (Electron/Windows/Mac/Linux).

---

## Características

- **Gestión completa de contactos** — nombre, apellido, fecha de nacimiento, género, estado civil
- **Múltiples datos por contacto** — teléfonos, emails, URLs, notas, palabras clave
- **Documentos de identidad** — número, fecha de emisión y vencimiento
- **Cuentas bancarias** — banco, número de cuenta, tipo y etiqueta
- **Organizaciones** — asocia contactos a organizaciones con logros y fechas
- **Relaciones entre contactos** — padre, madre, hijo/a, cónyuge, etc.
- **Notas de texto libre** — agrega notas privadas a cada contacto
- **URLs / sitios web** — guarda y abre enlaces directamente desde el detalle del contacto
- **Calendario de cumpleaños** — vista mensual con días resaltados, navegación de meses y lista de contactos que cumplen años ese día
- **Búsqueda avanzada con filtros** — filtrado por edad (`age:23`, `age:>18`, `age:<=30`) e intersección de condiciones con `&`
- **Importación de contactos vía VCF/vCard** — desde el dispositivo
- **Exportación e importación de la base de datos** — backup local o compartir por cualquier canal
- **Backup en Google Drive** — solo archivos creados por la app (`drive.file` scope)
- **Notificaciones de cumpleaños** — programadas automáticamente
- **Internacionalización** — Español e Inglés
- **Autenticación con Google** — opcional; desbloquea sincronización con Drive
- **Anuncios AdMob** — opcional (Android)
- **100% local y offline** — los datos nunca salen del dispositivo sin acción explícita del usuario

---

## Requisitos previos

- **Node.js** v18 o superior — [nodejs.org](https://nodejs.org)
- **npm** v9 o superior (viene con Node)
- **Expo CLI** — se instala automáticamente al correr los scripts

Para correr en **Android** (emulador o dispositivo físico):
- **Android Studio** con un emulador configurado, o un dispositivo Android con USB debugging activado
- **Java JDK 17** (requerido por Android Studio)

Para correr en **escritorio (Electron)**:
- Solo Windows/Mac/Linux, no se necesita nada extra más allá de Node

---

## Configuración inicial (todos los targets)

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repo>
cd contacts-app-offline
npm install
```

### 2. Crear el archivo de variables de entorno

```bash
cp .env.example .env
```

Luego editar `.env` con tus valores:

| Variable | Descripción |
|---|---|
| `ADMOB_ANDROID_APP_ID` | App ID de AdMob para Android (consola de AdMob) |
| `ADMOB_IOS_APP_ID` | App ID de AdMob para iOS (consola de AdMob) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Client ID web de Google OAuth (consola de Firebase) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Client ID Android de Google OAuth (consola de Firebase) |
| `EXPO_PUBLIC_PAYPAL_ME` | Tu link de PayPal.me para donaciones |
| `EXPO_PUBLIC_LICENSE_PRICE` | Precio de la licencia (ej: `4.99`) |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | Email de soporte |

> Si solo quieres probar la app sin login con Google ni anuncios, puedes dejar los valores de ejemplo del `.env.example` — la app funcionará en modo básico.

---

## Correr en Android

### 3a. Crear el archivo `google-services.json`

Este archivo es necesario para compilar en Android. Se obtiene desde la consola de Firebase:

1. Ir a [console.firebase.google.com](https://console.firebase.google.com)
2. Crear un proyecto (o usar uno existente)
3. Agregar una app Android con el package name `com.luserv2.contacts`
4. Descargar el `google-services.json` generado
5. Colocarlo en la raíz del proyecto (junto a `package.json`)

### 3b. Correr en emulador o dispositivo

```bash
# Iniciar con Expo (escanear QR con Expo Go o usar emulador)
npm run start

# O compilar y correr directamente en Android
npm run android
```

> La base de datos `contacts.db` se crea automáticamente en el dispositivo al primer arranque.

**Opcional** — poblar la base de datos con datos de prueba (solo entorno local):

```bash
npm run sqlite:seed
```

---

## Correr en Web (navegador)

No requiere `google-services.json` ni configuración extra de Firebase.

```bash
npm run start
# Luego presionar 'w' para abrir en el navegador
```

---

## Generar APK de producción (Android)

### Con EAS Build (recomendado, requiere cuenta Expo)

```bash
npm install -g eas-cli
eas build --platform android --profile production
```

### Build local con Gradle (requiere Android Studio)

```bash
# 1. Generar el proyecto nativo si no existe
npx expo prebuild --platform android

# 2. Compilar el APK release
cd android && ./gradlew assembleRelease
```

El APK queda en `android/app/build/outputs/apk/release/app-release.apk`.

> Para firmar el APK con tu keystore configura las variables `KEYSTORE_*` en `android/gradle.properties` o usa EAS Build que gestiona la firma automáticamente.

---

## Correr en escritorio (Electron)

Electron usa SQLite nativo (`better-sqlite3`). Hay que reconstruir el binario antes de la primera ejecución:

```bash
# Solo la primera vez (o tras cambiar versión de Node/Electron)
npm run electron:rebuild

# Iniciar en modo desarrollo
npm run electron:dev
```

> En escritorio no se usa `google-services.json` ni las variables de AdMob.

### Generar instalador

```bash
npm run electron:win    # Windows (.exe NSIS)
npm run electron:mac    # macOS (.dmg)
npm run electron:linux  # Linux (.AppImage)
```

El instalador queda en la carpeta `release/`.

---

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run start` | Inicia el servidor de desarrollo Expo |
| `npm run android` | Compila y corre en Android |
| `npm run lint` | Corre el linter |
| `npm run sqlite:init` | Inicializa la base de datos SQLite local |
| `npm run sqlite:seed` | Puebla la base de datos local con datos de prueba |
| `npm run generate:ico` | Genera el ícono `.ico` para Electron desde el PNG |
| `npm run electron:rebuild` | Recompila `better-sqlite3` para Electron |
| `npm run electron:dev` | Inicia la app de escritorio en modo desarrollo |
| `npm run electron:build` | Genera el instalador para el sistema operativo actual |
| `npm run electron:win` | Genera instalador para Windows |
| `npm run electron:mac` | Genera instalador para macOS |
| `npm run electron:linux` | Genera instalador para Linux |

---

## Arquitectura

- **Expo & React Native** — UI multiplataforma (Android, Web, escritorio)
- **Expo Router** — navegación basada en sistema de archivos
- **Expo SQLite** — base de datos local en mobile/web
- **better-sqlite3** — base de datos local en Electron (escritorio)
- **Context API** — gestión de estado sin fetches externos
- **Firebase Auth** — autenticación con Google (opcional)
- **Google Drive API** — backup/restore de la base de datos (scope `drive.file`)
- **Google Mobile Ads** — anuncios AdMob (opcional, solo Android)
- **i18n propio** — Español e Inglés con persistencia via SecureStore/localStorage

### Esquema de base de datos

| Tabla | Descripción |
|---|---|
| `contact` | Datos principales del contacto |
| `contact_phone` | Teléfonos con etiqueta |
| `contact_email` | Emails con etiqueta |
| `contact_url` | URLs con etiqueta |
| `contact_note` | Notas libres |
| `contact_keyword` | Palabras clave / etiquetas |
| `national_identity_card` | Documentos de identidad |
| `contact_bank_account` | Cuentas bancarias |
| `contact_organization` | Relación contacto–organización |
| `contact_relationship` | Relaciones entre contactos |
| `organization` | Catálogo de organizaciones |
| `marital_status` | Catálogo de estados civiles |
| `relationship_type` | Catálogo de tipos de relación |

Los datos son **100% locales y offline**. El archivo `contacts.db` nunca sale del dispositivo sin acción explícita del usuario.
