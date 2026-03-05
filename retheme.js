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

    // Replace #D4AF37 in tailwind classes
    content = content.replace(/\[#D4AF37\]/g, 'primary');
    
    // Replace hex in javascript string or styles
    content = content.replace(/['"]#D4AF37['"]/g, '`var(--color-primary)`');

    // Replace rgb shadows - tailwind v4 can use rgba(var(--color-primary-rgb), alpha) if we define --color-primary-rgb
    content = content.replace(/rgba\(212,175,55,([0-9.]+)\)/g, 'rgba(var(--color-primary-rgb),$1)');
    content = content.replace(/rgba\(212, 175, 55, ([0-9.]+)\)/g, 'rgba(var(--color-primary-rgb), $1)');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Updated: ' + file);
    }
});
