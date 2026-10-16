import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '../src');

function traverseDir(dir, callback) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverseDir(fullPath, callback);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            callback(fullPath);
        }
    }
}

function fixInvalidKeys(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // 1. Fix the invalid keys for SecureStore by removing the @
    if (content.includes('@auth_token') || content.includes('@auth_cached_token') || content.includes('@auth_credential_hash')) {
        content = content.replace(/@auth_token/g, 'auth_token');
        content = content.replace(/@auth_cached_token/g, 'auth_cached_token');
        content = content.replace(/@auth_credential_hash/g, 'auth_credential_hash');
        changed = true;
    }

    // 2. Fix the missing SecureStore import and conversion in settings.tsx
    if (filePath.endsWith('settings.tsx')) {
        if (content.includes('AsyncStorage.getItem(\'auth_token\')')) {
            content = content.replace(/AsyncStorage\.getItem\('auth_token'\)/g, "SecureStore.getItemAsync('auth_token')");
            if (!content.includes('expo-secure-store')) {
                content = `import * as SecureStore from 'expo-secure-store';\n` + content;
            }
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed keys in: ${filePath}`);
    }
}

traverseDir(srcDir, fixInvalidKeys);
