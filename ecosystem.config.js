module.exports = {
  apps: [{
    name: 'mennica-bitrix-app',
    script: 'index.js',
    env: {
      PORT: 3000,
      NODE_ENV: 'production'
    },
    restart_delay: 3000,
    max_restarts: 10,
  }]
};
