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

export function ensurePhysicalFoldersOnDisk(rootDir = process.cwd()) {
  const baseFolder = path.join(rootDir, 'Pastas_do_Aluno');
  for (const year of YEARS) {
    for (const subj of SUBJECTS) {
      const subjPath = path.join(baseFolder, year, subj);
      fs.mkdirSync( path.join(subjPath, 'Provas'), { recursive: true });
      for (const month of MONTHS) {
        fs.mkdirSync(path.join(subjPath, month), { recursive: true });
      }
    }
  }
  return baseFolder;
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  const createdPath = ensurePhysicalFoldersOnDisk();
  console.log(`Estrutura física de pastas garantida no computador em: ${createdPath}`);
}
