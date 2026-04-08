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
  // Typography and structure
  { match: /text-brown-600/g, replace: 'text-slate-800' },
  { match: /text-brown-500/g, replace: 'text-cyan-600' },
  { match: /text-brown-400/g, replace: 'text-slate-500' },
  { match: /border-brown-200/g, replace: 'border-slate-200' },
  { match: /border-brown-300/g, replace: 'border-slate-300' },
  { match: /border-brown-400/g, replace: 'border-cyan-200' },
  { match: /border-brown-600/g, replace: 'border-cyan-600' },
  
  // Backgrounds - light mode
  { match: /bg-cream-200/g, replace: 'bg-slate-50' },   // App background
  { match: /bg-cream-100/g, replace: 'bg-white' },      // Cards / containers
  { match: /bg-cream-300/g, replace: 'bg-slate-100' },  // Hovers / secondary borders
  { match: /bg-cream-400/g, replace: 'bg-slate-200' },
  
  // Forms & Inputs
  { match: /focus:ring-brown-400/g, replace: 'focus:ring-cyan-400' },
  { match: /focus:border-brown-400/g, replace: 'focus:border-cyan-400' },
  
  // Buttons
  { match: /bg-brown-600/g, replace: 'bg-cyan-600' },
  { match: /hover:bg-brown-500/g, replace: 'hover:bg-cyan-500' },
  { match: /text-cream-200/g, replace: 'text-white' },
  { match: /text-cream-100/g, replace: 'text-white' },
  
  // Dark mode transitions (make it dark slate instead of deep brown)
  { match: /dark:bg-brown-600/g, replace: 'dark:bg-slate-900' },
  { match: /dark:bg-brown-500/g, replace: 'dark:bg-slate-800' },
  { match: /dark:text-cream-200/g, replace: 'dark:text-slate-100' },
  { match: /dark:border-brown-400/g, replace: 'dark:border-slate-700' },
  { match: /dark:border-brown-500/g, replace: 'dark:border-slate-600' },
  
  // Any stray instances
  { match: /cream-200/g, replace: 'slate-50' },
  { match: /brown-600/g, replace: 'slate-800' },
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  replacements.forEach(r => {
    content = content.replace(r.match, r.replace);
  });
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated: ${file}`);
  }
});
