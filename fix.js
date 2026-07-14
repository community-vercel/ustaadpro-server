const fs = require('fs');
let code = fs.readFileSync('serviceSeed.js', 'utf8');

const s1 = 'for (const service of services) {\\n    await copyFile(';
const r1 = 'for (const service of services) {\\n    if (service.publicFile && !service.publicFile.startsWith("http")) {\\n      await copyFile(';
code = code.replace(s1, r1);

const s2 = 'path.join(publicImageDir, service.publicFile),\\n    );\\n  }';
const r2 = 'path.join(publicImageDir, service.publicFile),\\n      );\\n    }\\n  }';
code = code.replace(s2, r2);

const s3 = '`${publicImageBase}/${service.publicFile}`';
const r3 = '(service.publicFile && service.publicFile.startsWith("http") ? service.publicFile : `${publicImageBase}/${service.publicFile}`)';
code = code.split(s3).join(r3);

fs.writeFileSync('serviceSeed.js', code);
