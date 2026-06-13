const https = require('https');
https.get("https://generativelanguage.googleapis.com/v1alpha/models?key=AIzaSyAk3bwCmXfzGgdjvrX7Nufo0UwgfSY1JEs", (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const models = JSON.parse(data).models;
    if(models) models.filter(m => m.name.includes('gemini-2.0')).forEach(m => console.log(m.name, m.supportedGenerationMethods));
  });
});
