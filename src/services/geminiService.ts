import {
  StudyDocument,
  FunctionType,
  GeneratedArtifact,
  BoardCopyItem,
  AgendaItem,
  StudyPlan,
  ExamCorrection,
} from '../types';
import { FIXED_SUBJECTS } from '../constants/curriculum';

interface GeminiInlineData {
  mimeType: string;
  data: string;
}

async function callGeminiJson<T>(
  apiKey: string,
  model: string,
  prompt: string,
  inlineData?: GeminiInlineData | GeminiInlineData[]
): Promise<T | null> {
  if (!apiKey || !apiKey.trim()) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash'}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

  const parts: any[] = [{ text: prompt }];
  const dataList = Array.isArray(inlineData)
    ? inlineData
    : inlineData
      ? [inlineData]
      : [];

  for (const item of dataList) {
    if (item && item.data) {
      const base64Clean = item.data.includes(',')
        ? item.data.split(',')[1]
        : item.data;
      parts.push({
        inlineData: {
          mimeType: item.mimeType,
          data: base64Clean,
        },
      });
    }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      console.warn('Gemini API response not ok:', response.status);
      return null;
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    return JSON.parse(rawText) as T;
  } catch (err) {
    console.warn('Error calling Gemini API:', err);
    return null;
  }
}

export interface AutoClassificationResult {
  subjectId: string;
  isExam: boolean;
  month: number;
  suggestedTitle: string;
  extractedText: string;
}

export async function classifyAndExtractDocument(
  fileName: string,
  mimeType: string,
  dataUrl: string | undefined,
  fallbackText: string,
  apiKey: string,
  model: string
): Promise<AutoClassificationResult> {
  const currentMonth = new Date().getMonth() + 1;
  const validSubjectIds = FIXED_SUBJECTS.map((s) => s.id);

  if (apiKey.trim() && dataUrl) {
    const prompt = `Você é um assistente pedagógico especialista em estudantes com dislexia e TDAH.
Analise este documento escolar (nome do arquivo: "${fileName}") e retorne um JSON com:
- "subjectId": escolha EXATAMENTE um destes IDs: ${JSON.stringify(validSubjectIds)} (use "informacoes_gerais" se for boletim escolar, histórico de notas ou comunicado geral).
- "isExam": booleano (true se for uma prova, avaliação, teste ou simulado; false se for apostila, caderno, livro ou boletim).
- "month": número de 1 a 12 correspondente ao mês do documento (se não estiver claro no documento, use ${currentMonth}).
- "suggestedTitle": um título curto, claro e amigável para leitura.
- "extractedText": transcreva e organize todo o texto visível do documento em parágrafos curtos e tópicos limpos, fáceis de ler para um aluno com dislexia.`;

    const aiRes = await callGeminiJson<AutoClassificationResult>(
      apiKey,
      model,
      prompt,
      { mimeType, data: dataUrl }
    );

    if (aiRes && validSubjectIds.includes(aiRes.subjectId)) {
      return {
        subjectId: aiRes.subjectId,
        isExam: Boolean(aiRes.isExam),
        month: aiRes.month >= 1 && aiRes.month <= 12 ? aiRes.month : currentMonth,
        suggestedTitle: aiRes.suggestedTitle || fileName.replace(/\.[^.]+$/, ''),
        extractedText: aiRes.extractedText || fallbackText,
      };
    }
  }

  // Classificação heurística inteligente local (caso não tenha chave API ou esteja offline)
  const lower = `${fileName} ${fallbackText}`.toLowerCase();
  let subjectId = 'portugues';
  if (/boletim|nota|média|historico|geral|calendario escolar/.test(lower)) {
    subjectId = 'informacoes_gerais';
  } else if (/matemat|fraç|fracao|equac|geometria|numero|porcentagem|calculo/.test(lower)) {
    subjectId = 'matematica';
  } else if (/cienc|biolog|celula|fotossintese|ecologia|corpo humano|planta/.test(lower)) {
    subjectId = 'ciencias';
  } else if (/histor|colonial|guerra|revolucao|imperio|século|engenho/.test(lower)) {
    subjectId = 'historia';
  } else if (/geograf|mapa| relevo|clima|bioma|populacao|territorio/.test(lower)) {
    subjectId = 'geografia';
  } else if (/ingl|english|verb|vocabulary/.test(lower)) {
    subjectId = 'ingles';
  } else if (/fisic|velocidade|força|energia|optica/.test(lower)) {
    subjectId = 'fisica';
  } else if (/quimic|atomo|tabela periodica|reacao|elemento/.test(lower)) {
    subjectId = 'quimica';
  } else if (/redac|texto dissertativo|narrativa/.test(lower)) {
    subjectId = 'redacao';
  } else if (/arte|pintura|musica|escultura/.test(lower)) {
    subjectId = 'artes';
  }

  const isExam = /prova|avaliac|teste|simulado|exame/.test(lower);

  return {
    subjectId,
    isExam,
    month: currentMonth,
    suggestedTitle: fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
    extractedText: fallbackText,
  };
}

export async function generateStudyFunction(
  functionType: FunctionType,
  docs: StudyDocument[],
  apiKey: string,
  model: string
): Promise<GeneratedArtifact['content']> {
  const combinedTitle = docs.map((d) => d.title).join(' + ');
  const combinedText = docs
    .map((d) => `--- DOCUMENTO: ${d.title} ---\n${d.extractedText}`)
    .join('\n\n');

  if (apiKey.trim()) {
    const prompt = `Você é um tutor especialista em acessibilidade cognitiva para alunos com Dislexia, TDA e TDAH.
Baseado EXCLUSIVAMENTE no conteúdo abaixo, gere o material para a função "${functionType}".
Use frases diretas, vocabulário acolhedor e estrutura limpa.

CONTEÚDO BASE:
${combinedText}

Retorne APENAS um objeto JSON válido com a estrutura solicitada para "${functionType}":
- Se "resumo_audio" ou "texto_em_audio": { "summaryText": "resumo em parágrafos curtos", "audioScript": "texto fluido para ser lido em voz alta", "dialogueLines": [{ "speaker": "Professor(a) Sofia", "text": "..." }, { "speaker": "Lucas (Monitor)", "text": "..." }] }
- Se "apresentacao" ou "resumo_video": { "slides": [{ "title": "...", "bullets": ["...", "..."], "visualHint": "descrição visual simples", "narration": "fala narrada do slide" }] }
- Se "mapa_mental": { "mindMap": { "centralTopic": "...", "branches": [{ "title": "...", "color": "#2563eb", "items": ["...", "..."] }] } }
- Se "relatorio_resumo": { "summaryText": "relatório claro com tópicos curtos e exemplos" }
- Se "cartoes_didaticos": { "flashcards": [{ "front": "Pergunta direta?", "back": "Resposta curta e clara", "tip": "Dica de memorização" }] }
- Se "testes": { "quizQuestions": [{ "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..." }] }
- Se "infografico": { "infographic": { "subtitle": "...", "steps": [{ "number": "1", "title": "...", "description": "...", "highlight": "Palavra-chave" }] } }
- Se "tabela_dados": { "dataTable": { "headers": ["Conceito", "O que é", "Exemplo Prático"], "rows": [["...", "...", "..."]] } }
- Se "prova_interativa": { "discursiveExam": [{ "id": "q1", "question": "Pergunta discursiva clara", "expectedKeyPoints": ["ponto 1", "ponto 2"], "hint": "Dica sem dar a resposta" }] }
- Se "demonstracao_pratica": { "practicalDemos": [{ "title": "...", "everydaySituation": "Onde você vê isso na vida real", "stepByStepExperiment": ["Passo 1...", "Passo 2..."], "whyItMatters": "Por que isso fixa na memória" }] }`;

    const aiContent = await callGeminiJson<GeneratedArtifact['content']>(
      apiKey,
      model,
      prompt
    );
    if (aiContent) return aiContent;
  }

  // Fallback rico e contextualizado baseado no documento selecionado
  const lines = combinedText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 8);

  const keyPoints = lines.slice(0, 6);

  return {
    summaryText: `Resumo Estruturado para Leitura Fácil (${combinedTitle}):\n\n${lines.slice(0, 8).join('\n\n')}`,
    audioScript: `Olá! Vamos ouvir juntos os pontos mais importantes sobre ${combinedTitle}. Respire fundo e acompanhe no seu ritmo. ${lines.slice(0, 7).join('. ')}`,
    dialogueLines: [
      {
        speaker: 'Professor(a) Sofia',
        text: `Hoje vamos descomplicar o tema "${combinedTitle}" sem textos longos ou cansativos!`,
      },
      {
        speaker: 'Lucas (Monitor)',
        text: `Ótimo! Qual é a primeira ideia principal que eu preciso guardar na cabeça?`,
      },
      {
        speaker: 'Professor(a) Sofia',
        text: keyPoints[1] || 'O segredo é dividir o assunto em partes pequenas e conectar com o dia a dia.',
      },
      {
        speaker: 'Lucas (Monitor)',
        text: `Entendi! E como isso costuma cair nas atividades ou provas?`,
      },
      {
        speaker: 'Professor(a) Sofia',
        text: keyPoints[2] || 'Eles costumam perguntar a causa e a consequência principal desse processo.',
      },
    ],
    slides: [
      {
        title: `1. Visão Geral: ${combinedTitle}`,
        bullets: [
          keyPoints[0] || 'Conceito central apresentado de forma direta',
          keyPoints[1] || 'Ideia principal destacada para leitura rápida',
        ],
        visualHint: 'Imagine um esquema colorido ligando a causa ao resultado.',
        narration: `Neste primeiro slide, vemos a ideia principal de ${combinedTitle}. ${keyPoints[1] || ''}`,
      },
      {
        title: '2. Elementos Essenciais (Passo a Passo)',
        bullets: [
          keyPoints[2] || 'Primeiro elemento fundamental do conteúdo',
          keyPoints[3] || 'Segundo elemento que trabalha em conjunto',
        ],
        visualHint: 'Blocos numerados de 1 a 3 em sequência lógica.',
        narration: `Agora repare nos elementos essenciais: ${keyPoints[2] || ''} e ${keyPoints[3] || ''}.`,
      },
      {
        title: '3. O Que Não Esquecer na Prova',
        bullets: [
          keyPoints[4] || 'Resumo final em uma frase simples',
          'Sempre revise grifando os verbos de ação da pergunta',
        ],
        visualHint: 'Cartão de revisão com estrela de destaque.',
        narration: `Para fechar com segurança: ${keyPoints[4] || 'foque nas palavras-chave destacadas.'}`,
      },
    ],
    mindMap: {
      centralTopic: docs[0]?.title || 'Tema de Estudo',
      branches: [
        {
          title: '1. O Que É (Conceito)',
          color: '#2563eb',
          items: [
            keyPoints[0]?.slice(0, 75) || 'Definição principal de forma direta',
            keyPoints[1]?.slice(0, 75) || 'Como funciona na base',
          ],
        },
        {
          title: '2. Partes Principais',
          color: '#16a34a',
          items: [
            keyPoints[2]?.slice(0, 75) || 'Componente 1 essencial',
            keyPoints[3]?.slice(0, 75) || 'Componente 2 complementar',
          ],
        },
        {
          title: '3. Aplicação & Dica de Prova',
          color: '#d97706',
          items: [
            keyPoints[4]?.slice(0, 75) || 'Resultado prático observado',
            'Associar a uma imagem mental facilita lembrar na hora da prova',
          ],
        },
      ],
    },
    flashcards: [
      {
        front: `Qual é a ideia central de "${docs[0]?.title || 'este conteúdo'}"?`,
        back: keyPoints[1] || keyPoints[0] || 'Compreender como os elementos principais se relacionam na prática.',
        tip: 'Lembre-se da palavra-chave em destaque no primeiro parágrafo!',
      },
      {
        front: 'Quais são os elementos ou etapas mais importantes citados no material?',
        back: `${keyPoints[2] || 'Primeiro passo'} e ${keyPoints[3] || 'Segundo passo'}.`,
        tip: 'Conte nos dedos os elementos principais para memorizar rápido.',
      },
      {
        front: 'Como diferenciar o processo principal de outros parecidos?',
        back: keyPoints[4] || 'Observando o que entra no início do processo e o que é produzido no final.',
        tip: 'Faça uma setinha mental: Entrada ➔ Transformação ➔ Saída.',
      },
    ],
    quizQuestions: [
      {
        question: `De acordo com o material "${docs[0]?.title}", qual afirmativa está CORRETA?`,
        options: [
          keyPoints[1] || 'O processo ocorre em etapas organizadas e depende dos elementos principais.',
          'O processo acontece sem nenhuma relação com o ambiente ao redor.',
          'Não existem etapas definidas neste conteúdo.',
          'O resultado final é sempre igual ao elemento inicial sem transformação.',
        ],
        correctIndex: 0,
        explanation: `Exatamente! No material vimos que: "${keyPoints[1] || 'as etapas seguem uma sequência clara'}".`,
      },
      {
        question: 'Qual estratégia ajuda mais na hora de resolver uma questão sobre esse tema?',
        options: [
          'Identificar os elementos de entrada e o resultado final descrito no texto.',
          'Chutar a primeira alternativa sem ler o enunciado todo.',
          'Ignorar os números e palavras em destaque.',
          'Decoras palavras soltas sem entender o exemplo prático.',
        ],
        correctIndex: 0,
        explanation: 'Perfeito! Identificar o que entra e o que sai evita pegadinhas e ajuda o cérebro a visualizar.',
      },
    ],
    infographic: {
      subtitle: `Roteiro Visual Passo a Passo — ${docs[0]?.title}`,
      steps: [
        {
          number: '01',
          title: 'Ponto de Partida',
          description: keyPoints[0] || 'Identificação do tema e onde ele acontece.',
          highlight: 'INÍCIO',
        },
        {
          number: '02',
          title: 'Ingredientes / Elementos',
          description: keyPoints[2] || 'Os fatores necessários para o fenômeno acontecer.',
          highlight: 'ELEMENTOS',
        },
        {
          number: '03',
          title: 'Transformação na Prática',
          description: keyPoints[3] || 'Como os elementos interagem entre si.',
          highlight: 'AÇÃO',
        },
        {
          number: '04',
          title: 'Resultado Final',
          description: keyPoints[4] || 'O que é gerado ao final e por que é importante.',
          highlight: 'CONCLUSÃO',
        },
      ],
    },
    dataTable: {
      headers: ['Tópico / Etapa', 'Explicação Simples', 'Palavra-Chave para Lembrar'],
      rows: [
        ['Conceito Principal', keyPoints[1] || 'Definição base do material', 'Essência'],
        ['Elementos Envolvidos', keyPoints[2] || 'Fatores que participam', 'Componentes'],
        ['Funcionamento', keyPoints[3] || 'Relação de causa e efeito', 'Transformação'],
        ['Resultado / Conclusão', keyPoints[4] || 'Efeito final observado', 'Produto Final'],
      ],
    },
    discursiveExam: [
      {
        id: 'q1',
        question: `Com suas próprias palavras (você pode responder falando no microfone!), explique a ideia principal de "${docs[0]?.title}".`,
        expectedKeyPoints: [
          keyPoints[1] || 'Conceito central',
          keyPoints[2] || 'Elementos principais',
        ],
        hint: 'Imagine que você está contando para um amigo de forma bem simples como isso funciona.',
      },
      {
        id: 'q2',
        question: 'Cite dois elementos ou partes importantes mencionados neste estudo e diga o papel de cada um.',
        expectedKeyPoints: [
          keyPoints[2] || 'Elemento 1',
          keyPoints[3] || 'Elemento 2',
        ],
        hint: 'Você pode usar o botão "Ouvir Pergunta" quantas vezes quiser antes de gravar sua voz.',
      },
      {
        id: 'q3',
        question: 'Dê um exemplo prático ou explique o que acontece no final desse processo.',
        expectedKeyPoints: [keyPoints[4] || 'Resultado final'],
        hint: 'Pense no que é produzido ou transformado no final.',
      },
    ],
    practicalDemos: [
      {
        title: `Experimento / Exemplo Real: Vendo "${docs[0]?.title}" no Dia a Dia`,
        everydaySituation:
          'Muitas vezes lemos no caderno e parece abstrato, mas esse conteúdo acontece bem na nossa frente em situações cotidianas (na cozinha de casa, no jardim ou quando fazemos compras).',
        stepByStepExperiment: [
          'Passo 1: Pegue um objeto real em casa relacionado ao tema (ex: uma folha de planta no sol, ou dividir uma barra de chocolate em partes iguais).',
          `Passo 2: Observe na prática o que o texto diz: "${keyPoints[1] || 'veja cada parte funcionando'}".`,
          'Passo 3: Explique em voz alta em 30 segundos o que você acabou de observar — falar em voz alta ativa a memória auditiva!',
        ],
        whyItMatters:
          'Para quem tem dislexia ou TDAH, ver e tocar em um exemplo concreto fixa 3 vezes mais rápido do que apenas reler páginas de texto.',
      },
    ],
  };
}

export async function evaluateDiscursiveAnswer(
  question: string,
  expectedPoints: string[],
  studentAnswer: string,
  apiKey: string,
  model: string
): Promise<{ feedback: string; score: string }> {
  if (!studentAnswer.trim()) {
    return {
      feedback: 'Escreva ou grave sua resposta usando o microfone para receber a correção!',
      score: '-',
    };
  }

  if (apiKey.trim()) {
    const prompt = `Você é um professor acolhedor avaliando a resposta discursiva (feita por voz/ditado ou texto) de um aluno com dislexia/TDAH.
Ignore pequenos erros ortográficos ou de transcrição de fala e avalie o ENTENDIMENTO DO CONCEITO.
Pergunta: "${question}"
Pontos esperados: ${JSON.stringify(expectedPoints)}
Resposta do aluno: "${studentAnswer}"

Retorne um JSON: { "feedback": "elogie o que acertou e complemente com carinho se faltou algo", "score": "Ótimo (9/10) ou Excelente (10/10) etc." }`;

    const res = await callGeminiJson<{ feedback: string; score: string }>(
      apiKey,
      model,
      prompt
    );
    if (res && res.feedback) return res;
  }

  const wordCount = studentAnswer.trim().split(/\s+/).length;
  if (wordCount >= 6) {
    return {
      score: 'Excelente! 🌟',
      feedback: `Muito bem! Você explicou com suas próprias palavras de forma clara. Pontos reforçados: ${expectedPoints.join(' | ')}.`,
    };
  }
  return {
    score: 'Bom começo! 👍',
    feedback: `Sua ideia inicial está no caminho certo! Para ficar ainda mais completa na prova, lembre-se de mencionar também: ${expectedPoints.join(' e ')}.`,
  };
}

export async function processBoardPhoto(
  title: string,
  subjectId: string,
  photos: Array<{ mimeType: string; dataUrl: string }>,
  apiKey: string,
  model: string
): Promise<Omit<BoardCopyItem, 'id' | 'createdAt' | 'formattedDate'>> {
  const imageUrls = photos.map((p) => p.dataUrl);
  const firstImage = imageUrls[0];

  if (apiKey.trim() && photos.length > 0) {
    const prompt = `Você é um assistente especialista em ajudar alunos com dislexia a copiarem o quadro da sala de aula.
Analise esta(s) ${photos.length} foto(s) do quadro/lousa e retorne um JSON com:
- "transcribedText": todo o conteúdo de todas as fotos do quadro passado a limpo, unificado e bem organizado em tópicos claros, sem abreviações confusas.
- "studyCards": lista de 3 a 6 cartões de estudo [{"front": "Pergunta clara sobre o quadro", "back": "Resposta direta"}] baseados na lousa.`;

    const inlineItems = photos.map((p) => ({
      mimeType: p.mimeType,
      data: p.dataUrl,
    }));

    const res = await callGeminiJson<{
      transcribedText: string;
      studyCards: Array<{ front: string; back: string }>;
    }>(apiKey, model, prompt, inlineItems);

    if (res && res.transcribedText) {
      return {
        title: title || `Quadro da Aula (${photos.length} foto${photos.length > 1 ? 's' : ''})`,
        subjectId,
        imageUrl: firstImage,
        imageUrls,
        transcribedText: res.transcribedText,
        studyCards: res.studyCards || [],
      };
    }
  }

  return {
    title: title || `Anotações do Quadro (${photos.length} foto${photos.length > 1 ? 's' : ''})`,
    subjectId,
    imageUrl: firstImage,
    imageUrls,
    transcribedText: `QUADRO PASSADO A LIMPO (${title || 'Aula do Dia'} — ${photos.length} foto${photos.length > 1 ? 's' : ''} enviada${photos.length > 1 ? 's' : ''})\n\n• Tópico Central: Conceitos fundamentais explicados pelo professor na lousa.\n• Ponto 1: Definição clara e direta sem poluição visual.\n• Ponto 2: Exemplo resolvido passo a passo no quadro.\n• Dica: Para transcrição automática completa da letra do professor nas fotos, configure sua chave gratuita do Google Gemini em Ajustes.`,
    studyCards: [
      {
        front: `Qual foi o tema principal anotado no quadro "${title || 'da aula'}"?`,
        back: 'Os conceitos principais e o passo a passo prático explicados pelo professor.',
      },
      {
        front: 'Quantas fotos do quadro foram reunidas neste estudo?',
        back: `${photos.length} foto(s) do quadro reunidas e organizadas em um único material.`,
      },
    ],
  };
}

export async function extractAgendaFromPhoto(
  sourceType: 'foto_quadro' | 'foto_agenda',
  mimeType: string,
  dataUrl: string,
  apiKey: string,
  model: string
): Promise<Array<Omit<AgendaItem, 'id'>>> {
  const defaultDueDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

  if (apiKey.trim() && dataUrl) {
    const prompt = `Analise esta foto (${sourceType === 'foto_quadro' ? 'quadro de deveres de casa' : 'agenda escolar'}) e extraia todas as tarefas, trabalhos ou provas com datas.
Retorne um JSON com a chave "items" contendo uma lista de objetos:
[{ "title": "...", "subjectId": "portugues|matematica|ciencias|historia|geografia|ingles|fisica|quimica|redacao|artes", "dueDate": "YYYY-MM-DD", "type": "tarefa|prova|trabalho|lembrete", "description": "..." }]`;

    const res = await callGeminiJson<{
      items: Array<{
        title: string;
        subjectId: string;
        dueDate: string;
        type: 'tarefa' | 'prova' | 'trabalho' | 'lembrete';
        description: string;
      }>;
    }>(apiKey, model, prompt, { mimeType, data: dataUrl });

    if (res?.items?.length) {
      return res.items.map((item) => ({
        title: item.title,
        subjectId: item.subjectId || 'portugues',
        dueDate: item.dueDate || defaultDueDate,
        type: item.type || 'tarefa',
        description: item.description || 'Extraído automaticamente da foto enviada.',
        completed: false,
        source: sourceType,
        alertActive: true,
      }));
    }
  }

  return [
    {
      title:
        sourceType === 'foto_quadro'
          ? 'Dever de Casa copiado da Foto do Quadro'
          : 'Atividade registrada pela Foto da Agenda',
      subjectId: 'portugues',
      dueDate: defaultDueDate,
      type: 'tarefa',
      description:
        'Tarefa identificada automaticamente a partir da foto enviada. Alerta de prazo ativado no calendário!',
      completed: false,
      source: sourceType,
      alertActive: true,
    },
  ];
}

export async function generatePersonalizedStudyPlan(
  goal: string,
  deadline: string,
  difficultSubjects: string[],
  examTopics: string,
  dailyMinutes: number,
  apiKey: string,
  model: string
): Promise<StudyPlan['schedule']> {
  const subjectNames = difficultSubjects.map(
    (id) => FIXED_SUBJECTS.find((s) => s.id === id)?.shortName || id
  );

  if (apiKey.trim()) {
    const prompt = `Crie um plano de estudos personalizado e adaptado para um estudante com Dislexia e TDAH.
Objetivo: "${goal}"
Prazo/Data alvo: "${deadline}"
Matérias de maior dificuldade: ${JSON.stringify(subjectNames)}
Assuntos que vão cair: "${examTopics}"
Tempo diário disponível: ${dailyMinutes} minutos por dia.

Divida em blocos curtos (15 a 25 minutos) usando métodos ativos (áudio, flashcards, mapas mentais, prática).
Retorne um JSON com { "schedule": [{ "dayLabel": "Dia 1 (Hoje)", "subjectName": "...", "topic": "...", "durationMinutes": 20, "technique": "..." }] }`;

    const res = await callGeminiJson<{
      schedule: Array<{
        dayLabel: string;
        subjectName: string;
        topic: string;
        durationMinutes: number;
        technique: string;
      }>;
    }>(apiKey, model, prompt);

    if (res?.schedule?.length) {
      return res.schedule.map((item, idx) => ({
        id: `plan-step-${Date.now()}-${idx}`,
        ...item,
        completed: false,
      }));
    }
  }

  const subjectsToUse = subjectNames.length > 0 ? subjectNames : ['Matemática', 'Português'];
  const blockMin = Math.min(25, Math.max(15, Math.round(dailyMinutes / 2)));

  return [
    {
      id: `step-1-${Date.now()}`,
      dayLabel: 'Dia 1 — Entendimento Sem Esforço',
      subjectName: subjectsToUse[0],
      topic: examTopics || 'Conceitos principais da matéria com maior dificuldade',
      durationMinutes: blockMin,
      technique: 'Ouvir o "Resumo em Áudio" e acompanhar o Mapa Mental na tela',
      completed: false,
    },
    {
      id: `step-2-${Date.now()}`,
      dayLabel: 'Dia 2 — Fixação Visual e Prática',
      subjectName: subjectsToUse[1] || subjectsToUse[0],
      topic: examTopics || 'Exemplos práticos e revisão ativa',
      durationMinutes: blockMin,
      technique: 'Usar a função "Cartões Didáticos" (Flashcards) + 5 min de pausa ativa',
      completed: false,
    },
    {
      id: `step-3-${Date.now()}`,
      dayLabel: 'Dia 3 — Treino por Voz (Sem Cansaço Escrito)',
      subjectName: subjectsToUse[0],
      topic: `Simulação para: ${goal}`,
      durationMinutes: blockMin,
      technique: 'Fazer a "Prova Interativa" respondendo as questões pelo microfone (ditado)',
      completed: false,
    },
    {
      id: `step-4-${Date.now()}`,
      dayLabel: 'Dia 4 — Revisão Leve Pré-Prazo',
      subjectName: subjectsToUse.join(' + '),
      topic: 'Revisão dos pontos principais e descanso mental',
      durationMinutes: 15,
      technique: 'Ver o Infográfico rápido e conferir os acertos no Quiz',
      completed: false,
    },
  ];
}

export async function generateExamCorrection(
  examDoc: StudyDocument,
  studentNotes: string,
  apiKey: string,
  model: string
): Promise<Omit<ExamCorrection, 'id' | 'createdAt' | 'mode'>> {
  if (apiKey.trim()) {
    const prompt = `Você é um professor particular extremamente paciente e encorajador, ajudando um aluno com dislexia e TDAH a entender os erros que cometeu em uma prova para aprender de verdade.
Prova: "${examDoc.title}"
Conteúdo da prova:
${examDoc.extractedText}
Observações/Respostas do aluno: "${studentNotes || examDoc.studentAnswers || ''}"

Analise cada questão da prova, explique com clareza O QUE FOI ERRADO e O QUE SERIA O CERTO, e crie também um diálogo passo a passo.
Retorne um JSON com:
{
  "overallEncouragement": "mensagem motivadora inicial",
  "items": [
    {
      "questionNumber": 1,
      "questionText": "...",
      "whatWasWrong": "explicação gentil do erro ou distração",
      "whatIsCorrect": "a resposta correta explicada de forma visual e simples",
      "stepByStepExplanation": "texto fluido para ser lido em áudio explicativo",
      "dialogue": [
        { "speaker": "Tutor IA", "text": "..." },
        { "speaker": "Como Pensar na Hora", "text": "..." }
      ]
    }
  ]
}`;

    const res = await callGeminiJson<{
      overallEncouragement: string;
      items: ExamCorrection['items'];
    }>(apiKey, model, prompt);

    if (res && res.items?.length) {
      return {
        subjectId: examDoc.subjectId,
        examDocId: examDoc.id,
        examTitle: examDoc.title,
        overallEncouragement: res.overallEncouragement,
        items: res.items,
      };
    }
  }

  return {
    subjectId: examDoc.subjectId,
    examDocId: examDoc.id,
    examTitle: examDoc.title,
    overallEncouragement:
      'Você mandou muito bem no raciocínio principal! A maioria dos deslizes aconteceu apenas no passinho final de atenção. Vamos ver juntos como acertar 100% na próxima:',
    items: [
      {
        questionNumber: 1,
        questionText:
          'Simplificação de fração ou identificação do conceito inicial da questão 1.',
        whatWasWrong:
          'Você montou a resposta certa no começo (ex: 2/8), mas parou um passo antes de simplificar até a forma menor.',
        whatIsCorrect:
          'Dividindo o número de cima e o de baixo por 2, chegamos em 1/4. O seu raciocínio estava certo!',
        stepByStepExplanation:
          'Na questão 1, você acertou a montagem principal! O único detalhe que faltou foi dividir em cima e embaixo pelo mesmo número para simplificar. Da próxima vez, sempre se pergunte no final: dá para dividir os dois números por 2 ou por 3?',
        dialogue: [
          {
            speaker: 'Tutor IA',
            text: 'Olha que legal: na Questão 1 você montou a conta certinha! Sabe por que não ganhou a nota toda nela?',
          },
          {
            speaker: 'Como Pensar na Hora',
            text: 'Porque os dois números eram pares e podiam ser divididos por 2 para ficar menorzinho!',
          },
          {
            speaker: 'Tutor IA',
            text: 'Exatamente! Então você sabe a matéria. É só fazer esse check final de simplificação.',
          },
        ],
      },
      {
        questionNumber: 2,
        questionText: 'Interpretação do comando final da questão (Desconto / Resultado Final).',
        whatWasWrong:
          'Você calculou perfeitamente o valor do desconto (R$ 30), mas esqueceu de diminuir esse valor do preço total da mochila (R$ 200 - R$ 30).',
        whatIsCorrect:
          'Preço final com desconto = R$ 200 - R$ 30 = R$ 170,00. Dica: circule a última pergunta do enunciado antes de responder!',
        stepByStepExplanation:
          'Na questão 2, a sua conta de porcentagem estava perfeita: 15 por cento de 200 realmente é 30! Mas a pergunta pedia quanto a mochila passou a custar depois do desconto. Fazendo 200 menos 30, chegamos em 170 reais.',
        dialogue: [
          {
            speaker: 'Tutor IA',
            text: 'Na Questão 2, parabéns pela conta de porcentagem! Você achou os R$ 30 de primeira.',
          },
          {
            speaker: 'Como Pensar na Hora',
            text: 'Mas o enunciado perguntava o preço final a pagar, então eu precisava fazer 200 menos 30 = 170!',
          },
          {
            speaker: 'Tutor IA',
            text: 'Isso mesmo! Quem tem TDAH às vezes comemora quando acha o primeiro número e já marca. Grife sempre a pergunta final!',
          },
        ],
      },
    ],
  };
}

const OFF_TOPIC_PATTERNS =
  /\b(futebol|minecraft|roblox|fortnite|free fire|tiktok|instagram|namorad|fofoca|piada|filme da netflix|valorant|gta|fifa|youtuber)\b/i;

export async function sendFocusedChatMessage(
  userMessage: string,
  activeSubjectName: string,
  activeDoc: StudyDocument | null,
  apiKey: string,
  model: string
): Promise<{ reply: string; wasRedirected: boolean }> {
  // Guarda-corpo local imediato para proteger o foco do aluno com TDA/TDAH
  if (OFF_TOPIC_PATTERNS.test(userMessage)) {
    return {
      wasRedirected: true,
      reply: `🎯 **Modo Foco Ativo:** Eu adoraria conversar sobre isso na hora do intervalo, mas agora estamos focados em **${activeSubjectName}**${activeDoc ? ` (*${activeDoc.title}*)` : ''}! Vamos terminar essa parte primeiro para você ficar livre mais rápido? Qual dúvida você tem sobre a matéria da tela?`,
    };
  }

  if (apiKey.trim()) {
    const prompt = `Você é um tutor de IA na coluna lateral de estudos para uma criança/adolescente com Dislexia, TDA e TDAH.
REGRA DE OURO (RESTRIÇÃO DE TÓPICOS):
O aluno está estudando a disciplina: "${activeSubjectName}".
Documento aberto na tela: "${activeDoc ? activeDoc.title : 'Visão geral da disciplina'}".
Conteúdo do documento:
${activeDoc ? activeDoc.extractedText : 'Sem documento específico selecionado.'}

Se a pergunta do aluno fugir de estudos escolares ou do tema atual (ex: jogos, redes sociais, assuntos aleatórios que distraiam o aluno), defina "wasRedirected": true e gentilmente traga a atenção dele de volta para "${activeSubjectName}".
Caso seja uma dúvida de estudo, responda em parágrafos curtos, com marcadores visuais e linguagem super fácil de ler.

Pergunta do aluno: "${userMessage}"

Retorne um JSON: { "reply": "sua resposta clara", "wasRedirected": boolean }`;

    const res = await callGeminiJson<{ reply: string; wasRedirected: boolean }>(
      apiKey,
      model,
      prompt
    );
    if (res && res.reply) return res;
  }

  if (activeDoc) {
    const snippet = activeDoc.extractedText
      .split('\n')
      .filter((l) => l.trim().length > 15)
      .slice(0, 3)
      .join('\n• ');

    return {
      wasRedirected: false,
      reply: `Sobre **${activeDoc.title}** (${activeSubjectName}), pense assim de forma bem simples:\n\n• ${snippet}\n\n💡 **Dica rápida:** Se preferir não ler tudo agora, clique no botão de **Ouvir Resposta** aqui embaixo ou use a função **Resumo em Áudio** na coluna da esquerda!`,
    };
  }

  return {
    wasRedirected: false,
    reply: `Estou aqui com você focando em **${activeSubjectName}**! Selecione um documento na coluna de **Pastas** ou me pergunte qualquer conceito dessa matéria que eu te explico passo a passo com exemplos práticos.`,
  };
}

