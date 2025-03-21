const fs = require('fs-extra');
const path = require('path');

async function copyTemplate(templatePath, targetPath) {
  try {
    if (await fs.pathExists(templatePath)) {
      await fs.copy(templatePath, targetPath, {
        overwrite: true,
        errorOnExist: false,
      });
    }
  } catch (error) {
    console.error('Error copying template:', error);
    throw error;
  }
}

module.exports = {
  copyTemplate,
}; 