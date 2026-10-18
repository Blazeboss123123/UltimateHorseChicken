// Bundles public/index.html + Phaser + all game scripts into one self-contained HTML file.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'public');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<script src="([^"]+)"><\/script>\n?/g, (m, src) => {
  const code = fs.readFileSync(path.join(root, src.split('?')[0]), 'utf8').replace(/<\/script/gi, '<\\/script');
  return '<script>/* ' + src.split('?')[0] + ' */\n' + code + '\n</script>\n';
});
const out = path.join(__dirname, '..', 'dist', 'ultimate-horse-chicken.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('Wrote ' + out + ' (' + Math.round(html.length / 1024) + ' KB)');
