import { jsPDF } from 'jspdf';
import { BoardCopyItem } from '../types';

export function generateCleanBoardPdf(item: BoardCopyItem, subjectName: string): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Cabeçalho limpo sem serifa (Helvetica = sans-serif no PDF padrão)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text(item.title, 18, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(`Disciplina: ${subjectName}   |   Data: ${item.formattedDate}`, 18, 30);

  doc.setDrawColor(203, 213, 225);
  doc.line(18, 34, 192, 34);

  // Bloco Principal do Quadro
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('Conteudo Organizado do Quadro:', 18, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const splitContent = doc.splitTextToSize(item.transcribedText, 172);
  doc.text(splitContent, 18, 53);

  let currentY = 53 + splitContent.length * 6.5 + 10;

  if (item.studyCards && item.studyCards.length > 0) {
    if (currentY > 240) {
      doc.addPage();
      currentY = 25;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(37, 99, 235);
    doc.text('Cartoes de Estudo Rapido (Perguntas e Respostas):', 18, currentY);
    currentY += 8;

    item.studyCards.forEach((card, idx) => {
      if (currentY > 255) {
        doc.addPage();
        currentY = 25;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      const qLines = doc.splitTextToSize(`${idx + 1}. ${card.front}`, 168);
      doc.text(qLines, 20, currentY);
      currentY += qLines.length * 5.5 + 2;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const aLines = doc.splitTextToSize(`Resposta: ${card.back}`, 164);
      doc.text(aLines, 24, currentY);
      currentY += aLines.length * 5.5 + 6;
    });
  }

  const safeFilename = item.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  doc.save(`${safeFilename || 'quadro_organizado'}.pdf`);
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function extractBasicTextFromFile(file: File): Promise<string> {
  if (file.type.startsWith('text/')) {
    return await file.text();
  }
  if (file.type === 'application/pdf') {
    // Leitura básica de strings legíveis caso esteja offline/sem API Key,
    // enquanto com a API Gemini o próprio binário base64 do PDF é lido nativamente pelo modelo multimodal.
    try {
      const buffer = await file.arrayBuffer();
      const decoder = new TextDecoder('latin1');
      const raw = decoder.decode(buffer);
      const matches = raw.match(/\(([^()]{3,120})\)/g);
      if (matches && matches.length > 5) {
        const cleaned = matches
          .map((m) => m.slice(1, -1))
          .filter((s) => /[a-zA-ZÀ-ÿ]{3,}/.test(s) && !/obj|endobj|stream|Font/i.test(s))
          .join(' ')
          .replace(/\\[nrt]/g, ' ')
          .slice(0, 4000);
        if (cleaned.length > 60) {
          return cleaned;
        }
      }
    } catch {
      // ignore
    }
    return `Documento PDF carregado: "${file.name}". Para leitura multimodal completa de todas as páginas e imagens internas, utilize as Funções de IA ou adicione sua chave gratuita do Google Gemini nas Configurações.`;
  }
  return `Imagem carregada: "${file.name}". Pronta para análise visual pela Inteligência Artificial.`;
}

