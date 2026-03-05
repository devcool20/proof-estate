const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('frontend/src');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace #F3E5AB in tailwind classes
    content = content.replace(/\[#F3E5AB\]/g, 'primary-light');
    
    // Replace hex in javascript string or styles
    content = content.replace(/['"]#F3E5AB['"]/g, '`var(--brand-primary-light)`');
    content = content.replace(/#D4AF37/g, 'var(--brand-primary)');
    content = content.replace(/#F3E5AB/g, 'var(--brand-primary-light)');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Updated: ' + file);
    }
});
