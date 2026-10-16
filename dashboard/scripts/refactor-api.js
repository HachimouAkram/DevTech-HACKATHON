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
    let changed = false;

    // Pattern 1: `http://${window.location.hostname}:5000/api
    const regex1 = /`http:\/\/\$\{window\.location\.hostname\}:5000\/api(.*?)\`/g;
    
    if (regex1.test(content)) {
        content = content.replace(regex1, '`${API_BASE_URL}$1`');
        changed = true;
    }

    if (changed) {
        // Add import if missing
        if (!content.includes('API_BASE_URL')) {
             // Calculate relative path to utils/api.js
             const relative = path.relative(path.dirname(filePath), path.join(srcDir, 'utils', 'api.js')).replace(/\\/g, '/');
             const importStmt = `import { API_BASE_URL } from '${relative.startsWith('.') ? relative : './' + relative}';\n`;
             
             // insert after first block of imports
             const importIndex = content.lastIndexOf('import ');
             if (importIndex !== -1) {
                 const endOfLine = content.indexOf('\n', importIndex);
                 content = content.slice(0, endOfLine + 1) + importStmt + content.slice(endOfLine + 1);
             } else {
                 content = importStmt + content;
             }
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

traverseDir(srcDir);
