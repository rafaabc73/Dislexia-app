import { StudyDocument } from '../types';
import { SCHOOL_YEARS, FIXED_SUBJECTS, MONTHS_PT } from '../constants/curriculum';

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

let directoryHandle: any = null;

export function hasLinkedDirectoryHandle(): boolean {
  return Boolean(directoryHandle);
}

export async function checkLocalDiskServerStatus(): Promise<string | null> {
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return null;
  }
  try {
    const res = await fetch('/api/local-fs/status');
    if (!res.ok) return null;
    const data = await res.json();
    return data?.ok ? data.baseDir : null;
  } catch {
    return null;
  }
}

/**
 * Cria toda a estrutura física de pastas no computador quando o usuário escolhe
 * uma pasta local (estilo "Open Folder" do VS Code) via File System Access API.
 */
export async function linkAndCreateComputerFolders(selectedYear: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
    alert(
      'Para vincular uma pasta específica pelo navegador, utilize Google Chrome ou Microsoft Edge no Computador (ou inicie pelo arquivo INICIAR_WINDOWS.bat / INICIAR_MAC.command, que já cria a pasta "Pastas_do_Aluno" automaticamente!).'
    );
    return null;
  }

  try {
    const rootHandle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
    });
    directoryHandle = rootHandle;

    const baseHandle = await rootHandle.getDirectoryHandle('Pastas_do_Aluno', {
      create: true,
    });

    const yearsToCreate = SCHOOL_YEARS.includes(selectedYear)
      ? [selectedYear]
      : SCHOOL_YEARS;

    for (const yr of yearsToCreate) {
      const yearHandle = await baseHandle.getDirectoryHandle(yr, { create: true });
      for (const subj of FIXED_SUBJECTS) {
        const subjFolderName = SUBJECT_FOLDER_MAP[subj.id] || subj.id;
        const subjHandle = await yearHandle.getDirectoryHandle(subjFolderName, {
          create: true,
        });
        await subjHandle.getDirectoryHandle('Provas', { create: true });
        for (const m of MONTHS_PT) {
          const monthFolderName = `${String(m.number).padStart(2, '0')}_${m.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')}`;
          await subjHandle.getDirectoryHandle(monthFolderName, { create: true });
        }
      }
    }

    return rootHandle.name || 'Pastas_do_Aluno';
  } catch {
    return null;
  }
}

/**
 * Salva fisicamente o arquivo PDF/Foto dentro da pasta correspondente no computador do usuário.
 */
export async function saveDocumentToComputerDisk(doc: StudyDocument): Promise<void> {
  // 1. Tenta salvar via servidor local (na pasta Pastas_do_Aluno dentro da pasta do aplicativo)
  if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
    try {
      await fetch('/api/local-fs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
    } catch {
      // ignora se estiver rodando estático
    }
  }

  // 2. Se o usuário também vinculou uma pasta via File System Access API, grava nela também
  if (directoryHandle) {
    try {
      const baseHandle = await directoryHandle.getDirectoryHandle('Pastas_do_Aluno', {
        create: true,
      });
      const yearHandle = await baseHandle.getDirectoryHandle(doc.year, {
        create: true,
      });
      const subjFolderName = SUBJECT_FOLDER_MAP[doc.subjectId] || doc.subjectId;
      const subjHandle = await yearHandle.getDirectoryHandle(subjFolderName, {
        create: true,
      });

      const monthObj = MONTHS_PT.find((m) => m.number === doc.month) || MONTHS_PT[0];
      const subFolderName = doc.isExam
        ? 'Provas'
        : `${String(monthObj.number).padStart(2, '0')}_${monthObj.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')}`;

      const targetHandle = await subjHandle.getDirectoryHandle(subFolderName, {
        create: true,
      });

      const safeFileName = doc.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const datePrefix = doc.formattedDate.replace(/\//g, '-');
      const fileHandle = await targetHandle.getFileHandle(
        `${datePrefix}_${safeFileName}`,
        { create: true }
      );
      const writable = await fileHandle.createWritable();

      if (doc.dataUrl && doc.dataUrl.includes(',')) {
        const res = await fetch(doc.dataUrl);
        const blob = await res.blob();
        await writable.write(blob);
      } else {
        await writable.write(doc.extractedText || '');
      }
      await writable.close();
    } catch (e) {
      console.warn('Aviso ao gravar via File System Access API:', e);
    }
  }
}

