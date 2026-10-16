import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '../src');

function traverseDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverseDir(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove any weird injected imports from previous scripts
    content = content.replace(/^import \{ API_BASE_URL \} from '\.\.\/utils\/api\.js';\n/gm, '');
    content = content.replace(/^import \{ API_BASE_URL \} from '\.\.\/\.\.\/utils\/api\.js';\n/gm, '');

    // Pattern 1: `http://${window.location.hostname}:5000/api
    const regex1 = /`http:\/\/\$\{window\.location\.hostname\}:5000\/api(.*?)\`/g;
    let changedUrl = false;
    if (regex1.test(content)) {
        content = content.replace(regex1, '`${API_BASE_URL}$1`');
        changedUrl = true;
    }

    if (content.includes('API_BASE_URL') && !content.includes("export const API_BASE_URL")) {
        // Calculate relative path to utils/api.js
        const relative = path.relative(path.dirname(filePath), path.join(srcDir, 'utils', 'api.js')).replace(/\\/g, '/');
        const importStmt = `import { API_BASE_URL } from '${relative.startsWith('.') ? relative : './' + relative}';\n`;
        
        // Ensure it's only imported once at the very top
        content = importStmt + content;
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated and fixed imports for: ${filePath}`);
    } else if (changedUrl) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

traverseDir(srcDir);
