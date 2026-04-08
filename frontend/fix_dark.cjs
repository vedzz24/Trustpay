const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src');

const walk = (d) => {
  let results = [];
  const list = fs.readdirSync(d);
  list.forEach(file => {
    file = path.join(d, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx') || file.endsWith('.css') || file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
};

const files = walk(dir);

const replacements = [
  { match: /dark:bg-cyan-600/g, replace: 'dark:bg-slate-900' },
  { match: /dark:bg-cyan-500/g, replace: 'dark:bg-slate-800' },
  { match: /dark:text-white/g, replace: 'dark:text-slate-100' },
  { match: /dark:border-cyan-400/g, replace: 'dark:border-slate-700' },
  { match: /dark:border-cyan-500/g, replace: 'dark:border-slate-600' },
  { match: /dark:border-cyan-600/g, replace: 'dark:border-slate-700' },
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  replacements.forEach(r => {
    content = content.replace(r.match, r.replace);
  });
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated dark theme: ${file}`);
  }
});
