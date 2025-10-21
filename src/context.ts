import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

export function getFileTree(rootDir: string = process.cwd()): any[] {
  function buildTree(dirPath: string): any[] {
    const items = readdirSync(dirPath).filter(item => 
      !['node_modules', 'dist', '.git'].includes(item) && !item.startsWith('.')
    );
    
    return items.map(item => {
      const fullPath = join(dirPath, item);
      const stats = statSync(fullPath);
      
      if (stats.isDirectory()) {
        return {
          name: item,
          path: relative(process.cwd(), fullPath),
          isDirectory: true,
          children: buildTree(fullPath)
        };
      } else {
        return {
          name: item,
          path: relative(process.cwd(), fullPath),
          isDirectory: false
        };
      }
    });
  }
  
  return buildTree(rootDir);
}

export function getFileTreeString(rootDir: string = process.cwd()): string {
  function buildTree(dirPath: string, prefix: string = ''): string {
    const items = readdirSync(dirPath).filter(item => 
      !['node_modules', 'dist', '.git'].includes(item) && !item.startsWith('.')
    );
    
    let result = '';
    items.forEach((item, index) => {
      const fullPath = join(dirPath, item);
      const isLast = index === items.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');
      
      if (statSync(fullPath).isDirectory()) {
        result += `${prefix}${connector}📁 ${item}\n`;
        result += buildTree(fullPath, nextPrefix);
      } else {
        result += `${prefix}${connector}📄 ${item}\n`;
      }
    });
    
    return result;
  }
  
  return `File Tree (${rootDir})\n${'='.repeat(50)}\n${buildTree(rootDir)}`;
}

export function getFileList(rootDir: string = process.cwd()): string[] {
  const files: string[] = [];
  
  function scanDir(dirPath: string) {
    const items = readdirSync(dirPath).filter(item => 
      !['node_modules', 'dist', '.git'].includes(item) && !item.startsWith('.')
    );
    
    items.forEach(item => {
      const fullPath = join(dirPath, item);
      if (statSync(fullPath).isDirectory()) {
        scanDir(fullPath);
      } else {
        files.push(relative(process.cwd(), fullPath));
      }
    });
  }
  
  scanDir(rootDir);
  return files.sort();
}
