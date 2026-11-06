import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const YEARS = [
  '2025 - 6º Ano',
  '2026 - 7º Ano',
  '2027 - 8º Ano',
  '2028 - 9º Ano',
  'Ensino Médio - 1º Ano',
  'Ensino Médio - 2º Ano',
  'Ensino Médio - 3º Ano',
];

const SUBJECTS = [
  'Informacoes_Gerais_Boletim',
  'Lingua_Portuguesa',
  'Matematica',
  'Ciencias_Biologia',
  'Historia',
  'Geografia',
  'Lingua_Inglesa',
  'Fisica',
  'Quimica',
  'Redacao_e_Leitura',
  'Artes',
];

const SUBJECT_FOLDER_MAP = {
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

const MONTHS = [
  '01_Janeiro',
  '02_Fevereiro',
  '03_Marco',
  '04_Abril',
  '05_Maio',
  '06_Junho',
  '07_Julho',
  '08_Agosto',
  '09_Setembro',
  '10_Outubro',
  '11_Novembro',
  '12_Dezembro',
];

const MONTH_FOLDER_MAP = {
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

export function ensurePhysicalFoldersOnDisk(rootDir = process.cwd()) {
  const baseFolder = path.join(rootDir, 'Pastas_do_Aluno');
  for (const year of YEARS) {
    for (const subj of SUBJECTS) {
      const subjPath = path.join(baseFolder, year, subj);
      fs.mkdirSync(path.join(subjPath, 'Provas'), { recursive: true });
      for (const month of MONTHS) {
        fs.mkdirSync(path.join(subjPath, month), { recursive: true });
      }
    }
  }
  return baseFolder;
}

export const ensurePhysicalFoldersExist = ensurePhysicalFoldersOnDisk;

export function saveFileToPhysicalFolder(rootDir, payload) {
  const baseDir = ensurePhysicalFoldersOnDisk(rootDir);
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
  const finalName = datePrefix ? `${datePrefix}_${safeFileName}` : safeFileName;
  const fullFilePath = path.join(targetFolder, finalName);

  if (payload.dataUrl && String(payload.dataUrl).includes(',')) {
    const base64Data = String(payload.dataUrl).split(',')[1];
    fs.writeFileSync(fullFilePath, Buffer.from(base64Data, 'base64'));
  } else if (payload.extractedText) {
    fs.writeFileSync(fullFilePath, String(payload.extractedText), 'utf8');
  }

  return fullFilePath;
}

if (
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])
) {
  const createdPath = ensurePhysicalFoldersOnDisk();
  console.log(`Estrutura física de pastas garantida no computador em: ${createdPath}`);
}
