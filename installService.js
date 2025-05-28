const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'SCMP Node Media Service',
  description: 'Local SCMP media player service for Windows',
  script: path.join(__dirname, 'service.js'),
});

svc.on('install', () => {
  console.log('Service installed');
  svc.start();
});

svc.install();
