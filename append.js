const fs = require('fs');
let content = fs.readFileSync('complete_api.md', 'utf8');
content += `
## 10. Contact Us (\`/api/contact\`)

### 10.1 Submit Contact Form
- **Endpoint**: \`POST /api/contact\`
- **Auth**: None (Public)
- **Payload**:
  \`\`\`json
  {
    "name": "Abdullah Siraj",
    "email": "name@example.com",
    "message": "Hello, I want to inquire about your services."
  }
  \`\`\`
- **Response**: \`{ "message": "Your message has been sent successfully!" }\`
`;
fs.writeFileSync('complete_api.md', content);
