import fs from 'fs';

// Read the correct private key from phantom_key.json
const phantomData = JSON.parse(fs.readFileSync('phantom_key.json', 'utf8'));
const privateKeyArray = phantomData.privateKey;

console.log('✅ Private key length:', privateKeyArray.length);
console.log('✅ Expected address:', phantomData.address);

// Format as environment variable
const envValue = JSON.stringify(privateKeyArray);

// Read current .env file
let envContent = fs.readFileSync('.env', 'utf8');

// Replace the PHANTOM_PRIVATE_KEY line
const newEnvContent = envContent.replace(
  /PHANTOM_PRIVATE_KEY=.*/,
  `PHANTOM_PRIVATE_KEY=${envValue}`
);

// Write back to .env
fs.writeFileSync('.env', newEnvContent);

console.log('✅ Fixed PHANTOM_PRIVATE_KEY in .env file');
console.log('✅ New length:', envValue.length, 'characters');