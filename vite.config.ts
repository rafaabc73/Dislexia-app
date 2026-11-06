import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import { ensurePhysicalFoldersOnDisk } from './scripts/setup-folders.mjs';

const SUBJECT_FOLDER_MAP: Record<string, string> = {
  informacoes_gerais: 'Informacoes_Gerais_Boletim',
  portugues: 'Lingua_Portuguesa',
  matematica: 'Matematica',
  ciencias: 'Ciencias_Biologia',
  historia: 'Historia',
  geografia: 'Geografia',
  ingles: 'Lingua_Inglesa',
  fisica: 'Fisica',
  quimica: 'Quimica',
  redacao: 'Redacao_e_Leitura',
  artes: 'Artes',
};

const MONTH_FOLDER_MAP: Record<number, string> = {
  1: '01_Janeiro',
  2: '02_Fevereiro',
  3: '03_Marco',
  4: '04_Abril',
  5: '05_Maio',
  6: '06_Junho',
  7: '07_Julho',
  8: '08_Agosto',
  9: '09_Setembro',
  10: '10_Outubro',
  11: '11_Novembro',
  12: '12_Dezembro',
};

export default defineConfig({
  plugins: [
    {
      name: 'vite-entry-transform',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          return html
            .replace('<link rel="stylesheet" href="./dist/app.css" />', '')
            .replace(
              '<script defer src="./dist/app.js"></script>',
              '<script type="module" src="/src/main.tsx"></script>'
            );
        },
      },
    },
    react(),
    tailwindcss(),
    {
      name: 'local-disk-folders-plugin',
      configureServer(server) {
        const baseDir = ensurePhysicalFoldersOnDisk(process.cwd());

        server.middlewares.use('/api/local-fs', (req, res) => {
          res.setHeader('Content-Type', 'application/json');

          if (req.method === 'GET' && req.url?.startsWith('/status')) {
            res.end(JSON.stringify({ ok: true, baseDir }));
            return;
          }

          if (req.method === 'POST' && req.url?.startsWith('/save')) {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const payload = JSON.parse(body);
                const yearDir = payload.year || '2026 - 7º Ano';
                const subjDir =
                  SUBJECT_FOLDER_MAP[payload.subjectId] || payload.subjectId || 'Geral';
                const subFolder = payload.isExam
                  ? 'Provas'
                  : MONTH_FOLDER_MAP[Number(payload.month) || 1] || '01_Janeiro';

                const targetFolder = path.join(baseDir, yearDir, subjDir, subFolder);
                fs.mkdirSync(targetFolder, { recursive: true });

                const safeFileName = String(payload.fileName || 'documento.pdf').replace(
                  /[^a-zA-Z0-9._-]/g,
                  '_'
                );
                const datePrefix = String(payload.formattedDate || '')
                  .replace(/\//g, '-')
                  .trim();
                const finalName = datePrefix
                  ? `${datePrefix}_${safeFileName}`
                  : safeFileName;
                const fullFilePath = path.join(targetFolder, finalName);

                if (payload.dataUrl && String(payload.dataUrl).includes(',')) {
                  const base64Data = String(payload.dataUrl).split(',')[1];
                  fs.writeFileSync(fullFilePath, Buffer.from(base64Data, 'base64'));
                } else if (payload.extractedText) {
                  fs.writeFileSync(fullFilePath, String(payload.extractedText), 'utf8');
                }

                res.end(
                  JSON.stringify({
                    ok: true,
                    savedPath: fullFilePath,
                  })
                );
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ ok: false, error: err?.message }));
              }
            });
            return;
          }

          res.end(JSON.stringify({ ok: false }));
        });
      },
    },
  ],
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
});
