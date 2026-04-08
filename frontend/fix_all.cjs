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
  // generic bounds
  { match: /brown-100/g, replace: 'slate-100' },
  { match: /brown-200/g, replace: 'slate-300' },
  { match: /brown-300/g, replace: 'slate-500' },
  { match: /brown-400/g, replace: 'cyan-500' },
  { match: /brown-500/g, replace: 'cyan-600' },
  { match: /brown-600/g, replace: 'cyan-700' },
  
  { match: /cream-50/g, replace: 'slate-50' },
  { match: /cream-100/g, replace: 'white' },
  { match: /cream-200/g, replace: 'slate-100' },
  { match: /cream-300/g, replace: 'slate-200' },
  { match: /cream-400/g, replace: 'slate-300' },
  { match: /cream-500/g, replace: 'slate-400' },
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  replacements.forEach(r => {
    content = content.replace(r.match, r.replace);
  });
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Fully modernized: ${file}`);
  }
});
