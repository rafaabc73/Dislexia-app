import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const assetsDir = path.join(distDir, 'assets');

// 1. Copy compiled Tailwind CSS from dist/assets/*.css to dist/app.css
let compiledCss = '';
if (fs.existsSync(assetsDir)) {
  const cssFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.css'));
  if (cssFiles.length > 0) {
    compiledCss = fs.readFileSync(path.join(assetsDir, cssFiles[0]), 'utf8');
    fs.writeFileSync(path.join(distDir, 'app.css'), compiledCss, 'utf8');
    console.log('Copied compiled CSS to dist/app.css');
  }
}

// 2. Bundle src/main.tsx into a single classic IIFE script dist/app.js
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

const compiledJs = fs.readFileSync(path.join(distDir, 'app.js'), 'utf8');

// 3. Generate a 100% self-contained dist/standalone.html (inlines CSS and JS so native installers never fail on relative paths)
const safeJsForInline = compiledJs.replace(/<\/script>/gi, '<\\/script>');
const standaloneHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
    <meta name="color-scheme" content="light dark" />
    <script>
      try {
        document.querySelector('meta[name="color-scheme"]').content =
          localStorage.getItem('color-scheme') ?? 'light dark';
      } catch (e) {}
    </script>
    <title>Dislexia App — Estudo Limpo e Focado</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lexend:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <style>${compiledCss}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>${safeJsForInline}</script>
  </body>
</html>`;

fs.writeFileSync(path.join(distDir, 'standalone.html'), standaloneHtml, 'utf8');
console.log('Successfully generated standalone dist/app.js and dist/standalone.html!');
