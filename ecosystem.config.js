module.exports = {
  apps: [
    {
      name: 'padel-tour',
      script: 'npm',
      args: 'start',
      cwd: '/home/ubuntu/Sito-Padel',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
