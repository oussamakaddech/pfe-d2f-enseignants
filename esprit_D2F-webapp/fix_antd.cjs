const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Fix visible={...} to open={...} for AntD components
    // We target Drawer and Modal specifically to avoid false positives with other components
    if (content.includes('<Drawer') || content.includes('<Modal')) {
        const newContent = content.replace(/visible=\{/g, 'open={');
        if (newContent !== content) {
            content = newContent;
            changed = true;
        }
    }

    // Fix destroyOnHidden to destroyOnClose
    if (content.includes('destroyOnHidden')) {
        content = content.replace(/destroyOnHidden/g, 'destroyOnClose');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});
