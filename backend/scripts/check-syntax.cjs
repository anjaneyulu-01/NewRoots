const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.js')) results.push(file);
  });
  return results;
}

const srcDir = path.resolve(__dirname, '..', 'src');
const files = walk(srcDir);
let ok = true;
files.forEach((f) => {
  try {
    console.log('Checking', f);
    execSync(`node --check "${f}"`, { stdio: 'inherit' });
  } catch (e) {
    ok = false;
    console.error('Syntax error in', f);
  }
});
if (!ok) process.exit(2);
console.log('All files passed node --check');
