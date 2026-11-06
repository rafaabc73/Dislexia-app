import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const assetsDir = path.join(distDir, 'assets');

// 1. Copy compiled Tailwind CSS from dist/assets/*.css to dist/app.css
if (fs.existsSync(assetsDir)) {
  const cssFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.css'));
  if (cssFiles.length > 0) {
    const cssContent = fs.readFileSync(path.join(assetsDir, cssFiles[0]), 'utf8');
    fs.writeFileSync(path.join(distDir, 'app.css'), cssContent, 'utf8');
    console.log('Copied compiled CSS to dist/app.css');
  }
}

// 2. Bundle src/main.tsx into a single classic IIFE script dist/app.js so index.html works via file:// double-click!
await esbuild.build({
  entryPoints: [path.join(rootDir, 'src/main.tsx')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  outfile: path.join(distDir, 'app.js'),
  minify: true,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.css': 'empty',
  },
});

console.log('Successfully generated standalone dist/app.js for direct index.html opening!');

