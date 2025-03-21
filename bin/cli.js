#!/usr/bin/env node

const { program } = require('commander');
const { createCommand } = require('../src/commands/create');
const { initCommand } = require('../src/commands/init');
const packageJson = require('../package.json');

program
  .name('create-nextjs-mfe')
  .description('CLI to create Next.js micro-frontend applications')
  .version(packageJson.version);

program
  .command('init')
  .description('Initialize a new micro-frontend workspace')
  .action(initCommand);

program
  .command('create')
  .description('Create a new micro-frontend application')
  .argument('<name>', 'Name of the micro-frontend')
  .option('-p, --port <port>', 'Port number for the micro-frontend', '3000')
  .option('-t, --type <type>', 'Type of app: host or remote', 'remote')
  .option('-r, --remotes <remotes>', 'Remote apps to connect (comma-separated)', '')
  .action(createCommand);

program.parse(); 