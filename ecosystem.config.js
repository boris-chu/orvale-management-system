module.exports = {
  apps: [
    // Legacy JavaScript servers (for backward compatibility)
    {
      name: 'orvale-main',
      script: './servers/https-server.js',  // Use HTTPS server instead of npm start
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
        SSL_KEY_PATH: './deployment/ssl/private.key',
        SSL_CERT_PATH: './deployment/ssl/certificate.crt',
        SSL_CA_PATH: './deployment/ssl/ca-bundle.crt'
      },
      error_file: './servers/logs/main-error.log',
      out_file: './servers/logs/main-out.log',
      log_file: './servers/logs/main-combined.log',
      time: true,
      merge_logs: true
    },
    {
      name: 'orvale-socket',
      script: './servers/socket-server.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        SOCKET_PORT: 3001
      },
      error_file: './servers/logs/socket-error.log',
      out_file: './servers/logs/socket-out.log',
      log_file: './servers/logs/socket-combined.log',
      time: true,
      merge_logs: true
    },

    // New TypeScript unified server (recommended for new deployments)
    {
      name: 'orvale-unified',
      script: './servers/orvale-server.ts',
      interpreter: 'tsx',  // Use tsx for TypeScript execution
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
        SOCKET_PORT: 3001, // Socket.io on same HTTPS server
        SSL_KEY_PATH: './deployment/ssl/private.key',
        SSL_CERT_PATH: './deployment/ssl/certificate.crt',
        SSL_CA_PATH: './deployment/ssl/ca-bundle.crt',
        SSL_PFX_PATH: './deployment/ssl/server.pfx',
        SSL_PFX_PASSWORD: 'orvale2024'
      },
      error_file: './servers/logs/unified-error.log',
      out_file: './servers/logs/unified-out.log',
      log_file: './servers/logs/unified-combined.log',
      time: true,
      merge_logs: true
    }
  ]
};