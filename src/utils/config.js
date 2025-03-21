function createHostConfig(name, remotes) {
  const remotesConfig = remotes.reduce((acc, remote) => {
    acc[remote] = `${remote}@http://localhost:3000/_next/static/${remote}/remoteEntry.js`;
    return acc;
  }, {});

  return `
const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

module.exports = {
  name: '${name}',
  filename: 'static/chunks/remoteEntry.js',
  remotes: ${JSON.stringify(remotesConfig, null, 2)},
  shared: {
    react: {
      singleton: true,
      requiredVersion: false,
    },
    'react-dom': {
      singleton: true,
      requiredVersion: false,
    },
  },
};
`;
}

function createRemoteConfig(name) {
  return `
const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

module.exports = {
  name: '${name}',
  filename: 'static/chunks/remoteEntry.js',
  exposes: {
    './counter': './src/components/exposed/Counter.tsx',
  },
  shared: {
    react: {
      singleton: true,
      requiredVersion: false,
    },
    'react-dom': {
      singleton: true,
      requiredVersion: false,
    },
  },
};
`;
}

module.exports = {
  createHostConfig,
  createRemoteConfig
}; 