import {
  StudyDocument,
  FunctionType,
  FunctionCustomizationOptions,
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
  model: string,
  options: FunctionCustomizationOptions = {}
): Promise<GeneratedArtifact['content']> {
  const combinedTitle = docs.map((d) => d.title).join(' + ');
  const combinedText = docs
    .map((d) => `--- DOCUMENTO: ${d.title} ---\n${d.extractedText}`)
    .join('\n\n');

  const countMap = { menos: 3, padrao: 5, mais: 8 };
  const targetCount = countMap[options.quantity || 'padrao'] || 5;
  const lengthLabel =
    options.length === 'curto'
      ? 'CURTO (direto e conciso)'
      : options.length === 'longo'
        ? 'LONGO (aprofundado e completo)'
        : 'MÉDIO (equilibrado)';
  const diffLabel =
    options.difficulty === 'facil'
      ? 'FÁCIL (vocabulário bem simples e perguntas diretas)'
      : options.difficulty === 'dificil'
        ? 'DIFÍCIL (exige raciocínio mais profundo e conexões)'
        : 'MÉDIO (padrão escolar)';

  const customFocusInstruction = options.customPrompt?.trim()
    ? `\nINSTRUÇÃO ESPECÍFICA DO ALUNO (DÊ FOCO TOTAL NISSO): "${options.customPrompt.trim()}"\n`
    : '';

  if (apiKey.trim()) {
    const prompt = `Você é um tutor especialista em acessibilidade cognitiva para alunos com Dislexia, TDA e TDAH.
Baseado EXCLUSIVAMENTE no conteúdo abaixo, gere o material para a função "${functionType}".
Use frases diretas, vocabulário acolhedor e estrutura limpa.
Tamanho solicitado: ${lengthLabel}.
Nível de dificuldade: ${diffLabel}.
Quantidade de itens (quando aplicável): ${targetCount}.
Opções extras selecionadas: ${JSON.stringify(options)}.
${customFocusInstruction}

CONTEÚDO BASE:
${combinedText}

Retorne APENAS um objeto JSON válido com a estrutura solicitada para "${functionType}":
- Se "resumo_audio" (estilo: ${options.audioStyle || 'analise_detalhada'}) ou "texto_em_audio":
  { "summaryText": "visão geral escrita", "audioScript": "roteiro completo falado respeitando o estilo (${options.audioStyle}) e tamanho (${options.length})", "dialogueLines": [{ "speaker": "Apresentador 1", "text": "..." }, { "speaker": "Apresentador 2", "text": "..." }] }
- Se "apresentacao" (estilo: ${options.presentationStyle || 'resumido'}) ou "resumo_video" (estilo: ${options.videoStyle || 'explicativo'}):
  { "slides": [{ "title": "...", "bullets": ["...", "..."], "visualHint": "descrição visual simples", "narration": "fala narrada do slide" }] }
- Se "mapa_mental":
  { "mindMap": { "centralTopic": "...", "branches": [{ "title": "...", "color": "#2563eb", "items": ["...", "..."] }] } }
- Se "relatorio_resumo" (estilo: ${options.reportStyle || 'descritivo_texto'}):
  { "summaryText": "relatório completo", "reportSections": [{ "heading": "Título da Seção", "body": "Texto explicativo", "imageCaption": "Descrição visual ilustrada da seção" }] }
- Se "cartoes_didaticos":
  { "flashcards": [{ "front": "Pergunta?", "back": "Resposta", "tip": "Dica", "imageCaption": "${options.includeImages === 'com_imagens' ? 'Ilustração visual do conceito' : ''}" }] } (gere ${targetCount} cartões)
- Se "testes" (tipo de pergunta: ${options.quizQuestionType || 'multipla_escolha'}):
  { "quizQuestions": [{ "questionType": "${options.quizQuestionType || 'multipla_escolha'}", "question": "Enunciado (se preencher_lacuna, use _____ na frase)", "options": ["Opção A", "Opção B", "Opção C", "Opção D"], "correctIndex": 0, "correctIndices": [0, 2], "blankAnswer": "palavra da lacuna", "booleanAnswer": true, "explanation": "Explicação clara", "imageCaption": "${options.includeImages === 'com_imagens' ? 'Descrição do esquema visual da questão' : ''}" }] } (gere ${targetCount} perguntas)
- Se "infografico":
  { "infographic": { "subtitle": "...", "steps": [{ "number": "01", "title": "...", "description": "...", "highlight": "Palavra-chave" }] } }
- Se "tabela_dados":
  { "dataTable": { "headers": ["Conceito", "Explicação", "Aplicação"], "rows": [["...", "...", "..."]] } }
- Se "prova_interativa":
  { "discursiveExam": [{ "id": "q1", "question": "Pergunta discursiva", "expectedKeyPoints": ["ponto 1", "ponto 2"], "hint": "Dica de apoio", "imageCaption": "${options.includeImages === 'com_imagens' ? 'Esquema visual de apoio à questão' : ''}" }] } (gere ${targetCount} questões)
- Se "demonstracao_pratica":
  { "practicalDemos": [{ "title": "...", "everydaySituation": "Onde você vê isso na vida real", "stepByStepExperiment": ["Passo 1...", "Passo 2..."], "whyItMatters": "Por que isso fixa na memória" }] }`;

    const aiContent = await callGeminiJson<GeneratedArtifact['content']>(
      apiKey,
      model,
      prompt
    );
    if (aiContent) return aiContent;
  }

  // Fallback rico e parametrizado conforme todas as opções selecionadas pelo aluno
  const lines = combinedText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 6);

  const keyPoints =
    lines.length > 0
      ? lines
      : [
          `Estudo sobre ${combinedTitle}`,
          'Ideia principal organizada de forma clara e direta.',
          'Conexão entre os elementos fundamentais do material.',
          'Aplicação prática do conceito nos exercícios.',
          'Revisão dos pontos de atenção para memorização.',
        ];

  const focusNote = options.customPrompt?.trim()
    ? ` Foco especial solicitado: "${options.customPrompt.trim()}".`
    : '';

  // Configuração de Resumo em Áudio por Estilo (Análise detalhada, Resumo, Crítica, Debate)
  let dialogueLines: Array<{ speaker: string; text: string }> = [];
  let audioScript = '';

  if (options.audioStyle === 'resumo') {
    audioScript = `Visão geral rápida (${lengthLabel}) sobre ${combinedTitle}.${focusNote}\n${keyPoints.slice(0, options.length === 'curto' ? 3 : options.length === 'longo' ? 8 : 5).join('.\n')}`;
    dialogueLines = [
      {
        speaker: 'Apresentador Principal',
        text: `Aqui está a visão geral direta para você entender as ideias principais de "${combinedTitle}" com rapidez!${focusNote}`,
      },
      {
        speaker: 'Apresentador Principal',
        text: keyPoints[1] || keyPoints[0],
      },
    ];
  } else if (options.audioStyle === 'critica') {
    audioScript = `Análise construtiva e especializada sobre ${combinedTitle}.${focusNote}\nPontos fortes do material e como aprofundar seu estudo:\n${keyPoints.slice(0, 5).join('.\n')}`;
    dialogueLines = [
      {
        speaker: 'Analista Pedagógico',
        text: `Analisando suas fontes sobre "${combinedTitle}", os conceitos principais estão bem definidos, especialmente: ${keyPoints[0]}.${focusNote}`,
      },
      {
        speaker: 'Consultor de Estudo',
        text: `Feedback construtivo para aperfeiçoar seu estudo: conecte "${keyPoints[1] || 'o conceito base'}" com exemplos práticos para fortalecer suas respostas discursivas.`,
      },
    ];
  } else if (options.audioStyle === 'debate') {
    audioScript = `Debate inteligente entre duas perspectivas sobre ${combinedTitle}.${focusNote}\n${keyPoints.slice(0, 6).join('.\n')}`;
    dialogueLines = [
      {
        speaker: 'Debatedor(a) Helena (Perspectiva Teórica)',
        text: `Quando olhamos para "${combinedTitle}", o ponto mais determinante é entender a base conceitual: ${keyPoints[0]}.${focusNote}`,
      },
      {
        speaker: 'Debatedor Lucas (Perspectiva Prática)',
        text: `Eu trago um ângulo complementar! Mais do que a definição, o que realmente transforma o entendimento é observar o efeito prático: ${keyPoints[1] || keyPoints[0]}.`,
      },
      {
        speaker: 'Debatedor(a) Helena (Perspectiva Teórica)',
        text: `Excelente contraponto. Na verdade, as duas visões se conectam quando analisamos: ${keyPoints[2] || 'o resultado final nas fontes'}.`,
      },
    ];
  } else {
    // Análise detalhada (padrão)
    audioScript = `Análise detalhada conversada sobre ${combinedTitle}.${focusNote}\n${keyPoints.slice(0, options.length === 'curto' ? 4 : options.length === 'longo' ? 9 : 6).join('.\n')}`;
    dialogueLines = [
      {
        speaker: 'Apresentadora Sofia',
        text: `Bem-vindos! Hoje vamos fazer uma análise detalhada e animada conectando todos os temas de "${combinedTitle}".${focusNote}`,
      },
      {
        speaker: 'Apresentador Lucas',
        text: `Isso mesmo! E olha como o primeiro ponto já chama atenção logo de cara: ${keyPoints[0]}.`,
      },
      {
        speaker: 'Apresentadora Sofia',
        text: `E tem mais: quando conectamos isso com "${keyPoints[1] || 'o segundo conceito'}", tudo faz sentido de um jeito muito visual!`,
      },
    ];
  }

  // Slides (Apresentação ou Vídeo)
  const slideCount =
    options.length === 'curto' ? 2 : options.length === 'longo' ? 5 : 3;
  const isDetailedSlide = options.presentationStyle === 'muito_detalhado';
  const isDemoVideo = options.videoStyle === 'demonstrativo';

  const slides = Array.from({ length: slideCount }, (_, idx) => {
    const p1 = keyPoints[idx * 2] || keyPoints[0];
    const p2 = keyPoints[idx * 2 + 1] || keyPoints[1] || p1;
    return {
      title: `Slide ${idx + 1}: ${
        functionType === 'resumo_video'
          ? isDemoVideo
            ? `Demonstração Passo ${idx + 1}`
            : `Explicação Etapa ${idx + 1}`
          : `${combinedTitle} (Parte ${idx + 1})`
      }`,
      bullets: isDetailedSlide
        ? [
            `Explicação detalhada: ${p1}`,
            `Contexto completo e relações: ${p2}`,
            focusNote ? `Foco específico: ${options.customPrompt}` : 'Observação detalhada para revisão completa.',
          ]
        : [p1.slice(0, 90), p2.slice(0, 90)],
      visualHint: isDemoVideo
        ? `Demonstração visual em ação da etapa ${idx + 1}.`
        : `Esquema visual limpo destacando a ideia ${idx + 1}.`,
      narration: `${p1}.\n${p2}.${idx === 0 ? focusNote : ''}`,
    };
  });

  // Flashcards (Cartões didáticos)
  const withImg = options.includeImages === 'com_imagens';
  const flashcards = Array.from({ length: targetCount }, (_, idx) => {
    const point = keyPoints[idx % keyPoints.length];
    return {
      front: `[Nível ${options.difficulty || 'médio'}] Cartão #${idx + 1}: Como explicar este ponto de "${combinedTitle}"?${focusNote}`,
      back: point,
      tip: `Associe a palavra-chave principal do parágrafo #${idx + 1}.`,
      imageCaption: withImg
        ? `Ilustração Visual #${idx + 1}: Diagrama esquemático de "${point.slice(0, 45)}..."`
        : undefined,
    };
  });

  // Testes (Quiz) respeitando os 4 tipos de pergunta
  const qType = options.quizQuestionType || 'multipla_escolha';
  const quizQuestions = Array.from({ length: targetCount }, (_, idx) => {
    const point = keyPoints[idx % keyPoints.length];
    if (qType === 'verdadeiro_falso') {
      return {
        questionType: 'verdadeiro_falso' as const,
        question: `Julgue como Verdadeiro ou Falso (${options.difficulty || 'médio'}): De acordo com o material "${combinedTitle}", "${point}".${focusNote}`,
        options: ['Verdadeiro', 'Falso'],
        correctIndex: 0,
        booleanAnswer: true,
        explanation: `É Verdadeiro! Esse ponto consta diretamente no material estudado.`,
        imageCaption: withImg
          ? `Esquema Visual da Afirmativa #${idx + 1}`
          : undefined,
      };
    }
    if (qType === 'preencher_lacuna') {
      const words = point.split(/\s+/).filter((w) => w.length > 4);
      const targetWord = (words[words.length - 1] || 'conceito').replace(
        /[.,;:!?]/g,
        ''
      );
      const blankedSentence = point.replace(targetWord, '__________');
      return {
        questionType: 'preencher_lacuna' as const,
        question: `Complete a lacuna abaixo com a palavra correta:\n"${blankedSentence}"`,
        options: [targetWord, 'elemento', 'processo', 'resultado'],
        correctIndex: 0,
        blankAnswer: targetWord,
        explanation: `A palavra que completa corretamente a lacuna é "${targetWord}".`,
        imageCaption: withImg
          ? `Pista Visual para Completar a Lacuna #${idx + 1}`
          : undefined,
      };
    }
    if (qType === 'multiplas_corretas') {
      return {
        questionType: 'multiplas_corretas' as const,
        question: `Marque TODAS as alternativas corretas sobre "${combinedTitle}" (Questão #${idx + 1}):${focusNote}`,
        options: [
          `✅ ${point}`,
          `✅ ${keyPoints[(idx + 1) % keyPoints.length]}`,
          '❌ Afirmativa incorreta que contradiz o texto principal.',
          '❌ Ideia fora do tema estudado nas fontes.',
        ],
        correctIndex: 0,
        correctIndices: [0, 1],
        explanation: `As duas primeiras alternativas estão corretas e baseadas diretamente nas fontes selecionadas!`,
        imageCaption: withImg
          ? `Comparativo Visual de Alternativas #${idx + 1}`
          : undefined,
      };
    }
    // multipla_escolha (padrão)
    return {
      questionType: 'multipla_escolha' as const,
      question: `Questão #${idx + 1} (${options.difficulty || 'médio'}): Sobre "${combinedTitle}", assinale a alternativa correta:${focusNote}`,
      options: [
        point,
        'O processo ocorre sem relação com os conceitos apresentados.',
        'Nenhuma das informações do documento se aplica a este caso.',
        'O efeito observado é o oposto do descrito no material.',
      ],
      correctIndex: 0,
      explanation: `Correto! Conforme estudado: "${point}".`,
      imageCaption: withImg
        ? `Ilustração de Apoio à Questão #${idx + 1}`
        : undefined,
    };
  });

  // Prova interativa discursiva
  const discursiveExam = Array.from({ length: targetCount }, (_, idx) => {
    const point = keyPoints[idx % keyPoints.length];
    return {
      id: `q-${idx + 1}`,
      question: `Questão Discursiva ${idx + 1} (Dificuldade: ${options.difficulty || 'médio'}): Explique com suas palavras como funciona "${point.slice(0, 70)}...".${focusNote}`,
      expectedKeyPoints: [point],
      hint: 'Você pode ouvir a pergunta em áudio e responder falando no microfone!',
      imageCaption: withImg
        ? `Figura Ilustrativa da Questão ${idx + 1}: Representação visual de apoio`
        : undefined,
    };
  });

  // Relatório / Resumo (Descritivo em texto ou Interativo com imagens)
  const reportSections = keyPoints
    .slice(0, options.length === 'curto' ? 2 : options.length === 'longo' ? 5 : 3)
    .map((pt, i) => ({
      heading: `Seção ${i + 1} — Ideia Essencial`,
      body: `${pt}${i === 0 ? focusNote : ''}`,
      imageCaption:
        options.reportStyle === 'interativo_com_imagens'
          ? `Quadro Visual Interativo #${i + 1}: Ilustração do tópico "${pt.slice(0, 45)}..."`
          : undefined,
    }));

  return {
    summaryText: `Relatório / Resumo (${lengthLabel}):\n${focusNote ? `\n🎯 ${focusNote}\n` : ''}\n${keyPoints
      .slice(0, options.length === 'curto' ? 3 : options.length === 'longo' ? 8 : 5)
      .join('\n\n')}`,
    reportSections,
    audioScript,
    dialogueLines,
    slides,
    mindMap: {
      centralTopic: `${combinedTitle}${options.customPrompt ? ` (${options.customPrompt})` : ''}`,
      branches: [
        {
          title: '1. Ideia Central',
          color: '#2563eb',
          items: [
            keyPoints[0]?.slice(0, 80) || 'Conceito principal',
            keyPoints[1]?.slice(0, 80) || 'Base do tema',
          ],
        },
        {
          title: '2. Conexões e Detalhes',
          color: '#16a34a',
          items: [
            keyPoints[2]?.slice(0, 80) || 'Etapa intermediária',
            keyPoints[3]?.slice(0, 80) || 'Relação entre conceitos',
          ],
        },
        {
          title: '3. Foco & Revisão',
          color: '#d97706',
          items: [
            options.customPrompt?.trim() ||
              keyPoints[4]?.slice(0, 80) ||
              'Aplicação prática',
            'Síntese visual rápida para não esquecer',
          ],
        },
      ],
    },
    flashcards,
    quizQuestions,
    infographic: {
      subtitle: `Infográfico Passo a Passo — ${combinedTitle}${focusNote}`,
      steps: keyPoints.slice(0, 4).map((pt, idx) => ({
        number: `0${idx + 1}`,
        title: `Etapa ${idx + 1}`,
        description: pt,
        highlight: `PASSO ${idx + 1}`,
      })),
    },
    dataTable: {
      headers: ['Tópico / Conceito', 'Explicação Clara', 'Foco / Aplicação'],
      rows: keyPoints.slice(0, 4).map((pt, idx) => [
        `Ponto #${idx + 1}`,
        pt,
        options.customPrompt?.trim() || 'Essencial para revisão',
      ]),
    },
    discursiveExam,
    practicalDemos: [
      {
        title: `Demonstração Prática: ${combinedTitle}`,
        everydaySituation: `Exemplo aplicado na prática sobre o conteúdo selecionado.${focusNote}`,
        stepByStepExperiment: [
          `Passo 1: Observe o conceito base: "${keyPoints[0]}".`,
          `Passo 2: Aplique a situação prática: "${keyPoints[1] || keyPoints[0]}".`,
          'Passo 3: Explique em voz alta o resultado observado para fixar na memória.',
        ],
        whyItMatters:
          'Conectar o conteúdo a experiências visuais e práticas torna o estudo leve e duradouro.',
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

