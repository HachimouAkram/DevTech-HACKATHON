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

function fixRequires(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    const regex = /require\(['"]([^'"]+)utils\/api['"]\)/g;
    content = content.replace(regex, (match, prefix) => {
        changed = true;
        return `require('${prefix}services/apiClient')`;
    });

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed requires in: ${filePath}`);
    }
}

traverseDir(srcDir, fixRequires);
