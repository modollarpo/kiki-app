// Configure React Native build for enterprise deployment
const fs = require('fs');
const path = require('path');

// Ensure native directories exist
const iosDir = path.join(__dirname, 'ios', 'KIKIMobile');
const androidDir = path.join(__dirname, 'android', 'app');

if (!fs.existsSync(iosDir)) {
  console.log('iOS directory not found, creating basic structure...');
  fs.mkdirSync(iosDir, { recursive: true });
  fs.mkdirSync(path.join(iosDir, 'Supporting Files'), { recursive: true });
}

if (!fs.existsSync(androidDir)) {
  console.log('Android directory not found, creating basic structure...');
  fs.mkdirSync(path.join(androidDir, 'src', 'main'), { recursive: true });
  fs.mkdirSync(path.join(androidDir, 'src', 'main', 'java', 'com', 'kiki', 'mobile'), { recursive: true });
  fs.mkdirSync(path.join(androidDir, 'src', 'main', 'res', 'layout'), { recursive: true });
  fs.mkdirSync(path.join(androidDir, 'src', 'main', 'res', 'values'), { recursive: true });
}

console.log('React Native build configuration complete');
