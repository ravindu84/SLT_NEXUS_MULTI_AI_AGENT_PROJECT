const https = require('https');
https.get("https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyAk3bwCmXfzGgdjvrX7Nufo0UwgfSY1JEs", (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const models = JSON.parse(data).models;
    console.log("AVAILABLE 2.0 MODELS:");
    if(models) models.filter(m => m.name.includes('2.0')).forEach(m => console.log(m.name));
    else console.log(data);
  });
});
