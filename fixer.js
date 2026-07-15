const fs = require('fs');
let content = fs.readFileSync('seed_parser.js', 'utf8');
content = content.replace(/(https?:\\\\\\/\\\\\\/.*)\\$\\/;/g, '/(https?:\\/\\/.*)$/;');
content = content.replace(/afterCat\\.match\\(\\/\\(https\\?:\\\\\\\\\\/\\\\\\\\\\/\\.\\*\\)\\$\\\\\\/\\)/g, 'afterCat.match(/(https?:\\/\\/.*)$/)');
// Let's just blindly replace the problematic lines
content = content.replace(/match\\(\\/\\[A-Za-z\\\\\\\\s\\]\\+\\?\\)\\s\\+\\(.*?\\)\\s\\+\\(\\\\\\\\d\\+\\)\\s\\+\\(.*?\\)\\s\\+\\(https\\?:\\\\\\\\\\/\\\\\\\\\\/\\.\\*\\)\\$\\/\\)/g, 'match(/^(?:\\\\d+\\\\s+)?([A-Za-z\\\\s]+?)\\\\s+(.*?)\\\\s+(\\\\d+)\\\\s+(.*?)\\\\s+(https?:\\\\/\\\\/.*)$/)');

// Actually, an easier way is to just write a simple script that matches the known bad lines and replaces them exactly.
const lines = content.split('\\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('afterCat.match')) {
    lines[i] = '  const urlMatch = afterCat.match(/(https?:\\/\\/.*)$/);';
  }
  if (lines[i].includes('withoutUrl.match')) {
    lines[i] = '  const priceUnitMatch = withoutUrl.match(/(.*)\\s+(\\d+)\\s+(.*)$/);';
  }
  if (lines[i].includes('const match = line.match')) {
    lines[i] = '  const match = line.match(/^(?:\\d+\\s+)?([A-Za-z\\s]+?)\\s+(.*?)\\s+(\\d+)\\s+(.*?)\\s+(https?:\\/\\/.*)$/);';
  }
}
fs.writeFileSync('seed_parser.js', lines.join('\\n'));
