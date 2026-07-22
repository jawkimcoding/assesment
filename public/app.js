document.addEventListener('DOMContentLoaded', () => {
  // Lucide 아이콘 초기화
  lucide.createIcons();

  // DOM Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const btnSubmit = document.getElementById('btn-submit');
  const btnRetry = document.getElementById('btn-retry');
  const productUrlInput = document.getElementById('product-url');
  const productTextInput = document.getElementById('product-text');
  
  const inputSection = document.getElementById('input-section');
  const loadingSection = document.getElementById('loading-section');
  const resultSection = document.getElementById('result-section');
  
  const loadingTitle = document.getElementById('loading-title');
  const progressFill = document.getElementById('progress-fill');
  
  // Accordion
  const accordionToggle = document.getElementById('accordion-toggle');
  const accordionContent = document.getElementById('accordion-content');

  // Result DOM Elements
  const resultProductTitle = document.getElementById('result-product-title');
  const statusBadgeVal = document.getElementById('status-badge-val');
  const statusCard = document.getElementById('status-card');
  const statusTitleVal = document.getElementById('status-title-val');
  const statusSummaryVal = document.getElementById('status-summary-val');
  
  const scoreOriginVal = document.getElementById('score-origin-val');
  const scoreOriginBar = document.getElementById('score-origin-bar');
  const scoreProductionVal = document.getElementById('score-production-val');
  const scoreProductionBar = document.getElementById('score-production-bar');
  const scoreCredibilityVal = document.getElementById('score-credibility-val');
  const scoreCredibilityBar = document.getElementById('score-credibility-bar');
  
  const docChecklistVal = document.getElementById('doc-checklist-val');
  const criteriaListVal = document.getElementById('criteria-list-val');
  const evidenceListVal = document.getElementById('evidence-list-val');

  let activeTab = 'url-tab';

  // 1. Tab Switching Logic
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.add('hidden'));

      button.classList.add('active');
      activeTab = button.dataset.tab;
      
      const targetContent = document.getElementById(`${activeTab}-content`);
      if (targetContent) {
        targetContent.classList.remove('hidden');
      }
    });
  });

  // 2. Accordion Logic
  accordionToggle.addEventListener('click', () => {
    accordionToggle.classList.toggle('active');
    accordionContent.classList.toggle('hidden');
  });

  // 3. Loading Animation Simulator
  let progressInterval = null;
  function startLoadingAnimation(onComplete) {
    let progress = 0;
    progressFill.style.width = '0%';
    
    // 로딩 단계 엘리먼트 초기화
    const steps = [
      { el: document.getElementById('step-1'), text: 'URL 연결 중...', target: 25 },
      { el: document.getElementById('step-2'), text: '상품 데이터 추출 중...', target: 50 },
      { el: document.getElementById('step-3'), text: '심사 기준 규칙 매칭 중...', target: 75 },
      { el: document.getElementById('step-4'), text: '분석 보고서 작성 중...', target: 95 }
    ];

    steps.forEach(s => {
      s.el.className = 'step-item';
      const icon = s.el.querySelector('.step-icon');
      if (icon) icon.setAttribute('data-lucide', 'circle');
    });
    lucide.createIcons();

    // 초기 상태 실행
    steps[0].el.classList.add('active');
    loadingTitle.textContent = steps[0].text;

    progressInterval = setInterval(() => {
      progress += Math.floor(Math.random() * 4) + 1; // 랜덤하게 조금씩 상승
      
      if (progress >= 100) progress = 99;
      progressFill.style.width = `${progress}%`;

      // 각 임계치를 넘을 때마다 다음 단계 활성화 및 이전 단계 완료 표시
      for (let i = 0; i < steps.length; i++) {
        if (progress >= steps[i].target) {
          // 이전 단계 완료 표시
          steps[i].el.classList.remove('active');
          steps[i].el.classList.add('completed');
          const prevIcon = steps[i].el.querySelector('.step-icon');
          if (prevIcon) prevIcon.setAttribute('data-lucide', 'check-circle-2');

          // 다음 단계 활성화
          if (i + 1 < steps.length) {
            steps[i + 1].el.classList.add('active');
            loadingTitle.textContent = steps[i + 1].text;
            const nextIcon = steps[i + 1].el.querySelector('.step-icon');
            if (nextIcon) nextIcon.setAttribute('data-lucide', 'circle-dot');
          }
        }
      }
      lucide.createIcons();
    }, 150);
  }

  function finishLoadingAnimation(callback) {
    clearInterval(progressInterval);
    progressFill.style.width = '100%';
    
    const steps = document.querySelectorAll('.step-item');
    steps.forEach(step => {
      step.classList.remove('active');
      step.classList.add('completed');
      const icon = step.querySelector('.step-icon');
      if (icon) icon.setAttribute('data-lucide', 'check-circle-2');
    });
    lucide.createIcons();

    setTimeout(() => {
      loadingSection.classList.add('hidden');
      callback();
    }, 600);
  }

  // 4. API Request & Analysis Action
  btnSubmit.addEventListener('click', async () => {
    let payload = {};
    
    if (activeTab === 'url-tab') {
      const url = productUrlInput.value.trim();
      if (!url) {
        alert('상품 URL 주소를 입력해주세요.');
        productUrlInput.focus();
        return;
      }
      if (!url.startsWith('http')) {
        alert('올바른 URL 형식(http:// 또는 https://)으로 입력해주세요.');
        productUrlInput.focus();
        return;
      }
      payload.url = url;
    } else {
      const text = productTextInput.value.trim();
      if (!text) {
        alert('분석할 상품 상세 텍스트를 입력해주세요.');
        productTextInput.focus();
        return;
      }
      if (text.length < 20) {
        alert('분석을 위해 최소 20자 이상의 상세 설명을 입력해주세요.');
        productTextInput.focus();
        return;
      }
      payload.text = text;
    }

    // UI 상태 전환
    inputSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    
    startLoadingAnimation();

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '분석 중 오류가 발생했습니다.');
      }

      // 애니메이션을 100%로 가속하며 끝낸 후 대시보드 렌더링
      finishLoadingAnimation(() => {
        renderDashboard(data);
        resultSection.classList.remove('hidden');
      });

    } catch (error) {
      clearInterval(progressInterval);
      alert(error.message);
      loadingSection.classList.add('hidden');
      inputSection.classList.remove('hidden');
    }
  });

  // 5. Dashboard Rendering
  function renderDashboard(data) {
    // 상품 제목
    resultProductTitle.textContent = data.title;

    // 종합 결과 뱃지 클래스 변경
    statusBadgeVal.className = 'status-badge';
    statusBadgeVal.classList.add(data.status.toLowerCase());
    
    let statusText = '심사 보류';
    if (data.status === 'PASS') {
      statusText = '심사 적격';
      statusBadgeVal.textContent = '적격';
    } else if (data.status === 'FAIL') {
      statusText = '지원 제외';
      statusBadgeVal.textContent = '부적격';
    } else {
      statusBadgeVal.textContent = '검토 필요';
    }
    
    statusTitleVal.textContent = statusText;
    statusSummaryVal.textContent = data.summary;

    // 대형 결과 카드 보더 색상 매핑
    statusCard.style.borderColor = `var(--color-${data.status.toLowerCase()})`;

    // 점수 갱신
    scoreOriginVal.textContent = `${data.score.origin}점`;
    scoreOriginBar.style.width = `${data.score.origin}%`;
    
    scoreProductionVal.textContent = `${data.score.production}점`;
    scoreProductionBar.style.width = `${data.score.production}%`;
    
    scoreCredibilityVal.textContent = `${data.score.credibility}점`;
    scoreCredibilityBar.style.width = `${data.score.credibility}%`;

    // 추천 증빙 서류 체크리스트
    docChecklistVal.innerHTML = '';
    data.recommendedDocuments.forEach(doc => {
      const li = document.createElement('li');
      li.innerHTML = `<i data-lucide="file-check"></i> <span>${doc}</span>`;
      docChecklistVal.appendChild(li);
    });

    // 심사 기준별 판정 상세 목록
    criteriaListVal.innerHTML = '';
    data.details.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'criteria-item';
      
      let iconName = 'help-circle';
      if (item.status === 'PASS') iconName = 'check-circle-2';
      else if (item.status === 'FAIL') iconName = 'x-circle';
      else if (item.status === 'REVIEW') iconName = 'alert-triangle';

      const matchTags = item.matched && item.matched.length > 0
        ? `<div class="tag-container">${item.matched.map(t => `<span class="match-tag ${item.status.toLowerCase()}">${t}</span>`).join('')}</div>`
        : '';

      let statusBadgeLabel = '보류';
      if (item.status === 'PASS') statusBadgeLabel = '적격';
      else if (item.status === 'FAIL') statusBadgeLabel = '부적격';

      itemDiv.innerHTML = `
        <div class="criteria-indicator ${item.status.toLowerCase()}">
          <i data-lucide="${iconName}"></i>
        </div>
        <div class="criteria-item-body">
          <h4>
            <span>${item.category}</span>
            <span class="criteria-item-badge ${item.status.toLowerCase()}">${statusBadgeLabel}</span>
          </h4>
          <p>${item.desc}</p>
          ${matchTags}
        </div>
      `;
      criteriaListVal.appendChild(itemDiv);
    });

    // 탐지된 주요 근거 문장
    evidenceListVal.innerHTML = '';
    if (data.evidence && data.evidence.length > 0) {
      data.evidence.forEach(ev => {
        const evDiv = document.createElement('div');
        evDiv.className = `evidence-item ${ev.type}`;
        
        const badgeIcon = ev.type === 'positive' ? 'check' : 'alert-circle';
        
        evDiv.innerHTML = `
          <p class="evidence-text">"${ev.sentence}"</p>
          <div class="evidence-reason">
            <i data-lucide="${badgeIcon}" style="width: 14px; height: 14px;"></i>
            <span>${ev.reason}</span>
          </div>
        `;
        evidenceListVal.appendChild(evDiv);
      });
    } else {
      evidenceListVal.innerHTML = '<div class="evidence-item"><p class="evidence-text" style="font-style: normal; color: var(--text-muted);">검출된 핵심 문장이 없습니다.</p></div>';
    }

    lucide.createIcons();
  }

  // 6. Retry (Back to input)
  btnRetry.addEventListener('click', () => {
    resultSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
    
    // 입력값들 유지한 채로 리셋
  });
});
