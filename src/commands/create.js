const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const ora = require('ora');
const { execSync } = require('child_process');

async function createApp(name, options, isRemote, port) {
  const targetDir = path.join(process.cwd(), 'apps', name);
  
  try {
    // Create Next.js app with specific Next.js version
    execSync(
      `npx create-next-app@latest "${name}" --typescript --tailwind --eslint --app --src-dir --use-npm --no-git`,
      { 
        stdio: 'inherit',
        cwd: path.join(process.cwd(), 'apps')
      }
    );

    // Update package.json
    const packageJsonPath = path.join(targetDir, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    
    // Update dependencies to use Next.js 13
    packageJson.dependencies = {
      ...packageJson.dependencies,
      "next": "13.5.6",
      "react": "18.2.0",
      "react-dom": "18.2.0",
      "@module-federation/nextjs-mf": "7.0.8",
      "@module-federation/utilities": "3.0.5",
      "webpack": "5.89.0",
      "geist": "^1.2.0"
    };

    packageJson.name = name;
    packageJson.scripts = {
      ...packageJson.scripts,
      dev: 'next dev',
    };

    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

    // Create module federation config
    const remotesList = options.remotes || [];
    const mfConfig = `
const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

const remotes = {
  ${!isRemote ? remotesList.map(remote => 
    `${remote}: '${remote}@http://localhost:${3001 + remotesList.indexOf(remote)}/remoteEntry.js'`
  ).join(',\n  ') : ''}
};

console.log("Remotes:", remotes);

module.exports = {
  name: '${name}',
  filename: 'remoteEntry.js',
  ${!isRemote ? 'remotes,' : `
  exposes: {
    './counter': './src/components/exposed/Counter.tsx',
    './card': './src/components/exposed/Card.tsx',
  },`}
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
};`;

    await fs.writeFile(
      path.join(targetDir, 'module-federation.config.js'),
      mfConfig
    );

    // Create next.config.js
    const nextConfig = `
const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, options) => {
    const { isServer } = options;
    const federationConfig = require('./module-federation.config.js');
    
    config.plugins = config.plugins || [];

    if (!isServer) {
      config.plugins.push(new NextFederationPlugin(federationConfig));
    }

    return config;
  },
};

module.exports = nextConfig;`;

    await fs.writeFile(
      path.join(targetDir, 'next.config.js'),
      nextConfig
    );

    // Create components for remote apps
    if (isRemote) {
      const componentsDir = path.join(targetDir, 'src', 'components', 'exposed');
      await fs.ensureDir(componentsDir);

      // Create Counter component
      const counterComponent = `
'use client';

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4 border rounded-lg shadow-md">
      <h2 className="text-xl font-bold">Counter from ${name}</h2>
      <p className="mt-2">Count: {count}</p>
      <button
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => setCount(count + 1)}
      >
        Increment
      </button>
    </div>
  );
}`;

      await fs.writeFile(
        path.join(componentsDir, 'Counter.tsx'),
        counterComponent
      );

      // Create Card component
      const cardComponent = `
'use client';

interface CardProps {
  title?: string;
  description?: string;
}

export default function Card({ 
  title = "Card from ${name}", 
  description = "This is a card component exposed from ${name}" 
}: CardProps) {
  return (
    <div className="p-6 max-w-sm bg-white rounded-xl shadow-md flex flex-col space-y-4">
      <h3 className="text-xl font-medium text-black">{title}</h3>
      <p className="text-gray-500">{description}</p>
      <button className="px-4 py-2 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600">
        Learn More
      </button>
    </div>
  );
}`;

      await fs.writeFile(
        path.join(componentsDir, 'Card.tsx'),
        cardComponent
      );
    }

    // In the createApp function, add this before creating page.tsx for the host app
    if (!isRemote) {
      // Create types directory and declaration file
      const typesDir = path.join(targetDir, 'src', 'types');
      await fs.ensureDir(typesDir);

      // Create remote modules type declarations
      const remoteTypesContent = `
declare module '${remotesList.join("/counter';\ndeclare module '")}/counter' {
  const Counter: React.ComponentType;
  export default Counter;
}
`;

      await fs.writeFile(
        path.join(typesDir, 'remote-modules.d.ts'),
        remoteTypesContent
      );

      // Update tsconfig.json to include the types
      const tsconfigPath = path.join(targetDir, 'tsconfig.json');
      const tsconfig = await fs.readJSON(tsconfigPath);
      
      tsconfig.include = [
        ...tsconfig.include || [],
        "src/types/**/*.d.ts"
      ];

      await fs.writeJSON(tsconfigPath, tsconfig, { spaces: 2 });

      // Then continue with creating page.tsx...
      const pageContent = `
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

${remotesList.map(remote => {
  const counterName = remote.charAt(0).toUpperCase() + remote.slice(1) + 'Counter';
  const cardName = remote.charAt(0).toUpperCase() + remote.slice(1) + 'Card';
  return `const ${counterName} = dynamic(
  async () => {
    // @ts-ignore
    const container = await import('${remote}/counter');
    return container.default;
  },
  {
    ssr: false,
    loading: () => <div>Loading ${remote} counter...</div>
  }
);

const ${cardName} = dynamic(
  async () => {
    // @ts-ignore
    const container = await import('${remote}/card');
    return container.default;
  },
  {
    ssr: false,
    loading: () => <div>Loading ${remote} card...</div>
  }
);`;
}).join('\n\n')}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold mb-8">Host App: ${name}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        ${remotesList.map(remote => {
          const counterName = remote.charAt(0).toUpperCase() + remote.slice(1) + 'Counter';
          const cardName = remote.charAt(0).toUpperCase() + remote.slice(1) + 'Card';
          return `
        <div key="${remote}" className="space-y-8">
          <h2 className="text-2xl font-semibold">Components from ${remote}</h2>
          <Suspense fallback={<div>Loading ${remote} counter...</div>}>
            <${counterName} />
          </Suspense>
          <Suspense fallback={<div>Loading ${remote} card...</div>}>
            <${cardName} />
          </Suspense>
        </div>`;
        }).join('\n')}
      </div>
    </main>
  );
}`;

      await fs.writeFile(
        path.join(targetDir, 'src', 'app', 'page.tsx'),
        pageContent
      );

      // Create .env.local file
      const envContent = remotesList.map(remote => 
        `NEXT_PUBLIC_${remote.toUpperCase()}_URL=http://localhost:${3001 + remotesList.indexOf(remote)}`
      ).join('\n');

      await fs.writeFile(
        path.join(targetDir, '.env.local'),
        envContent
      );

      // Create bootstrap.js file for module federation
      const bootstrapContent = `
import { injectScript } from '@module-federation/nextjs-mf/utils';

// This is needed for module federation
window.initialRemotes = {
  ${remotesList.map(remote => 
    `'${remote}': 'http://localhost:${3001 + remotesList.indexOf(remote)}/remoteEntry.js'`
  ).join(',\n  ')}
};

export async function initializeApp() {
  for (const [remote, url] of Object.entries(window.initialRemotes)) {
    await injectScript({
      global: remote,
      url: url,
    });
  }
}

initializeApp();
`;

      await fs.writeFile(
        path.join(targetDir, 'src', 'bootstrap.js'),
        bootstrapContent
      );

      // Create initialization files for module federation
      const initDir = path.join(targetDir, 'src', 'app');
      await fs.ensureDir(initDir);

      // Create init-remote.js
      const initRemoteContent = `
import { initFederation } from '@module-federation/nextjs-mf/utils';

export const initRemote = () => {
  return initFederation({
    remoteType: '${isRemote ? 'remote' : 'host'}',
    isServer: typeof window === 'undefined',
  });
};
`;

      await fs.writeFile(
        path.join(initDir, 'init-remote.js'),
        initRemoteContent
      );

      // Create layout.tsx with Geist font configuration
      const layoutContent = `
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={\`\${GeistSans.variable} \${GeistMono.variable}\`}>
      <body className={GeistSans.className}>
        {children}
      </body>
    </html>
  );
}
`;

      await fs.writeFile(
        path.join(targetDir, 'src', 'app', 'layout.tsx'),
        layoutContent
      );

      // Add this to the createApp function
      const publicDir = path.join(targetDir, 'public');
      await fs.ensureDir(publicDir);

      // Create empty remoteEntry.js
      await fs.writeFile(
        path.join(publicDir, 'remoteEntry.js'),
        ''
      );

      // Add this to the createApp function
      const nextEnvContent = `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
`;

      await fs.writeFile(
        path.join(targetDir, 'next-env.d.ts'),
        nextEnvContent
      );
    }

    // Create .env file with port configuration
    const envContent = `PORT=${port}`;

    await fs.writeFile(
      path.join(targetDir, '.env'),
      envContent
    );

    return true;
  } catch (error) {
    console.error(`Error creating ${name}:`, error);
    // Clean up on error
    if (await fs.pathExists(targetDir)) {
      await fs.remove(targetDir);
    }
    return false;
  }
}

async function createCommand(name, options) {
  const spinner = ora('Creating micro-frontend applications...').start();

  try {
    // Ensure apps directory exists
    await fs.ensureDir(path.join(process.cwd(), 'apps'));
    
    // Process remotes string once and validate
    // Trim any whitespace and split by comma
    const remotesList = options.remotes ? 
      options.remotes.trim().split(/\s*,\s*/).filter(Boolean) : [];

      console.log("Parsed remote apps list:", remotesList);
    
    // Validate remote names
    const invalidRemotes = remotesList.filter(remote => !/^[a-zA-Z0-9-]+$/.test(remote));
    if (invalidRemotes.length > 0) {
      throw new Error(`Invalid remote name(s): ${invalidRemotes.join(', ')}\nRemote names can only contain letters, numbers, and hyphens.`);
    }

    // Log the remotes being created
    console.log(chalk.blue(`Creating host app with remotes: ${remotesList.join(', ')}`));

    // Create host app
    spinner.text = `Creating host app: ${name}`;
    const hostSuccess = await createApp(name, { ...options, remotes: remotesList }, false, options.port);
    if (!hostSuccess) {
      throw new Error('Failed to create host app');
    }

    // Create remote apps
    for (const remote of remotesList) {
      spinner.text = `Creating remote app: ${remote}`;
      const remotePort = 3001 + remotesList.indexOf(remote);
      // Pass an empty array for remotes in remote apps
      const remoteSuccess = await createApp(remote, { ...options, remotes: [] }, true, remotePort);
      if (!remoteSuccess) {
        throw new Error(`Failed to create remote app: ${remote}`);
      }
    }

    spinner.succeed(chalk.green('Successfully created all applications'));
    
    // Show instructions with correct paths
    console.log(chalk.blue(`
To get started:

1. Install dependencies for all apps:
${[name, ...remotesList].map(app => `
cd apps/${app}
npm install --legacy-peer-deps
cd ..`).join('\n')}

2. Start the remote apps first:
${remotesList.map((remote, index) => `
cd apps/${remote}
npm run dev  # Will run on port ${3001 + index}`).join('\n')}

3. Then start the host app:
cd apps/${name}
npm run dev  # Will run on port ${options.port}

Note: Make sure to use comma-separated values without spaces for remote names.
Example: --remotes remote1,remote2
    `));

  } catch (error) {
    spinner.fail(chalk.red('Error creating micro-frontend applications:'));
    console.error(error.message);
    // Clean up on error
    const appsDir = path.join(process.cwd(), 'apps');
    if (await fs.pathExists(appsDir)) {
      await fs.remove(appsDir);
    }
    process.exit(1);
  }
}

module.exports = { createCommand }; 