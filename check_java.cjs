const fs = require('fs');
const path = require('path');

const dirs = [
    'esprit_D2F-besoin-formation',
    'esprit_D2F-certificat',
    'esprit_D2F-evaluation',
    'esprit_D2F-formation'
];

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (fullPath.endsWith('.java')) {
            results.push(fullPath);
        }
    });
    return results;
}

dirs.forEach(d => {
    const files = walk(d);
    files.forEach(f => {
        const content = fs.readFileSync(f, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, i) => {
            if (line.includes('.get()') && !line.includes('Optional') && !line.includes('//')) {
                 // Check if it's likely an Optional.get()
                 if (line.match(/\.get\(\)/)) {
                     console.log(`[OPTIONAL_GET] ${f}:${i+1} - ${line.trim()}`);
                 }
            }
            if (line.includes('new Random()')) {
                 console.log(`[INSECURE_RANDOM] ${f}:${i+1} - ${line.trim()}`);
            }
            if (line.includes('SimpleDateFormat')) {
                 console.log(`[SIMPLE_DATE_FORMAT] ${f}:${i+1} - ${line.trim()}`);
            }
            if (line.includes('Thread.sleep')) {
                 console.log(`[THREAD_SLEEP] ${f}:${i+1} - ${line.trim()}`);
            }
        });
    });
});
