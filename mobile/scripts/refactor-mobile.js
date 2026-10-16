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

// 1. Refactor imports
function refactorImports(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Check for imports from utils/api
    const regex1 = /from\s+['"]([^'"]+)utils\/api['"]/g;
    content = content.replace(regex1, (match, prefix) => {
        changed = true;
        return `from '${prefix}services/apiClient'`;
    });
    
    // Also change exact matches like `../utils/api`
    if (content.includes('utils/api')) {
       // just to be safe
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated imports in: ${filePath}`);
    }
}

// 2. Update apiClient.ts
function updateApiClient() {
    const filePath = path.join(srcDir, 'services', 'apiClient.ts');
    let content = fs.readFileSync(filePath, 'utf8');
    
    content = `import * as SecureStore from 'expo-secure-store';\n` + content;
    
    // replace dynamic imports
    content = content.replace(/const AsyncStorage = require\('@react-native-async-storage\/async-storage'\)\.default;\s*/g, '');
    
    // Auth Token usage
    content = content.replace(/\(await AsyncStorage\.getItem\('@auth_token'\)\)/g, "(await SecureStore.getItemAsync('@auth_token'))");
    content = content.replace(/\(await AsyncStorage\.getItem\('@auth_cached_token'\)\)/g, "(await SecureStore.getItemAsync('@auth_cached_token'))");
    
    // Custom API URL could stay in AsyncStorage, but let's change it too or leave it. The instructions say replace AsyncStorage by SecureStore for tokens.
    // Let's change it just for tokens, but we removed the require. So we need to put it back for custom_api_url or change all to AsyncStorage.
    // Actually, I'll put import AsyncStorage back.
    content = `import AsyncStorage from '@react-native-async-storage/async-storage';\n` + content;
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated apiClient.ts`);
}

// 3. Update AuthContext.tsx
function updateAuthContext() {
    const filePath = path.join(srcDir, 'context', 'AuthContext.tsx');
    let content = fs.readFileSync(filePath, 'utf8');
    
    content = `import * as SecureStore from 'expo-secure-store';\n` + content;
    
    content = content.replace(/await AsyncStorage\.getItem\('@auth_token'\)/g, "await SecureStore.getItemAsync('@auth_token')");
    content = content.replace(/await AsyncStorage\.setItem\('@auth_cached_token', (.*?)\)/g, "await SecureStore.setItemAsync('@auth_cached_token', $1)");
    content = content.replace(/await AsyncStorage\.setItem\('@auth_credential_hash', (.*?)\)/g, "await SecureStore.setItemAsync('@auth_credential_hash', $1)");
    content = content.replace(/await AsyncStorage\.setItem\('@auth_token', (.*?)\)/g, "await SecureStore.setItemAsync('@auth_token', $1)");
    content = content.replace(/await AsyncStorage\.removeItem\('@auth_token'\)/g, "await SecureStore.deleteItemAsync('@auth_token')");
    content = content.replace(/await AsyncStorage\.getItem\('@auth_credential_hash'\)/g, "await SecureStore.getItemAsync('@auth_credential_hash')");
    content = content.replace(/await AsyncStorage\.getItem\('@auth_cached_token'\)/g, "await SecureStore.getItemAsync('@auth_cached_token')");
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated AuthContext.tsx`);
}

// 4. Update profile.tsx
function updateProfile() {
    const filePath = path.join(srcDir, 'app', '(tabs)', 'profile.tsx');
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('@auth_token')) {
            content = `import * as SecureStore from 'expo-secure-store';\n` + content;
            content = content.replace(/await AsyncStorage\.getItem\('@auth_token'\)/g, "await SecureStore.getItemAsync('@auth_token')");
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated profile.tsx`);
        }
    }
}

// 5. Update SyncEngine.ts
function updateSyncEngine() {
    const filePath = path.join(srcDir, 'services', 'SyncEngine.ts');
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = `import * as SecureStore from 'expo-secure-store';\n` + content;
        content = content.replace(/\(await AsyncStorage\.getItem\('@auth_token'\)\)/g, "(await SecureStore.getItemAsync('@auth_token'))");
        content = content.replace(/\(await AsyncStorage\.getItem\('@auth_cached_token'\)\)/g, "(await SecureStore.getItemAsync('@auth_cached_token'))");
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated SyncEngine.ts`);
    }
}


traverseDir(srcDir, refactorImports);
updateApiClient();
updateAuthContext();
updateProfile();
updateSyncEngine();

console.log('Refactoring complete.');
