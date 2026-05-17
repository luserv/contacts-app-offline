#!/usr/bin/env bash
# Aplica la config de release signing después de prebuild
set -e

cd "$(dirname "$0")/../android/app"

cat > patch.py << 'PYEOF'
import re

with open('build.gradle', 'r') as f:
    content = f.read()

# Add release signing config
old_signing = '''    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug'''

new_signing = '''    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file('../../release.keystore')
            storePassword 'android'
            keyAlias 'Contacts-app'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release'''

if old_signing in content:
    content = content.replace(old_signing, new_signing)
    with open('build.gradle', 'w') as f:
        f.write(content)
    print('✓ Release signing config applied')
else:
    print('⚠ Could not find the expected pattern in build.gradle')
    print('  The file may have already been patched or has a different structure.')
PYEOF

python3 patch.py
rm patch.py
