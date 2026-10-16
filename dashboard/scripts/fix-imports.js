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

    if (content.includes('API_BASE_URL') && !content.includes('import { API_BASE_URL }') && !filePath.includes('api.js')) {
         const relative = path.relative(path.dirname(filePath), path.join(srcDir, 'utils', 'api.js')).replace(/\\/g, '/');
         const importStmt = `import { API_BASE_URL } from '${relative.startsWith('.') ? relative : './' + relative}';\n`;
         
         const importIndex = content.lastIndexOf('import ');
         if (importIndex !== -1) {
             const endOfLine = content.indexOf('\n', importIndex);
             content = content.slice(0, endOfLine + 1) + importStmt + content.slice(endOfLine + 1);
         } else {
             content = importStmt + content;
         }
         
         fs.writeFileSync(filePath, content, 'utf8');
         console.log(`Fixed import in: ${filePath}`);
    }
}

traverseDir(srcDir);
