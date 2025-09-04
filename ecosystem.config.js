module.exports = {
  apps: [
    {
      name: 'orvale-main',
      script: './https-server.js',  // Use HTTPS server instead of npm start
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        HOSTNAME: 'localhost',
        HTTP_PORT: 80,     // HTTP redirect server
        HTTPS_PORT: 443,   // Main HTTPS server
        SSL_KEY_PATH: './ssl/private.key',
        SSL_CERT_PATH: './ssl/certificate.crt',
        SSL_CA_PATH: './ssl/ca-bundle.crt'
      },
      error_file: './logs/main-error.log',
      out_file: './logs/main-out.log',
      log_file: './logs/main-combined.log',
      time: true,
      merge_logs: true
    },
    {
      name: 'orvale-socket',
      script: './socket-server.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        SOCKET_PORT: 3001
      },
      error_file: './logs/socket-error.log',
      out_file: './logs/socket-out.log',
      log_file: './logs/socket-combined.log',
      time: true,
      merge_logs: true
    }
  ]
};