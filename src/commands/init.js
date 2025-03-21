const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

async function initCommand() {
  const spinner = ora('Initializing micro-frontend workspace...').start();

  try {
    // Create workspace structure
    await fs.ensureDir('apps');
    await fs.ensureDir('packages');

    // Create root package.json if it doesn't exist
    const rootPackageJson = {
      name: 'nextjs-mfe-workspace',
      private: true,
      workspaces: [
        'apps/*',
        'packages/*'
      ],
      scripts: {
        dev: 'turbo run dev',
        build: 'turbo run build',
        start: 'turbo run start',
        lint: 'turbo run lint'
      },
      devDependencies: {
        turbo: "^1.10.0"
      }
    };

    await fs.writeJSON('package.json', rootPackageJson, { spaces: 2 });

    spinner.succeed(chalk.green('Workspace initialized successfully!'));
    
    console.log(chalk.blue(`
Next steps:
  1. npm install
  2. create-nextjs-mfe create host-app --type host --remotes remote1,remote2
  3. create-nextjs-mfe create remote1 --type remote --port 3001
    `));

  } catch (error) {
    spinner.fail(chalk.red('Error initializing workspace:'));
    console.error(error);
    process.exit(1);
  }
}

module.exports = { initCommand }; 