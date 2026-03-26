const fs = require('fs');
const logFile = './trade-log.json';

export function logTrade(entry: any) {
  let history = [];
  if (fs.existsSync(logFile)) {
    history = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  }
  history.push(entry);
  fs.writeFileSync(logFile, JSON.stringify(history, null, 2));
}
