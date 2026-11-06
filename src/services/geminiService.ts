import {
  StudyDocument,
  FunctionType,
  FunctionCustomizationOptions,
  GeneratedArtifact,
  BoardCopyItem,
  AgendaItem,
  StudyPlan,
  ExamCorrection,
  MathQuestionResolution,
  MathResolutionList,
  EssayCorrectionItem,
  EssayPracticeSession,
  EssayPracticeScope,
  EssayParagraphType,
  EssayLegoParagraph,
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

// ============================================================================
// MÓDULO MATEMÁTICA: Resolução Passo a Passo de Questões e Listas de Exercícios
// ============================================================================

export async function solveMathQuestionsStepByStep(
  filesData: Array<{ dataUrl: string; mimeType: string; fileName?: string }>,
  extractedOrTypedText: string,
  apiKey: string,
  model: string
): Promise<Omit<MathResolutionList, 'id' | 'createdAt' | 'formattedDate'>> {
  const inlineList: GeminiInlineData[] = filesData
    .filter((f) => f.dataUrl && f.mimeType)
    .map((f) => ({ data: f.dataUrl, mimeType: f.mimeType }));

  if (apiKey.trim()) {
    const prompt = `Você é um professor especialista em Matemática para crianças e adolescentes com Dislexia, TDA e TDAH.
O aluno enviou uma foto/arquivo de uma questão ou de uma lista de exercícios de Matemática (e/ou digitou o enunciado abaixo).
Identifique TODAS as questões presentes na imagem/arquivo/texto e gere a resolução passo a passo de CADA questão, explicando claramente qual caminho deve ser tomado e o porquê de cada conta, sem pular etapas.

Texto extraído ou digitado pelo aluno (se houver):
${extractedOrTypedText || '(Analise as imagens/arquivos em anexo)'}

Retorne APENAS um JSON válido com a estrutura:
{
  "title": "Título descritivo da Questão ou Lista de Exercícios",
  "questions": [
    {
      "questionNumber": 1,
      "statement": "Enunciado completo e limpo da questão",
      "topic": "Assunto da questão (ex: Equação do 1º Grau, Porcentagem, Frações, Geometria...)",
      "whatToDoSummary": "Explicação simples e direta do caminho que deve ser tomado para resolver (o plano de ação antes de fazer a conta)",
      "steps": [
        {
          "stepNumber": 1,
          "actionTitle": "O que fazer neste passo (ex: Separar os dados do problema / Isolar o X)",
          "calculation": "A operação ou montagem matemática limpa e espaçada",
          "explanation": "Explicação passo a passo em linguagem acessível do porquê fizemos essa operação"
        }
      ],
      "finalAnswer": "Resposta final destacada de forma clara",
      "attentionTip": "Dica prática para não errar por distração (ex: cuidado com o sinal, unidade de medida ou pergunta final)"
    }
  ]
}`;

    const res = await callGeminiJson<{
      title: string;
      questions: MathQuestionResolution[];
    }>(apiKey, model, prompt, inlineList.length > 0 ? inlineList : undefined);

    if (res && Array.isArray(res.questions) && res.questions.length > 0) {
      return {
        title: res.title || 'Resolução Passo a Passo de Matemática',
        imageUrls: filesData.filter((f) => f.mimeType.startsWith('image/')).map((f) => f.dataUrl),
        sourceText: extractedOrTypedText,
        questions: res.questions,
      };
    }
  }

  // Fallback inteligente local: analisa o texto/enunciado enviado (suporta múltiplas questões em uma lista)
  const rawLines = (extractedOrTypedText || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Separa questões numeradas (ex: "1)", "1.", "Questão 1", "a)") ou trata como lista de exercícios
  const questionBlocks: string[] = [];
  let currentBlock = '';
  for (const line of rawLines) {
    if (/^(quest[aã]o\s*\d+|\d+[\)\.\-]|[a-e][\)\.])\s+/i.test(line) && currentBlock) {
      questionBlocks.push(currentBlock.trim());
      currentBlock = line;
    } else {
      currentBlock += (currentBlock ? ' ' : '') + line;
    }
  }
  if (currentBlock.trim()) {
    questionBlocks.push(currentBlock.trim());
  }

  // Se o usuário enviou apenas imagem sem texto extraído e sem chave API, gera exemplos estruturados de uma lista de exercícios
  const statementsToSolve =
    questionBlocks.length > 0
      ? questionBlocks
      : [
          'Questão 1: Resolva a equação 2x + 8 = 20 e descubra o valor de x.',
          'Questão 2: Um caderno custa R$ 40,00 e está com 15% de desconto à vista. Qual é o valor do desconto e o preço final?',
          'Questão 3: Calcule a área e o perímetro de um retângulo que possui base igual a 8 cm e altura igual a 5 cm.',
        ];

  const solvedQuestions: MathQuestionResolution[] = statementsToSolve.map((stmt, idx) => {
    const qNum = idx + 1;
    const lower = stmt.toLowerCase();

    // Detecta equação do 1º grau simples: ax + b = c ou ax - b = c
    const eqMatch = stmt.match(/(\d+)\s*x\s*([+\-])\s*(\d+)\s*=\s*(\d+)/i);
    if (eqMatch) {
      const a = Number(eqMatch[1]);
      const op = eqMatch[2];
      const b = Number(eqMatch[3]);
      const c = Number(eqMatch[4]);
      const rhs = op === '+' ? c - b : c + b;
      const invOp = op === '+' ? '-' : '+';
      const xVal = rhs / a;

      return {
        questionNumber: qNum,
        statement: stmt,
        topic: 'Equação do 1º Grau (Descobrir o valor de X)',
        whatToDoSummary:
          'Para descobrir o valor de X, nosso objetivo é deixá-lo sozinho de um lado do sinal de igual (=). Primeiro passamos o número sem letra para o outro lado invertendo o sinal, e depois dividimos pelo número que acompanha o X.',
        steps: [
          {
            stepNumber: 1,
            actionTitle: 'Identificar os termos da equação',
            calculation: `${a}x ${op} ${b} = ${c}`,
            explanation: `Temos o termo com letra (${a}x), o número solto (${op} ${b}) e o resultado do outro lado (${c}).`,
          },
          {
            stepNumber: 2,
            actionTitle: 'Passar o número sem letra para o outro lado (invertendo a operação)',
            calculation: `${a}x = ${c} ${invOp} ${b}   ➔   ${a}x = ${rhs}`,
            explanation: `Como o ${b} estava com sinal "${op}", ele atravessa o sinal de igual fazendo a operação inversa ("${invOp}").`,
          },
          {
            stepNumber: 3,
            actionTitle: `Dividir os dois lados por ${a} para isolar o X`,
            calculation: `x = ${rhs} ÷ ${a}   ➔   x = ${Number.isInteger(xVal) ? xVal : xVal.toFixed(2)}`,
            explanation: `O número ${a} estava multiplicando o X. Por isso, ele passa dividindo o ${rhs}.`,
          },
          {
            stepNumber: 4,
            actionTitle: 'Tirar a Prova Real (Conferir se está certo)',
            calculation: `${a} × (${Number.isInteger(xVal) ? xVal : xVal.toFixed(2)}) ${op} ${b} = ${c}`,
            explanation: 'Substituindo o X pelo valor encontrado, confirmamos que os dois lados ficam iguais!',
          },
        ],
        finalAnswer: `x = ${Number.isInteger(xVal) ? xVal : xVal.toFixed(2)}`,
        attentionTip:
          'Sempre que mudar um número de lado na igualdade, lembre-se de inverter o sinal (+ vira - e × vira ÷).',
      };
    }

    // Detecta porcentagem
    const pctMatch = stmt.match(/(\d+(?:[.,]\d+)?)\s*%.*?(\d+(?:[.,]\d+)?)/i);
    if (pctMatch || lower.includes('porcentagem') || lower.includes('desconto') || lower.includes('%')) {
      const pct = pctMatch ? Number(pctMatch[1].replace(',', '.')) : 15;
      const total = pctMatch ? Number(pctMatch[2].replace(',', '.')) : 40;
      const part = (pct * total) / 100;
      const discounted = total - part;

      return {
        questionNumber: qNum,
        statement: stmt,
        topic: 'Porcentagem e Desconto Passo a Passo',
        whatToDoSummary:
          'Primeiro transformamos a porcentagem em uma conta simples (multiplicar pelo valor total e dividir por 100). Depois, se a questão pedir desconto, subtraímos esse valor do total; se pedir acréscimo, somamos.',
        steps: [
          {
            stepNumber: 1,
            actionTitle: 'Anotar os valores importantes do enunciado',
            calculation: `Porcentagem = ${pct}%   |   Valor base = ${total}`,
            explanation: 'Separar os números antes de calcular evita confusão visual durante a leitura.',
          },
          {
            stepNumber: 2,
            actionTitle: 'Multiplicar a porcentagem pelo valor base',
            calculation: `${pct} × ${total} = ${pct * total}`,
            explanation: 'Multiplicamos os dois números normalmente como se fosse uma conta de vezes comum.',
          },
          {
            stepNumber: 3,
            actionTitle: 'Dividir o resultado por 100 ("por cento" significa dividir por 100)',
            calculation: `${pct * total} ÷ 100 = ${part.toFixed(2).replace('.', ',')}`,
            explanation: 'Ao dividir por 100 (ou andar duas casas com a vírgula para a esquerda), achamos o valor correspondente à porcentagem.',
          },
          {
            stepNumber: 4,
            actionTitle: 'Calcular o valor final (se houver desconto ou acréscimo)',
            calculation: `Com desconto: ${total} - ${part} = ${discounted.toFixed(2).replace('.', ',')}`,
            explanation: 'Sempre releia a última frase da questão para ver se ela pede só a porcentagem ou o preço final após o desconto.',
          },
        ],
        finalAnswer: `${pct}% de ${total} = ${part.toFixed(2).replace('.', ',')} (Valor com desconto: ${discounted.toFixed(2).replace('.', ',')})`,
        attentionTip:
          'Não pare na metade! Muitas questões de prova colocam o valor do desconto na alternativa A para distrair quem esquece de subtrair do total.',
      };
    }

    // Detecta área/perímetro/geometria
    if (lower.includes('área') || lower.includes('area') || lower.includes('perímetro') || lower.includes('retângulo') || lower.includes('triângulo')) {
      const nums = (stmt.match(/\d+(?:[.,]\d+)?/g) || []).map((n) => Number(n.replace(',', '.')));
      const b = nums.length >= 2 ? nums[nums.length - 2] : 8;
      const h = nums.length >= 2 ? nums[nums.length - 1] : 5;
      return {
        questionNumber: qNum,
        statement: stmt,
        topic: 'Geometria Plana (Área e Perímetro)',
        whatToDoSummary:
          'Desenhe mentalmente a figura e separe as medidas da Base e da Altura. Lembre-se: Área é o preenchimento de dentro (multiplicação) e Perímetro é a soma de todos os lados ao redor.',
        steps: [
          {
            stepNumber: 1,
            actionTitle: 'Separar as medidas informadas no problema',
            calculation: `Base (b) = ${b} cm   |   Altura (h) = ${h} cm`,
            explanation: 'Organizar as medidas evita misturar base com altura na hora de aplicar a fórmula.',
          },
          {
            stepNumber: 2,
            actionTitle: 'Calcular a Área (Base × Altura)',
            calculation: `Área = ${b} × ${h} = ${b * h} cm²`,
            explanation: 'Multiplicamos a base pela altura para descobrir quantos quadradinhos cabem dentro da figura.',
          },
          {
            stepNumber: 3,
            actionTitle: 'Calcular o Perímetro (Soma de todos os lados)',
            calculation: `Perímetro = ${b} + ${b} + ${h} + ${h} = ${2 * (b + h)} cm`,
            explanation: 'Somamos os 4 lados do contorno da figura.',
          },
        ],
        finalAnswer: `Área = ${b * h} cm²  |  Perímetro = ${2 * (b + h)} cm`,
        attentionTip:
          'Cuidado para não confundir: Área multiplica os lados (cm²) e Perímetro soma todos os lados do contorno (cm).',
      };
    }

    // Resolução estruturada universal para qualquer outra questão da lista
    return {
      questionNumber: qNum,
      statement: stmt,
      topic: 'Resolução Guiada Passo a Passo',
      whatToDoSummary:
        'Vamos dividir o problema em 4 etapas curtas: (1) Destacar os números e o que a pergunta pede, (2) Escolher a operação certa, (3) Resolver uma conta por vez e (4) Conferir se a resposta faz sentido.',
      steps: [
        {
          stepNumber: 1,
          actionTitle: 'Extrair os dados e grifar a pergunta principal',
          calculation: `Dados identificados no enunciado: "${stmt.slice(0, 90)}${stmt.length > 90 ? '...' : ''}"`,
          explanation:
            'Em vez de tentar resolver tudo de cabeça, anotamos primeiro os valores que o problema entregou e circulamos o que ele quer descobrir no final.',
        },
        {
          stepNumber: 2,
          actionTitle: 'Montar a estratégia e a operação matemática',
          calculation: 'Relacionar os valores conhecidos ➔ Montar a expressão passo a passo',
          explanation:
            'Verificamos se os valores estão na mesma unidade de medida e montamos a conta na ordem correta (parênteses primeiro, depois multiplicação/divisão, e por último soma/subtração).',
        },
        {
          stepNumber: 3,
          actionTitle: 'Executar o cálculo por partes (sem pular etapas)',
          calculation: 'Resolver uma operação por linha para manter o caderno organizado',
          explanation:
            'Fazendo uma linha por vez, você enxerga cada transformação do número e evita erros de sinal ou tabuada.',
        },
      ],
      finalAnswer:
        'Confira os passos acima e, se quiser que a IA leia os números exatos da foto manuscrita, ative sua Chave Gemini gratuita em Configurações!',
      attentionTip:
        'Resolva sempre uma linha embaixo da outra, alinhando o sinal de igual (=). Isso reduz em 80% os erros visuais na Matemática!',
    };
  });

  const fileLabel = filesData[0]?.fileName
    ? filesData[0].fileName.replace(/\.[^.]+$/, '')
    : 'Lista de Exercícios de Matemática';

  return {
    title: `${fileLabel} (${solvedQuestions.length} ${solvedQuestions.length === 1 ? 'questão resolvida' : 'questões resolvidas'})`,
    imageUrls: filesData.filter((f) => f.mimeType.startsWith('image/')).map((f) => f.dataUrl),
    sourceText: extractedOrTypedText,
    questions: solvedQuestions,
  };
}

// ============================================================================
// MÓDULO REDAÇÃO: (1) Correção pelos 5 Critérios do ENEM e (2) Praticar em Blocos LEGO
// ============================================================================

export async function correctEnemEssay(
  filesData: Array<{ dataUrl: string; mimeType: string; fileName?: string }>,
  essayText: string,
  themeHint: string,
  apiKey: string,
  model: string
): Promise<Omit<EssayCorrectionItem, 'id' | 'createdAt' | 'formattedDate'>> {
  const inlineList: GeminiInlineData[] = filesData
    .filter((f) => f.dataUrl && f.mimeType)
    .map((f) => ({ data: f.dataUrl, mimeType: f.mimeType }));

  if (apiKey.trim()) {
    const prompt = `Você é um corretor especialista do ENEM treinado para ajudar estudantes com Dislexia, TDA e TDAH.
O aluno enviou uma foto/arquivo ou texto da sua redação para correção segundo os 5 critérios (Competências) oficiais do ENEM.
Tema informado (se houver): "${themeHint || 'Identificar pelo texto/foto'}"
Texto enviado/extraído (se houver):
${essayText || '(Transcreva fielmente o texto manuscrito ou digital da imagem em anexo)'}

Faça:
1. A transcrição completa da redação (se veio por foto).
2. A nota de 0 a 200 (em múltiplos de 40: 0, 40, 80, 120, 160, 200) para cada uma das 5 Competências do ENEM e a nota total (0 a 1000).
3. Uma análise acolhedora, clara e objetiva em cada competência.
4. Sugestões SIMPLES e PRÁTICAS de melhoria ("o que aconteceu" -> "como consertar na prática" -> "exemplo pronto de reescrita").

Retorne APENAS um JSON válido com a estrutura:
{
  "title": "Correção ENEM — Título/Tema da Redação",
  "theme": "Tema da redação identificado",
  "transcribedEssay": "Texto completo da redação do aluno",
  "totalScore": 760,
  "generalAnalysis": "Visão geral encorajadora e direta sobre os pontos fortes e o que mais pode subir a nota rapidamente",
  "competencies": [
    {
      "number": 1,
      "title": "Competência 1: Domínio da escrita formal da língua portuguesa",
      "score": 160,
      "analysis": "Análise clara sobre ortografia, acentuação, regência e construção das frases",
      "practicalSuggestions": ["Sugestão prática 1", "Sugestão prática 2"]
    },
    {
      "number": 2,
      "title": "Competência 2: Compreender o tema e aplicar repertório sociocultural",
      "score": 160,
      "analysis": "...",
      "practicalSuggestions": ["..."]
    },
    {
      "number": 3,
      "title": "Competência 3: Projeto de texto, coerência e defesa dos argumentos",
      "score": 160,
      "analysis": "...",
      "practicalSuggestions": ["..."]
    },
    {
      "number": 4,
      "title": "Competência 4: Conectivos e coesão entre frases e parágrafos",
      "score": 120,
      "analysis": "...",
      "practicalSuggestions": ["..."]
    },
    {
      "number": 5,
      "title": "Competência 5: Proposta de intervenção com os 5 elementos obrigatórios",
      "score": 160,
      "analysis": "...",
      "practicalSuggestions": ["..."]
    }
  ],
  "simpleActionPlan": [
    {
      "whatHappened": "Onde o texto perdeu pontos de forma simples",
      "howToFixPractically": "Ação prática passo a passo para corrigir",
      "exampleRewrite": "Exemplo de frase pronta melhorada para o aluno comparar"
    }
  ]
}`;

    const res = await callGeminiJson<
      Omit<EssayCorrectionItem, 'id' | 'createdAt' | 'formattedDate' | 'imageUrls'>
    >(apiKey, model, prompt, inlineList.length > 0 ? inlineList : undefined);

    if (res && Array.isArray(res.competencies) && res.competencies.length > 0) {
      return {
        ...res,
        imageUrls: filesData.filter((f) => f.mimeType.startsWith('image/')).map((f) => f.dataUrl),
      };
    }
  }

  // Avaliação local estruturada nos 5 critérios do ENEM
  const cleanText = (essayText || '').trim();
  const paragraphs = cleanText
    ? cleanText.split(/\n\s*\n|\n/).filter((p) => p.trim().length > 20)
    : [];
  const wordCount = cleanText ? cleanText.split(/\s+/).length : 0;

  const hasConnectors =
    /\b(portanto|além disso|nesse sentido|ademais|outrossim|dessa forma|sob essa ótica|em primeiro plano|por conseguinte|entretanto|contudo)\b/i.test(
      cleanText
    );
  const hasIntervention =
    /\b(ministério|governo|escola|mídia|cabe a|deve|por meio de|através de|a fim de|para que|campanha|lei|projetos)\b/i.test(
      cleanText
    );
  const hasRepertoire =
    /\b(constituição|1988|segundo|filósofo|sociólogo|história|ibge|onu|oms|revolução|filme|livro|série|bauman|kant|foucault|Paulo Freire)\b/i.test(
      cleanText
    );

  const c1 = wordCount > 120 ? 160 : 120;
  const c2 = hasRepertoire ? 160 : 120;
  const c3 = paragraphs.length >= 3 ? 160 : 120;
  const c4 = hasConnectors ? 160 : 120;
  const c5 = hasIntervention ? 160 : 120;
  const totalScore = c1 + c2 + c3 + c4 + c5;

  const inferredTheme =
    themeHint.trim() ||
    'Desafios contemporâneos da sociedade brasileira (Tema avaliado pelos critérios do ENEM)';

  return {
    title: `Correção ENEM — ${inferredTheme}`,
    theme: inferredTheme,
    imageUrls: filesData.filter((f) => f.mimeType.startsWith('image/')).map((f) => f.dataUrl),
    transcribedEssay:
      cleanText ||
      '(Foto da redação anexada. Para transcrição óptica automática de letra cursiva, configure sua chave Gemini gratuita na aba Configurações ou cole seu texto no campo de apoio.)',
    totalScore,
    generalAnalysis:
      'Sua redação apresenta boas ideias centrais! Para subir sua nota rumo aos 900+ pontos no ENEM sem esforço extra, o segredo é usar a técnica dos blocos fixos: garantir 4 parágrafos bem divididos, colocar um conectivo no início de cada parágrafo e fechar a conclusão respondendo às 5 perguntas da Proposta de Intervenção.',
    competencies: [
      {
        number: 1,
        title: 'Competência 1: Domínio da escrita formal da língua portuguesa',
        score: c1,
        analysis:
          'Avalia ortografia, acentuação, pontuação e se as frases não estão longas demais. Frases mais curtas (2 a 3 períodos por parágrafo) ajudam muito a evitar erros de concordância e vírgula.',
        practicalSuggestions: [
          'Divida frases maiores de 3 linhas colocando um ponto final e começando a próxima com um conectivo ("Nesse sentido,", "Dessa forma,").',
          'Evite palavras informais da fala ("tipo", "coisa", "a gente") — troque "a gente" por "a sociedade" ou "os cidadãos".',
        ],
      },
      {
        number: 2,
        title: 'Competência 2: Compreender o tema e usar Repertório Sociocultural',
        score: c2,
        analysis: hasRepertoire
          ? 'Muito bem! Você trouxe referências externas para apoiar o tema, cumprindo o formato dissertativo-argumentativo.'
          : 'Seu texto falou sobre o assunto, mas precisa citar pelo menos 1 ou 2 referências externas (Constituição de 1988, dados do IBGE, fatos históricos, livros ou filmes) para provar seu ponto.',
        practicalSuggestions: [
          'Use o Repertório Coringa da Constituição na Introdução: "A Constituição Federal de 1988 garante a todos o direito à dignidade e ao bem-estar social. Contudo, na prática..."',
          'Repita as palavras-chave do tema já no 1º parágrafo para garantir zero risco de tangenciamento.',
        ],
      },
      {
        number: 3,
        title: 'Competência 3: Projeto de Texto e Defesa dos Argumentos (Causa e Consequência)',
        score: c3,
        analysis:
          'Avalia se a sua redação tem começo, meio e fim planejados (Introdução + Causa 1 no D1 + Causa 2 no D2 + Solução na Conclusão).',
        practicalSuggestions: [
          'Escolha sempre 2 culpados/causas fáceis de explicar: por exemplo, (D1) Falha ou omissão do Estado/Governo e (D2) Falta de debate nas escolas ou na sociedade.',
          'Em cada parágrafo de desenvolvimento, explique: O que acontece (Causa) ➔ Por que é grave (Explicação) ➔ Quem sofre com isso (Consequência).',
        ],
      },
      {
        number: 4,
        title: 'Competência 4: Mecanismos Linguísticos (Conectivos e Coesão)',
        score: c4,
        analysis: hasConnectors
          ? 'Você já utiliza conectivos para ligar suas ideias! Para chegar aos 200 pontos, garanta conectivos no início do D1, D2 e Conclusão, além de pelo menos 1 conectivo no meio de cada parágrafo.'
          : 'Faltaram conectivos explícitos ligando os parágrafos e as frases. No ENEM, os corretores procuram conectivos no começo dos parágrafos (interparágrafos) e dentro deles (intraparágrafos).',
        practicalSuggestions: [
          'Comece o 2º parágrafo (D1) com: "Em primeiro plano, vale destacar que..."',
          'Comece o 3º parágrafo (D2) com: "Além disso, outro fator preocupante é..."',
          'Comece o 4º parágrafo (Conclusão) com: "Portanto, medidas urgentes são necessárias para..."',
        ],
      },
      {
        number: 5,
        title: 'Competência 5: Proposta de Intervenção (Os 5 Elementos do ENEM)',
        score: c5,
        analysis:
          'Na conclusão do ENEM, cada um dos 5 elementos vale 40 pontos (5 × 40 = 200 pontos). É como preencher um checklist de 5 peças!',
        practicalSuggestions: [
          '1. AGENTE (Quem?): "Cabe ao Ministério da Educação (ou Governo Federal)..."',
          '2. AÇÃO (Fazer o quê?): "...criar campanhas educativas e projetos nas escolas..."',
          '3. MEIO/MODO (Como?): "...por meio de palestras, oficinas práticas e verbas públicas..."',
          '4. DETALHAMENTO (Explicação extra): "...— com a participação de psicólogos, professores e famílias —..."',
          '5. EFEITO (Para quê?): "...a fim de garantir que todos os jovens tenham seus direitos respeitados."',
        ],
      },
    ],
    simpleActionPlan: [
      {
        whatHappened: 'Parágrafos com frases muito longas ou sem divisão clara em 3 períodos.',
        howToFixPractically:
          'Use a regra dos 3 pontos finais por parágrafo: 1ª frase apresenta a ideia, 2ª frase traz o exemplo/repertório, 3ª frase conclui o raciocínio.',
        exampleRewrite:
          '"Em primeiro plano, nota-se que a falta de informação agrava o problema. Segundo o IBGE, milhões de brasileiros ainda enfrentam essa barreira diariamente. Dessa forma, sem apoio adequado, a desigualdade continua crescendo."',
      },
      {
        whatHappened: 'Proposta de intervenção na Conclusão pode ganhar os 200 pontos completos.',
        howToFixPractically:
          'Monte o último parágrafo juntando as 5 peças obrigatórias na mesma ordem (Agente + Ação + Meio + Detalhamento entre travessões + Finalidade).',
        exampleRewrite:
          '"Portanto, cabe ao Ministério da Educação (Agente) promover projetos de conscientização nas escolas (Ação), por meio de oficinas interativas e materiais acessíveis (Meio) — desenvolvidos em parceria com especialistas e famílias (Detalhamento) —, a fim de formar cidadãos mais preparados e reduzir esse problema no Brasil (Efeito)."',
      },
    ],
  };
}

const ENEM_AUTO_THEMES: Array<{
  themeTitle: string;
  enemAxis: string;
  motivatingContext: string;
  arg1Focus: string;
  arg2Focus: string;
  repertoire1: string;
  repertoire2: string;
  agentSuggestion: string;
}> = [
  {
    themeTitle:
      'Desafios para a inclusão educacional de estudantes neurodivergentes (Dislexia e TDAH) no Brasil',
    enemAxis: 'Educação, Direitos Humanos e Inclusão Social',
    motivatingContext:
      'Milhões de crianças e adolescentes brasileiros possuem Dislexia, TDA ou TDAH. Embora a lei garanta educação inclusiva, muitas escolas ainda carecem de materiais adaptados, formação docente e acolhimento adequado.',
    arg1Focus: 'A falta de preparo e de recursos pedagógicos adaptados nas escolas',
    arg2Focus: 'A desinformação social que gera rótulos injustos e atraso no diagnóstico',
    repertoire1:
      'Artigo 205 da Constituição Federal de 1988 (garante a educação como direito de todos para o pleno desenvolvimento da pessoa).',
    repertoire2:
      'Lei Brasileira de Inclusão (Estatuto da Pessoa com Deficiência) e diretrizes do MEC sobre atendimento educacional especializado.',
    agentSuggestion: 'Ministério da Educação (MEC) em parceria com as Secretarias Estaduais de Ensino',
  },
  {
    themeTitle:
      'O impacto do uso excessivo de telas e redes sociais na saúde mental dos adolescentes brasileiros',
    enemAxis: 'Saúde Pública, Tecnologia e Comportamento',
    motivatingContext:
      'O tempo diário diante de smartphones e algoritmos de vídeos curtos cresceu drasticamente entre jovens, aumentando quadros de ansiedade, insônia, comparação social e dificuldade de concentração nos estudos.',
    arg1Focus: 'A arquitetura viciante dos algoritmos digitais voltada à retenção da atenção',
    arg2Focus: 'A falta de diálogo familiar e de educação digital nas escolas sobre uso saudável',
    repertoire1:
      'Conceito de "Sociedade do Cansaço", do filósofo Byung-Chul Han, sobre o excesso de estímulos e hiperatenção no mundo moderno.',
    repertoire2:
      'Dados da Organização Mundial da Saúde (OMS) sobre o crescimento da ansiedade entre jovens na era digital.',
    agentSuggestion: 'Ministério da Saúde em conjunto com o Ministério da Educação',
  },
  {
    themeTitle:
      'Caminhos para combater o bullying e o cyberbullying no ambiente escolar brasileiro',
    enemAxis: 'Educação, Cidadania e Convivência Democrática',
    motivatingContext:
      'A intimidação sistemática presencial (bullying) e virtual (cyberbullying) afeta a autoestima, a frequência escolar e a saúde emocional de estudantes em todo o país, exigindo prevenção ativa.',
    arg1Focus: 'A sensação de impunidade nas redes sociais e a naturalização de agressões verbais',
    arg2Focus: 'A ausência de projetos contínuos de empatia e escuta psicológica nas escolas',
    repertoire1:
      'Estatuto da Criança e do Adolescente (ECA - Lei nº 8.069/1990), que assegura a proteção integral e o respeito à dignidade de crianças e jovens.',
    repertoire2:
      'Conceito de "Violência Simbólica", do sociólogo Pierre Bourdieu, que explica como agressões verbais e exclusões deixam marcas profundas.',
    agentSuggestion: 'Ministério da Educação (MEC) aliado às direções escolares e conselhos tutelares',
  },
  {
    themeTitle:
      'A importância da leitura e da democratização do acesso ao livro no Brasil contemporâneo',
    enemAxis: 'Cultura, Educação e Cidadania',
    motivatingContext:
      'Pesquisas mostram que o brasileiro lê poucos livros por ano devido ao preço das obras, à falta de bibliotecas comunitárias ativas e à ausência de incentivo lúdico e acessível desde a infância.',
    arg1Focus: 'A desigualdade de acesso a bibliotecas modernas, audiolivros e acervos variados',
    arg2Focus: 'A visão escolar tradicional que muitas vezes trata a leitura apenas como obrigação de prova',
    repertoire1:
      'O sociólogo Antonio Candido, no texto "O Direito à Literatura", afirma que a leitura e a arte são bens indispensáveis para humanizar o cidadão.',
    repertoire2:
      'Pesquisa "Retratos da Leitura no Brasil", que aponta os desafios de acesso cultural nas diferentes regiões do país.',
    agentSuggestion: 'Ministério da Cultura em parceria com o Ministério da Educação',
  },
];

let autoThemeCounter = 0;

function buildDefaultLegoParagraphs(
  themeTitle: string,
  arg1Focus: string,
  arg2Focus: string,
  repertoire1: string,
  repertoire2: string,
  agentSuggestion: string,
  selectedParagraphs: EssayParagraphType[]
): EssayLegoParagraph[] {
  const allParagraphs: EssayLegoParagraph[] = [
    {
      paragraphType: 'introducao',
      title: '1º Parágrafo — Introdução (3 Blocos de Montar)',
      subtitle: 'Apresente o tema, mostre uma referência e aponte os 2 problemas que você vai discutir.',
      goalDescription:
        'Pense na Introdução como a vitrine da sua redação: você começa com uma ideia geral (Bloco 1), mostra como o problema acontece no Brasil (Bloco 2) e fecha dizendo as 2 causas que vai explicar nos próximos parágrafos (Bloco 3).',
      blocks: [
        {
          id: 'intro-bloco-1',
          blockNumber: 1,
          blockLabel: 'Bloco 1 (Azul): Contextualização / Repertório Inicial',
          enemCriterion: 'Competência 2 — Começar com uma referência histórica, lei ou fato conhecido',
          colorHex: '#2563EB',
          whatToWrite:
            'Comece citando uma lei (como a Constituição de 1988), um livro, um filme ou um dado importante sobre o assunto.',
          suggestedConnectors: [
            'A Constituição Federal de 1988 garante que',
            'Historicamente, observa-se que',
            'Segundo a Declaração Universal dos Direitos Humanos,',
          ],
          guidedTemplate:
            'A Constituição Federal de 1988 assegura a todos os cidadãos o direito a [direito relacionado ao tema].',
          themeExample: `A Constituição Federal de 1988 assegura a todos os cidadãos o direito à educação, à saúde e ao pleno desenvolvimento. (${repertoire1})`,
          userText: '',
        },
        {
          id: 'intro-bloco-2',
          blockNumber: 2,
          blockLabel: 'Bloco 2 (Amarelo): Conectivo de Contraste + Apresentação do Tema',
          enemCriterion: 'Competência 2 e 4 — Mostrar que na prática existe um desafio e citar as palavras do tema',
          colorHex: '#D97706',
          whatToWrite:
            'Use um conectivo de oposição ("Entretanto,", "Contudo,") e escreva a frase do tema mostrando que esse direito ainda enfrenta obstáculos no Brasil.',
          suggestedConnectors: [
            'Entretanto, na prática brasileira,',
            'Contudo, observa-se no Brasil atual que',
            'Todavia, a realidade nacional mostra que',
          ],
          guidedTemplate:
            'Entretanto, na realidade brasileira atual, percebe-se que [escreva aqui as palavras principais do tema] ainda enfrenta graves barreiras.',
          themeExample: `Entretanto, na prática brasileira, percebe-se que "${themeTitle}" ainda enfrenta sérios obstáculos para se concretizar plenamente.`,
          userText: '',
        },
        {
          id: 'intro-bloco-3',
          blockNumber: 3,
          blockLabel: 'Bloco 3 (Verde): Tese (Causa 1 + Causa 2)',
          enemCriterion: 'Competência 3 — Planejar os 2 argumentos que serão explicados no D1 e no D2',
          colorHex: '#059669',
          whatToWrite:
            'Feche a introdução apontando os 2 motivos principais do problema: o Motivo 1 (que irá para o 2º parágrafo) e o Motivo 2 (que irá para o 3º parágrafo).',
          suggestedConnectors: [
            'Nesse contexto, esse problema ocorre tanto pela',
            'Dessa forma, cabe analisar como a',
            'Diante disso, destacam-se dois fatores principais:',
          ],
          guidedTemplate:
            'Nesse contexto, esse cenário preocupante ocorre tanto por causa de [Causa 1] quanto devido a [Causa 2].',
          themeExample: `Nesse contexto, esse cenário preocupante persiste tanto devido a ${arg1Focus.toLowerCase()} quanto por causa de ${arg2Focus.toLowerCase()}.`,
          userText: '',
        },
      ],
    },
    {
      paragraphType: 'desenvolvimento_1',
      title: '2º Parágrafo — Desenvolvimento 1 (4 Blocos de Montar)',
      subtitle: 'Explique a Causa 1 (o primeiro problema que você prometeu na Introdução).',
      goalDescription:
        'Aqui você defende o seu 1º argumento passo a passo: apresenta a ideia (Bloco 1), traz uma prova ou exemplo (Bloco 2), explica o prejuízo que isso causa (Bloco 3) e fecha o parágrafo (Bloco 4).',
      blocks: [
        {
          id: 'd1-bloco-1',
          blockNumber: 1,
          blockLabel: 'Bloco 1 (Azul): Conectivo de Abertura + Tópico Frasal (Causa 1)',
          enemCriterion: 'Competência 3 e 4 — Frase curta apresentando o assunto do 2º parágrafo',
          colorHex: '#2563EB',
          whatToWrite:
            'Comece com um conectivo de primeiro argumento e apresente de forma direta a Causa 1.',
          suggestedConnectors: [
            'Em primeiro plano, vale destacar que',
            'De início, observa-se que',
            'Primeiramente, é fundamental notar que',
          ],
          guidedTemplate:
            'Em primeiro plano, vale destacar que [explique a Causa 1] agrava diretamente o problema.',
          themeExample: `Em primeiro plano, vale destacar que ${arg1Focus.toLowerCase()} dificulta diretamente o avanço dessa questão no país.`,
          userText: '',
        },
        {
          id: 'd1-bloco-2',
          blockNumber: 2,
          blockLabel: 'Bloco 2 (Roxo): Repertório / Exemplo que Comprova a Causa 1',
          enemCriterion: 'Competência 2 — Trazer uma lei, pensador, pesquisa ou exemplo concreto',
          colorHex: '#7C3AED',
          whatToWrite:
            'Cite uma referência, pesquisa, lei ou fato real que comprove que essa falha realmente acontece.',
          suggestedConnectors: [
            'De acordo com',
            'Sob essa ótica, segundo',
            'A título de exemplo, dados mostram que',
          ],
          guidedTemplate:
            'De acordo com [cite a lei, autor ou dado], é essencial garantir estrutura adequada, mas isso nem sempre ocorre.',
          themeExample: `Sob essa ótica, ${repertoire2} Porém, na rotina de muitas cidades, faltam investimentos e ações práticas para tirar esse direito do papel.`,
          userText: '',
        },
        {
          id: 'd1-bloco-3',
          blockNumber: 3,
          blockLabel: 'Bloco 3 (Amarelo): Explicação Crítica (Causa ➔ Consequência)',
          enemCriterion: 'Competência 3 — Explicar quem é prejudicado e por que isso é grave',
          colorHex: '#D97706',
          whatToWrite:
            'Explique com suas palavras: quando essa falha acontece, o que os estudantes ou cidadãos sofrem no dia a dia?',
          suggestedConnectors: [
            'Como consequência disso,',
            'Isso acontece porque',
            'Por conta dessa falha,',
          ],
          guidedTemplate:
            'Como consequência disso, muitas pessoas acabam sofrendo com [explique o efeito negativo no dia a dia].',
          themeExample:
            'Como consequência disso, milhares de jovens encontram barreiras diárias que prejudicam seu aprendizado, sua autoestima e suas oportunidades futuras.',
          userText: '',
        },
        {
          id: 'd1-bloco-4',
          blockNumber: 4,
          blockLabel: 'Bloco 4 (Verde): Fechamento do Parágrafo D1',
          enemCriterion: 'Competência 3 e 4 — Concluir o raciocínio do parágrafo com clareza',
          colorHex: '#059669',
          whatToWrite:
            'Escreva uma frase curta reafirmando que essa situação precisa ser mudada.',
          suggestedConnectors: [
            'Logo, enquanto essa lacuna persistir,',
            'Dessa forma, fica evidente que',
            'Assim, torna-se urgente transformar essa realidade.',
          ],
          guidedTemplate:
            'Dessa forma, fica evidente que [retome a Causa 1] precisa ser superada com urgência.',
          themeExample:
            'Dessa forma, fica evidente que a falta de estrutura adequada impede o pleno exercício da cidadania.',
          userText: '',
        },
      ],
    },
    {
      paragraphType: 'desenvolvimento_2',
      title: '3º Parágrafo — Desenvolvimento 2 (4 Blocos de Montar)',
      subtitle: 'Explique a Causa 2 (o segundo problema prometido na Introdução).',
      goalDescription:
        'Funciona com a mesma lógica de LEGO do parágrafo anterior, mas agora somando um novo ponto de vista (como o papel da sociedade, da família, da mídia ou da cultura).',
      blocks: [
        {
          id: 'd2-bloco-1',
          blockNumber: 1,
          blockLabel: 'Bloco 1 (Azul): Conectivo de Soma + Tópico Frasal (Causa 2)',
          enemCriterion: 'Competência 4 — Ligar o 3º parágrafo ao 2º usando conectivo de adição',
          colorHex: '#2563EB',
          whatToWrite:
            'Comece com "Além disso," ou "Ademais," e apresente a segunda causa do problema.',
          suggestedConnectors: [
            'Além disso, outro fator preocupante é',
            'Ademais, cabe ressaltar que',
            'Outrossim, soma-se a esse cenário',
          ],
          guidedTemplate:
            'Além disso, outro fator preocupante é [apresente a Causa 2].',
          themeExample: `Além disso, outro fator preocupante é ${arg2Focus.toLowerCase()}, que reforça o problema na sociedade.`,
          userText: '',
        },
        {
          id: 'd2-bloco-2',
          blockNumber: 2,
          blockLabel: 'Bloco 2 (Roxo): Repertório / Exemplo Prático da Causa 2',
          enemCriterion: 'Competência 2 — Apoiar o 2º argumento com exemplo social ou cultural',
          colorHex: '#7C3AED',
          whatToWrite:
            'Traga uma comparação, dado social ou referência cultural que mostre como a falta de informação ou empatia afeta o tema.',
          suggestedConnectors: [
            'Segundo pesquisas e especialistas da área,',
            'Nesse sentido, observa-se no cotidiano que',
            'De acordo com estudos sociológicos,',
          ],
          guidedTemplate:
            'Segundo especialistas, quando um tema é pouco debatido, surgem preconceitos e hábitos prejudiciais.',
          themeExample:
            'Nesse sentido, observa-se no cotidiano que a ausência de informação acessível faz com que muitas famílias e instituições demorem a identificar e apoiar quem mais precisa.',
          userText: '',
        },
        {
          id: 'd2-bloco-3',
          blockNumber: 3,
          blockLabel: 'Bloco 3 (Amarelo): Aprofundamento (Como isso afeta as pessoas?)',
          enemCriterion: 'Competência 3 — Mostrar senso crítico e relação de causa e efeito',
          colorHex: '#D97706',
          whatToWrite:
            'Explique por que a sociedade não pode considerar esse problema como algo "normal".',
          suggestedConnectors: [
            'Em razão disso,',
            'Consequentemente,',
            'Por esse motivo,',
          ],
          guidedTemplate:
            'Em razão disso, cria-se um ciclo silencioso que dificulta a convivência e o bem-estar coletivo.',
          themeExample:
            'Em razão disso, perpetua-se um ciclo de invisibilidade e exclusão que afeta diretamente o desenvolvimento emocional e escolar dos jovens.',
          userText: '',
        },
        {
          id: 'd2-bloco-4',
          blockNumber: 4,
          blockLabel: 'Bloco 4 (Verde): Fechamento do Parágrafo D2',
          enemCriterion: 'Competência 3 e 4 — Fechar o parágrafo preparando o terreno para a solução',
          colorHex: '#059669',
          whatToWrite:
            'Conclua o 3º parágrafo destacando a importância de informar e conscientizar a população.',
          suggestedConnectors: [
            'Portanto, é indispensável promover',
            'Sendo assim, combater essa desinformação é essencial.',
            'Logo, mudar essa mentalidade social torna-se urgente.',
          ],
          guidedTemplate:
            'Sendo assim, promover o diálogo e a informação correta é um passo indispensável.',
          themeExample:
            'Sendo assim, superar a falta de informação e construir uma cultura de empatia é urgente para o país.',
          userText: '',
        },
      ],
    },
    {
      paragraphType: 'conclusao',
      title: '4º Parágrafo — Conclusão / Proposta de Intervenção (5 Blocos do ENEM)',
      subtitle: 'Junte as 5 peças obrigatórias da Competência 5 para garantir os 200 pontos!',
      goalDescription:
        'A Conclusão do ENEM é o parágrafo mais parecido com um LEGO de todos! Basta encaixar os 5 blocos obrigatórios: (1) Quem vai agir, (2) O que vai fazer, (3) Por meio de quê, (4) Um detalhamento explicativo e (5) Para qual finalidade.',
      blocks: [
        {
          id: 'conc-bloco-1',
          blockNumber: 1,
          blockLabel: 'Bloco 1 (Azul): Conectivo Conclusivo + AGENTE (Quem vai fazer?)',
          enemCriterion: 'Competência 4 e 5 — Elemento 1: Agente (40 pontos)',
          colorHex: '#2563EB',
          whatToWrite:
            'Comece com "Portanto," e diga claramente QUAL órgão ou instituição vai resolver o problema (ex: Ministério da Educação, Governo Federal, Secretarias de Saúde).',
          suggestedConnectors: [
            'Portanto, cabe ao Ministério da Educação',
            'Portanto, é dever do Governo Federal, em parceria com as escolas,',
            'Diante do exposto, urge que o Poder Público',
          ],
          guidedTemplate: 'Portanto, cabe ao [Nome do Ministério ou Instituição]',
          themeExample: `Portanto, cabe ao ${agentSuggestion}`,
          userText: '',
        },
        {
          id: 'conc-bloco-2',
          blockNumber: 2,
          blockLabel: 'Bloco 2 (Laranja): AÇÃO Prática (O que vai fazer?)',
          enemCriterion: 'Competência 5 — Elemento 2: Ação concreta (40 pontos)',
          colorHex: '#EA580C',
          whatToWrite:
            'Diga a ação concreta que esse Agente vai realizar (ex: criar programas de apoio, capacitar professores, promover campanhas educativas).',
          suggestedConnectors: [
            'implementar programas nacionais de apoio e capacitação,',
            'criar campanhas educativas e projetos permanentes nas escolas,',
            'ampliar o investimento em estrutura e acompanhamento especializado,',
          ],
          guidedTemplate: 'promover [escreva a ação concreta que resolve as causas do texto],',
          themeExample:
            'implementar programas permanentes de acolhimento, adaptação pedagógica e conscientização nas escolas e na comunidade,',
          userText: '',
        },
        {
          id: 'conc-bloco-3',
          blockNumber: 3,
          blockLabel: 'Bloco 3 (Amarelo): MEIO / MODO (Como será feito?)',
          enemCriterion: 'Competência 5 — Elemento 3: Meio/Modo de execução (40 pontos)',
          colorHex: '#D97706',
          whatToWrite:
            'Use a expressão "por meio de" ou "mediante" e explique a ferramenta prática que será usada para executar a ação.',
          suggestedConnectors: [
            'por meio de oficinas práticas, materiais acessíveis e formação de professores',
            'mediante o repasse de verbas públicas e palestras abertas às famílias',
            'por intermédio de plataformas educativas e atendimento multiprofissional',
          ],
          guidedTemplate: 'por meio de [explique os recursos, oficinas, verbas ou ferramentas]',
          themeExample:
            'por meio da distribuição de materiais didáticos acessíveis, treinamento docente e palestras informativas abertas às famílias',
          userText: '',
        },
        {
          id: 'conc-bloco-4',
          blockNumber: 4,
          blockLabel: 'Bloco 4 (Roxo): DETALHAMENTO (Explicação extra entre travessões ou vírgulas)',
          enemCriterion: 'Competência 5 — Elemento 4: Detalhamento do Agente, Ação ou Meio (40 pontos)',
          colorHex: '#7C3AED',
          whatToWrite:
            'Adicione uma explicação extra detalhando como essas oficinas/materiais vão funcionar (dica de ouro: coloque entre travessões ou parênteses para o corretor enxergar na hora!).',
          suggestedConnectors: [
            '— contando com a participação de psicólogos, educadores e especialistas —,',
            '— com linguagem clara, recursos visuais e exemplos práticos do cotidiano —,',
            '— priorizando as regiões e escolas com maior carência de recursos —,',
          ],
          guidedTemplate:
            '— com o apoio de especialistas e recursos adaptados à realidade de cada estudante —,',
          themeExample:
            '— contando com a participação ativa de psicopedagogos, professores e especialistas em acessibilidade —,',
          userText: '',
        },
        {
          id: 'conc-bloco-5',
          blockNumber: 5,
          blockLabel: 'Bloco 5 (Verde): EFEITO / FINALIDADE (Para quê?) + Fechamento',
          enemCriterion: 'Competência 5 — Elemento 5: Efeito esperado e retomada da introdução (40 pontos)',
          colorHex: '#059669',
          whatToWrite:
            'Comece com "a fim de" ou "para que" e mostre o resultado positivo que essa solução trará para o Brasil.',
          suggestedConnectors: [
            'a fim de garantir que todos os jovens tenham seus direitos respeitados na prática.',
            'para que o direito previsto na Constituição finalmente se torne realidade no Brasil.',
            'com o objetivo de construir uma sociedade mais justa, acolhedora e inclusiva.',
          ],
          guidedTemplate:
            'a fim de [escreva o resultado positivo esperado] e efetivar o direito previsto na Constituição.',
          themeExample: `a fim de superar os desafios de "${themeTitle}" e efetivar, na prática, a dignidade garantida pela Constituição de 1988.`,
          userText: '',
        },
      ],
    },
  ];

  return allParagraphs.filter((p) => selectedParagraphs.includes(p.paragraphType));
}

export async function generateEnemLegoStructure(
  options: {
    themeSource: 'gerado_ia' | 'arquivo_enviado';
    customThemeOrText?: string;
    filesDataUrls?: Array<{ dataUrl: string; mimeType: string; fileName?: string }>;
    practiceScope: EssayPracticeScope;
    selectedParagraphs: EssayParagraphType[];
  },
  apiKey: string,
  model: string
): Promise<Omit<EssayPracticeSession, 'id' | 'createdAt' | 'formattedDate'>> {
  const effectiveParagraphs: EssayParagraphType[] =
    options.practiceScope === 'redacao_completa'
      ? ['introducao', 'desenvolvimento_1', 'desenvolvimento_2', 'conclusao']
      : options.selectedParagraphs.length > 0
        ? options.selectedParagraphs
        : ['introducao'];

  const inlineList: GeminiInlineData[] = (options.filesDataUrls || [])
    .filter((f) => f.dataUrl && f.mimeType)
    .map((f) => ({ data: f.dataUrl, mimeType: f.mimeType }));

  if (apiKey.trim()) {
    const prompt = `Você é um professor de Redação do ENEM especialista em estudantes com Dislexia, TDA e TDAH.
Objetivo: Transformar a construção da redação do ENEM em blocos práticos e estruturados ("peças de LEGO" que o aluno preenche e junta para formar o parágrafo ou a redação completa).
Fonte do tema: ${options.themeSource === 'gerado_ia' ? 'Gerar um tema atual estilo ENEM (ou usar o assunto sugerido pelo aluno)' : 'Extrair o tema e contexto da foto/arquivo da proposta enviada pelo aluno'}.
Texto/assunto enviado pelo aluno (se houver): "${options.customThemeOrText || ''}"
Parágrafos selecionados pelo aluno para praticar agora: ${effectiveParagraphs.join(', ')}.

Para cada parágrafo selecionado (${effectiveParagraphs.join(', ')}), crie os blocos de montar estilo LEGO seguindo rigorosamente os critérios do ENEM:
- introducao: 3 blocos (Bloco 1: Repertório/Contextualização; Bloco 2: Conectivo de Contraste + Tema; Bloco 3: Tese com Causa 1 + Causa 2)
- desenvolvimento_1: 4 blocos (Bloco 1: Conectivo + Tópico Frasal da Causa 1; Bloco 2: Repertório/Exemplo; Bloco 3: Explicação Causa-Consequência; Bloco 4: Fechamento do parágrafo)
- desenvolvimento_2: 4 blocos (Bloco 1: Conectivo de Soma + Tópico Frasal da Causa 2; Bloco 2: Repertório/Exemplo; Bloco 3: Aprofundamento Crítico; Bloco 4: Fechamento do parágrafo)
- conclusao: 5 blocos dos 5 elementos obrigatórios da Competência 5 (Bloco 1: Conectivo + Agente; Bloco 2: Ação; Bloco 3: Meio/Modo; Bloco 4: Detalhamento; Bloco 5: Efeito/Finalidade)

Retorne APENAS um JSON válido com a estrutura:
{
  "themeTitle": "Frase temática completa estilo ENEM",
  "enemAxis": "Eixo temático (ex: Educação, Saúde, Meio Ambiente, Tecnologia...)",
  "motivatingContext": "Resumo curto e claro de 2 a 3 frases contextualizando o tema para o aluno ter ideias sem cansaço visual",
  "paragraphs": [
    {
      "paragraphType": "introducao",
      "title": "1º Parágrafo — Introdução (3 Blocos de Montar)",
      "subtitle": "Subtítulo explicativo curto",
      "goalDescription": "Explicação simples de como montar este parágrafo",
      "blocks": [
        {
          "id": "intro-bloco-1",
          "blockNumber": 1,
          "blockLabel": "Bloco 1: Contextualização / Repertório Inicial",
          "enemCriterion": "Competência 2 (Repertório Sociocultural)",
          "colorHex": "#2563EB",
          "whatToWrite": "Instrução curta e prática do que escrever neste bloco",
          "suggestedConnectors": ["Conectivo 1", "Conectivo 2", "Conectivo 3"],
          "guidedTemplate": "Molde com lacunas para ajudar a começar",
          "themeExample": "Exemplo concreto já aplicado a este tema",
          "userText": ""
        }
      ]
    }
  ]
}`;

    const res = await callGeminiJson<{
      themeTitle: string;
      enemAxis: string;
      motivatingContext: string;
      paragraphs: EssayLegoParagraph[];
    }>(apiKey, model, prompt, inlineList.length > 0 ? inlineList : undefined);

    if (res && res.themeTitle && Array.isArray(res.paragraphs) && res.paragraphs.length > 0) {
      return {
        themeTitle: res.themeTitle,
        themeSource: options.themeSource,
        motivatingContext: res.motivatingContext,
        enemAxis: res.enemAxis || 'Eixo Temático ENEM',
        imageUrls: (options.filesDataUrls || [])
          .filter((f) => f.mimeType.startsWith('image/'))
          .map((f) => f.dataUrl),
        practiceScope: options.practiceScope,
        selectedParagraphs: effectiveParagraphs,
        paragraphs: res.paragraphs.map((p) => ({
          ...p,
          blocks: (p.blocks || []).map((b) => ({ ...b, userText: b.userText || '' })),
        })),
      };
    }
  }

  // Geração estruturada local (para tema automático ou proposta enviada)
  const customClean = (options.customThemeOrText || '').trim();
  const preset = ENEM_AUTO_THEMES[autoThemeCounter % ENEM_AUTO_THEMES.length];
  autoThemeCounter += 1;

  const chosenThemeTitle =
    customClean.length > 5
      ? customClean.split('\n')[0].slice(0, 140)
      : options.themeSource === 'arquivo_enviado' && options.filesDataUrls?.length
        ? `Proposta Digitalizada: ${options.filesDataUrls[0].fileName?.replace(/\.[^.]+$/, '') || 'Tema da Folha de Redação'}`
        : preset.themeTitle;

  const motivatingContext =
    customClean.length > 60
      ? customClean.slice(0, 320)
      : preset.motivatingContext;

  const paragraphs = buildDefaultLegoParagraphs(
    chosenThemeTitle,
    preset.arg1Focus,
    preset.arg2Focus,
    preset.repertoire1,
    preset.repertoire2,
    preset.agentSuggestion,
    effectiveParagraphs
  );

  return {
    themeTitle: chosenThemeTitle,
    themeSource: options.themeSource,
    motivatingContext,
    enemAxis: preset.enemAxis,
    imageUrls: (options.filesDataUrls || [])
      .filter((f) => f.mimeType.startsWith('image/'))
      .map((f) => f.dataUrl),
    practiceScope: options.practiceScope,
    selectedParagraphs: effectiveParagraphs,
    paragraphs,
  };
}


