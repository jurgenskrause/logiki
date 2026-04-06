import fs from 'fs/promises';
import path from 'path';

async function processDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
      let content = await fs.readFile(fullPath, 'utf8');
      
      let modified = false;

      // 4 levels
      if (content.match(/['"]\.\.\/\.\.\/\.\.\/\.\.\/(engine|utils|types)\/(.*?)['"]/g)) {
        content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\/\.\.\/(engine|utils|types)\/(.*?)['"]/g, "from '../../../../../shared/$1/$2'");
        modified = true;
      }
      // 3 levels
      if (content.match(/['"]\.\.\/\.\.\/\.\.\/(engine|utils|types)\/(.*?)['"]/g)) {
        content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\/(engine|utils|types)\/(.*?)['"]/g, "from '../../../../shared/$1/$2'");
        modified = true;
      }
      // 2 levels
      if (content.match(/['"]\.\.\/\.\.\/(engine|utils|types)\/(.*?)['"]/g)) {
        content = content.replace(/from\s+['"]\.\.\/\.\.\/(engine|utils|types)\/(.*?)['"]/g, "from '../../../shared/$1/$2'");
        modified = true;
      }
      // 1 level
      if (content.match(/['"]\.\.\/(engine|utils|types)\/(.*?)['"]/g)) {
        content = content.replace(/from\s+['"]\.\.\/(engine|utils|types)\/(.*?)['"]/g, "from '../../shared/$1/$2'");
        modified = true;
      }

      if (modified) {
        await fs.writeFile(fullPath, content);
        console.log(`Updated deeper imports for ${fullPath}`);
      }
    }
  }
}

processDirectory('./src/client').catch(console.error);
