import cheerio from 'cheerio';

const KEYWORDS = {
  origin: {
    positive: ['국산', '국내산', '우리땅', '토종', '한우', '한돈', '우리 농산물', '우리농산물', '100% 국산', '100% 국내산', '국산 100%'],
    negative: ['수입산', '외국산', '칠레산', '미국산', '중국산', '호주산', '베트남산', '태국산', '브라질산', '스페인산']
  },
  production: {
    positive: ['직접 재배', '직접 생산', '산지 직송', '산지직송', '농장 직송', '농장직송', '수제', '직접 제조', '직접 가공', '가공시설', '제조시설', '직접 경작', '직공', '자체 생산', '자체 가공'],
    negative: ['단순 유통', '대리 판매', '대리판매', '위탁 판매', '위탁판매', '벤더', '단순 사입', '사입', 'OEM', '도매', '소매', '유통업체', '위탁생산']
  },
  certifications: {
    positive: ['친환경', '무농약', '유기농', 'GAP', '농업경영체', 'HACCP', '해썹', '전통식품', '지리적표시', '인증서', '국가공인', '인증 획득']
  },
  livestock: {
    positive: ['축산물', '육가공', '포장육', '도축', '발골', '양념육', '돼지갈비', '소고기', '돼지고기', '닭고기', '오리고기', '2차 가공']
  },
  coop: {
    positive: ['영농조합법인', '농업회사법인', '농업회사', '영농조합', '협동조합', '농협', '축협', '수협', '생산자 단체', '생산자단체']
  },
  contract: {
    positive: ['계약재배', '계약 재배', '농가 거래', '선급금', '종자 지원', '자재 지원', '생산 자금']
  }
};

function analyzeText(title, text) {
  const combinedText = (title + ' ' + text).toLowerCase();
  const matches = {};
  const scores = { origin: 50, production: 50, credibility: 50 };
  const foundSentences = [];

  const sentences = text.split(/[.\n?!]/).map(s => s.trim()).filter(s => s.length > 5);

  for (const [category, types] of Object.entries(KEYWORDS)) {
    matches[category] = { positive: [], negative: [] };
    if (types.positive) {
      types.positive.forEach(word => {
        if (combinedText.includes(word.toLowerCase())) {
          matches[category].positive.push(word);
        }
      });
    }
    if (types.negative) {
      types.negative.forEach(word => {
        if (combinedText.includes(word.toLowerCase())) {
          matches[category].negative.push(word);
        }
      });
    }
  }

  sentences.forEach(sentence => {
    let hasPositive = false;
    let hasNegative = false;
    const reasons = [];

    KEYWORDS.origin.positive.forEach(w => {
      if (sentence.includes(w)) { hasPositive = true; reasons.push(`국산 원산지 언급 (${w})`); }
    });
    KEYWORDS.origin.negative.forEach(w => {
      if (sentence.includes(w)) { hasNegative = true; reasons.push(`수입 원산지 언급 (${w})`); }
    });

    KEYWORDS.production.positive.forEach(w => {
      if (sentence.includes(w)) { hasPositive = true; reasons.push(`직접 생산/가공 참여 언급 (${w})`); }
    });
    KEYWORDS.production.negative.forEach(w => {
      if (sentence.includes(w)) { hasNegative = true; reasons.push(`단순 유통/위탁 우려 (${w})`); }
    });

    KEYWORDS.certifications.positive.forEach(w => {
      if (sentence.includes(w)) { hasPositive = true; reasons.push(`인증서/농업경영체 언급 (${w})`); }
    });

    if (hasPositive || hasNegative) {
      foundSentences.push({
        sentence: sentence.substring(0, 150) + (sentence.length > 150 ? '...' : ''),
        type: hasNegative ? 'negative' : 'positive',
        reason: reasons.join(', ')
      });
    }
  });

  const uniqueEvidence = [];
  const seenSentences = new Set();
  for (const ev of foundSentences) {
    if (!seenSentences.has(ev.sentence)) {
      seenSentences.add(ev.sentence);
      uniqueEvidence.push(ev);
    }
    if (uniqueEvidence.length >= 10) break;
  }

  // A. 원산지 점수
  const originPosCount = matches.origin.positive.length;
  const originNegCount = matches.origin.negative.length;
  if (originNegCount > 0) {
    scores.origin = Math.max(10, 50 - (originNegCount * 25) + (originPosCount * 5));
  } else if (originPosCount > 0) {
    scores.origin = Math.min(100, 75 + (originPosCount * 5));
  } else {
    scores.origin = 50;
  }

  // B. 직접 생산 및 가공 점수
  const prodPosCount = matches.production.positive.length;
  const prodNegCount = matches.production.negative.length;
  const isLivestock = matches.livestock.positive.length > 0;
  const isCoop = matches.coop.positive.length > 0;
  const isContract = matches.contract.positive.length > 0;

  if (prodNegCount > 0) {
    scores.production = Math.max(15, 45 - (prodNegCount * 15) + (prodPosCount * 8));
  } else if (prodPosCount > 0) {
    scores.production = Math.min(100, 70 + (prodPosCount * 6));
  } else {
    scores.production = 45;
  }

  if (isLivestock) scores.production = Math.min(100, scores.production + 15);
  if (isCoop) scores.production = Math.min(100, scores.production + 10);
  if (isContract) scores.production = Math.min(100, scores.production + 15);

  // C. 신뢰도 점수
  const certCount = matches.certifications.positive.length;
  scores.credibility = Math.min(100, 40 + (certCount * 15) + (isCoop ? 10 : 0) + (isContract ? 10 : 0));

  let status = 'REVIEW';
  let summary = '';
  const details = [];

  if (scores.origin >= 80) {
    details.push({
      category: '원산지 검증',
      status: 'PASS',
      desc: '상세설명 상 국산 농축산물 원물이 명확히 명시되어 있거나 수입산 언급이 전혀 발견되지 않았습니다.',
      matched: matches.origin.positive
    });
  } else if (scores.origin <= 40) {
    details.push({
      category: '원산지 검증',
      status: 'FAIL',
      desc: '상세설명 내 수입산/외국산 원자재 또는 완제품 언급이 감지되었습니다. 수입 농산물일 가능성이 큽니다.',
      matched: matches.origin.negative
    });
  } else {
    details.push({
      category: '원산지 검증',
      status: 'REVIEW',
      desc: '원산지에 대한 구체적인 국산 증빙 문구나 정보가 부족합니다. 상세한 원산지 확인이 필요합니다.',
      matched: []
    });
  }

  if (scores.production >= 75) {
    let desc = '직접 재배, 산지직송, 직접 가공 등 직접 생산 단계에 주도적으로 참여하고 있음이 파악됩니다.';
    if (isLivestock) {
      desc += ' (축산물 특이사항 적용: 매입 후 직접 가공 및 포장하는 2차 가공업체 인정 기준 부합)';
    }
    details.push({
      category: '직접 생산 및 가공',
      status: 'PASS',
      desc: desc,
      matched: [...matches.production.positive, ...matches.livestock.positive]
    });
  } else if (scores.production <= 35) {
    details.push({
      category: '직접 생산 및 가공',
      status: 'FAIL',
      desc: '단순 유통, 위탁 판매(벤더) 또는 OEM 방식의 단순 유통 가능성이 매우 높게 파악됩니다. 이는 심사 기준(제2조 2항)상 지원 제외 대상입니다.',
      matched: matches.production.negative
    });
  } else {
    details.push({
      category: '직접 생산 및 가공',
      status: 'REVIEW',
      desc: '생산 주체(농가 혹은 가공업체)가 직접 가공 및 생산에 참여하는지 여부가 모호합니다. 유통 벤더사인지 확인이 필요합니다.',
      matched: []
    });
  }

  if (scores.credibility >= 70) {
    details.push({
      category: '인증 및 예외적 입증',
      status: 'PASS',
      desc: '친환경, 무농약, GAP, 농업경영체, HACCP 등 국가 공인 인증 정보가 포함되어 있어, 서류 심사 적격 가능성이 높습니다.',
      matched: matches.certifications.positive
    });
  } else {
    details.push({
      category: '인증 및 예외적 입증',
      status: 'REVIEW',
      desc: '친환경이나 무농약 인증서, 혹은 계약재배 사실 등을 증명할 수 있는 보조적 인증 정보의 언급이 발견되지 않았습니다.',
      matched: []
    });
  }

  const hasFail = details.some(d => d.status === 'FAIL');
  const allPass = details.every(d => d.status === 'PASS');

  if (hasFail) {
    status = 'FAIL';
    summary = '해당 상품은 심사 기준에 맞지 않아 지원 부적격 품목으로 판단됩니다. 주로 수입 원물 사용 혹은 단순 위탁 유통(벤더)에 해당합니다.';
  } else if (allPass && scores.origin >= 80 && scores.production >= 75) {
    status = 'PASS';
    summary = '해당 상품은 국내산 원물 사용 및 직접 생산/가공 기준을 만족하여 지원 적격 품목으로 판독됩니다.';
  } else {
    status = 'REVIEW';
    summary = '직접 생산 여부 또는 원산지 증빙 정보가 명확하지 않아 정밀 서류 심사 및 추가 소명이 필요합니다.';
  }

  const recommendedDocuments = ['농업경영체 등록 확인서 (또는 사업자등록증)'];
  if (isLivestock) recommendedDocuments.push('축산물 가공업/포장처리업 신고필증', '원물(축산물) 매입 거래 명세서');
  if (matches.certifications.positive.some(c => ['친환경', '무농약', '유기농'].includes(c))) {
    recommendedDocuments.push('국가 공인 인증 서류 (친환경/무농약/유기농 인증서 등)');
  }
  if (isContract) recommendedDocuments.push('공식 계약재배 계약서', '농가 거래 내역 및 투자 증빙 서류');
  if (isCoop) recommendedDocuments.push('영농조합/농업회사법인 설립 인가서', '소속 조합원(또는 농가)의 농업경영체 등록 확인서');
  if (matches.production.positive.includes('직접 제조') || matches.production.positive.includes('직접 가공')) {
    recommendedDocuments.push('식품제조가공업 등록증 / 품목제조보고서');
  }

  return {
    success: true,
    title: title || '분석된 상품',
    summary,
    status,
    score: {
      origin: Math.round(scores.origin),
      production: Math.round(scores.production),
      credibility: Math.round(scores.credibility)
    },
    details,
    evidence: uniqueEvidence,
    recommendedDocuments
  };
}

export async function onRequestPost(context) {
  try {
    const { request } = context;
    const { url, text: manualText } = await request.json();

    if (url && url.trim().startsWith('http')) {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });
      
      if (!response.ok) {
        throw new Error('상품 페이지 정보를 불러오는데 실패했습니다.');
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      let title = $('meta[property="og:title"]').attr('content') || 
                  $('meta[name="twitter:title"]').attr('content') || 
                  $('title').text() || '';
      title = title.split(':')[0].split('|')[0].trim();

      let detailText = '';
      const ogDesc = $('meta[property="og:description"]').attr('content');
      if (ogDesc) detailText += ogDesc + '\n';

      const bodySelectors = [
        '#se-main-container', '.se-main-container', '.product-detail-content', 
        '#productDetail', '.detail_content', '#detail-main', '.prd-detail',
        'article', 'main', '.content'
      ];

      let foundContent = false;
      for (const selector of bodySelectors) {
        const el = $(selector);
        if (el.length > 0) {
          detailText += el.text() + '\n';
          foundContent = true;
        }
      }

      if (!foundContent || detailText.trim().length < 200) {
        $('script, style, iframe, noscript, header, footer, nav').remove();
        detailText += $('body').text();
      }

      detailText = detailText.replace(/\s+/g, ' ').trim();

      const result = analyzeText(title, detailText.substring(0, 10000));
      result.source = 'crawled';
      result.url = url;

      return new Response(JSON.stringify(result), {
        headers: { 
          'Content-Type': 'application/json;charset=UTF-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    if (manualText && manualText.trim().length > 0) {
      const result = analyzeText('수동 입력 분석 상품', manualText);
      result.source = 'manual';
      return new Response(JSON.stringify(result), {
        headers: { 
          'Content-Type': 'application/json;charset=UTF-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'URL 주소 또는 분석할 텍스트를 입력해주세요.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json;charset=UTF-8' }
    });
  }
}

// OPTIONS 요청 처리 (CORS preflight 지원)
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}
