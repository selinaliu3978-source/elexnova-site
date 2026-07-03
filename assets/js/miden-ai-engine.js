(() => {
  if (window.MiDENAI) return;

  const productMap = {
    'power-inductor': {
      label: 'Power Inductor Series',
      url: '/products/power-inductor.html',
      application: 'DC-DC converter, power supply or energy storage circuit',
      current: '10A to 50A',
      frequency: '100kHz to 500kHz switching frequency',
      suggestions: [
        '10A Power Inductor Series',
        '20A High Current Inductor',
        '50A Shielded Power Inductor',
        'High Current Series',
      ],
    },
    transformer: {
      label: 'Transformer Series',
      url: '/products/high-frequency-transformers.html',
      application: 'SMPS, isolated converter or industrial power module',
      current: 'project-based winding current',
      frequency: '20kHz to 300kHz operating frequency',
      suggestions: [
        'High Frequency Transformer',
        'Planar Transformer',
        'Custom Transformer',
      ],
    },
    'emi-choke': {
      label: 'EMI Choke Series',
      url: '/products/common-mode-choke.html',
      application: 'EMI filtering, input protection or signal noise suppression',
      current: 'rated line current by filter design',
      frequency: 'common mode noise range by application',
      suggestions: [
        'Common Mode Choke',
        'Toroidal Choke',
        'Filter Choke',
      ],
    },
    custom: {
      label: 'Custom Magnetic Components',
      url: '/products/custom-magnetic-components.html',
      application: 'custom magnetic component project',
      current: 'according to drawing or target specification',
      frequency: 'according to application requirement',
      suggestions: [
        'Custom Winding Review',
        'Sample Development Support',
        'OEM/ODM Magnetic Component',
      ],
    },
  };

  const state = {
    startTime: Date.now(),
    maxScroll: 0,
    clicks: [],
    certificateViews: 0,
    factoryVisits: 0,
    shown: false,
    intent: null,
    products: [],
  };

  const ready = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  };

  const prefix = () => (
    /\/(products|news|industries|clusters|landing)\//.test(window.location.pathname.replace(/\\/g, '/')) ? '../' : ''
  );

  const normalizeText = (text) => (text || '').toLowerCase().replace(/[\s_]+/g, '-');

  const getPageType = () => {
    const path = window.location.pathname.replace(/\\/g, '/').toLowerCase();
    if (/\/products\/[^/]+\.html$/.test(path)) return 'product-detail';
    if (/\/products\.html$/.test(path)) return 'products';
    if (/\/certificates\.html$/.test(path)) return 'certificates';
    if (/\/factory\.html$/.test(path)) return 'factory';
    if (/\/applications\.html$/.test(path)) return 'applications';
    if (/\/news/.test(path)) return 'news';
    if (/\/contact\.html$/.test(path)) return 'contact';
    return 'home';
  };

  const detectProductType = (context = {}) => {
    const path = normalizeText(window.location.pathname);
    const title = normalizeText(document.querySelector('h1')?.textContent);
    const clicked = normalizeText((context.clickedProducts || state.clicks).join(' '));
    const haystack = `${path} ${title} ${clicked}`;

    if (/common-mode|emi|filter-choke/.test(haystack)) return 'emi-choke';
    if (/transformer|planar/.test(haystack)) return 'transformer';
    if (/power-inductor|high-current|flat-wire|smd-inductor|toroidal-inductor|drum-core/.test(haystack)) return 'power-inductor';
    if (/custom-magnetic|custom/.test(haystack)) return 'custom';
    return 'power-inductor';
  };

  const isBlockingOverlayOpen = () => (
    document.body.classList.contains('image-modal-open')
    || document.body.classList.contains('cert-viewer-open')
    || Boolean(document.querySelector('.image-modal.open'))
    || Boolean(document.querySelector('.rfq-modal.open'))
    || Boolean(document.querySelector('.smart-inquiry-popup.open'))
    || Boolean(document.querySelector('.miden-ai-recommendation.open'))
    || Boolean(document.querySelector('#certViewer:not(.hidden)'))
  );

  const canShow = () => {
    const pageType = getPageType();
    if (pageType === 'contact' && window.location.hash === '#inquiry-form') return false;
    if (sessionStorage.getItem('midenAIRecommendationShown') === '1') return false;
    if (state.shown) return false;
    return !isBlockingOverlayOpen();
  };

  const createPopup = () => {
    let popup = document.querySelector('.miden-ai-recommendation');
    if (popup) return popup;

    popup = document.createElement('aside');
    popup.className = 'miden-ai-recommendation';
    popup.setAttribute('aria-hidden', 'true');
    popup.innerHTML = `
      <button class="miden-ai-recommendation__close" type="button" aria-label="Close AI recommendation">x</button>
      <p class="eyebrow">AI Smart Sales Recommendation</p>
      <h2>AI Smart Sales Recommendation</h2>
      <div class="miden-ai-recommendation__body"></div>
      <div class="miden-ai-recommendation__rfq" hidden>
        <label>Editable RFQ draft<textarea rows="7"></textarea></label>
      </div>
      <div class="miden-ai-recommendation__actions">
        <button class="btn" type="button" data-ai-sales-action="rfq">Get RFQ</button>
        <button class="btn secondary" type="button" data-ai-sales-action="whatsapp">WhatsApp Engineer</button>
        <button class="btn secondary" type="button" data-ai-sales-action="product">View Product</button>
      </div>`;
    document.body.appendChild(popup);
    return popup;
  };

  const renderPopup = (intent, products) => {
    const popup = createPopup();
    const body = popup.querySelector('.miden-ai-recommendation__body');
    const productList = products.map((item) => `<li>${item}</li>`).join('');
    body.innerHTML = `
      <p>We detected you are viewing:<br><strong>${intent.product.label}</strong></p>
      <p>Recommended:</p>
      <ul>${productList}</ul>`;
    popup.classList.add('open');
    popup.setAttribute('aria-hidden', 'false');
    state.shown = true;
    sessionStorage.setItem('midenAIRecommendationShown', '1');
  };

  const closePopup = () => {
    const popup = document.querySelector('.miden-ai-recommendation');
    if (!popup) return;
    popup.classList.remove('open');
    popup.setAttribute('aria-hidden', 'true');
  };

  const detectIntent = (context = {}) => {
    const pageType = getPageType();
    const secondsOnPage = Math.floor((Date.now() - state.startTime) / 1000);
    const productKey = detectProductType(context);
    let score = 0;

    if (secondsOnPage > 12) score += 1;
    if (state.maxScroll > 50) score += 1;
    if (pageType === 'product-detail' || pageType === 'products') score += 3;
    if (pageType === 'certificates') score += 2;
    if (pageType === 'factory') score += 2;
    if (state.clicks.length > 0) score += 2;
    if (state.certificateViews > 0) score += 1;

    const intent = {
      pageType,
      score,
      strength: score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low',
      secondsOnPage,
      scrollDepth: state.maxScroll,
      clickedProducts: [...state.clicks],
      certificateViews: state.certificateViews,
      factoryVisits: state.factoryVisits,
      productKey,
      product: productMap[productKey],
    };
    console.log('AI Intent:', intent);
    state.intent = intent;
    return intent;
  };

  const recommendProducts = (intent) => {
    const products = intent.product.suggestions;
    console.log('AI Recommendation:', products);
    state.products = products;
    return products;
  };

  const generateRFQ = (intent = state.intent || detectIntent()) => {
    if (window.MiDENQuoteAI) {
      const requirement = window.MiDENQuoteAI.analyzeRequirement({
        application: intent.product.application,
        current: intent.product.current,
        frequency: intent.product.frequency,
        product: intent.product.label,
        pageType: intent.pageType,
      });
      const recommendation = window.MiDENQuoteAI.recommendSolution(requirement);
      return window.MiDENQuoteAI.generateRFQ(requirement, recommendation);
    }
    const rfq = [
      'Hello MiDEN team,',
      '',
      `I am interested in: ${intent.product.label}`,
      `Application: ${intent.product.application}`,
      `Estimated current range: ${intent.product.current}`,
      `Frequency assumption: ${intent.product.frequency}`,
      `Recommended options: ${(state.products.length ? state.products : recommendProducts(intent)).join(', ')}`,
      '',
      'Please review product selection, sample availability, MOQ, lead time and quotation.',
    ].join('\n');
    console.log('AI RFQ Generated:', rfq);
    return rfq;
  };

  const fillInquiryForm = (intent, rfq) => {
    const form = document.querySelector('#inquiry-form');
    if (!form) return false;
    const productField = form.querySelector('[name="product"]');
    const messageField = form.querySelector('[name="message"]');

    if (productField) {
      const matchingOption = Array.from(productField.options || []).find((option) => (
        option.textContent.toLowerCase().includes(intent.product.label.split(' ')[0].toLowerCase())
        || intent.product.label.toLowerCase().includes(option.textContent.toLowerCase().split(' ')[0])
      ));
      productField.value = matchingOption ? matchingOption.value : productField.value;
    }

    if (messageField) {
      messageField.value = rfq;
      messageField.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return true;
  };

  const triggerSalesMessage = (context = {}) => {
    if (!canShow()) {
      if (!state.shown && sessionStorage.getItem('midenAIRecommendationShown') !== '1') {
        window.setTimeout(() => triggerSalesMessage(context), 3000);
      }
      return;
    }
    const intent = detectIntent(context);
    if (intent.secondsOnPage < 12) return;
    if (intent.scrollDepth <= 50 && intent.score < 3) return;
    if (window.MiDENQuoteAI) {
      const segment = window.MiDENQuoteAI.classifyCustomer({
        application: intent.product.application,
        current: intent.product.current,
        frequency: intent.product.frequency,
        product: intent.product.label,
        pageType: intent.pageType,
      });
      if (segment === 'A') return;
      intent.customerSegment = segment;
    }
    const products = recommendProducts(intent);
    renderPopup(intent, products);
  };

  const updateScrollDepth = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    state.maxScroll = Math.max(state.maxScroll, Math.round((window.scrollY / scrollable) * 100));
    if (state.maxScroll > 50) triggerSalesMessage({ trigger: 'scroll' });
  };

  const handlePopupAction = (event) => {
    const actionButton = event.target.closest('[data-ai-sales-action]');
    if (!actionButton) return;
    event.preventDefault();

    const intent = state.intent || detectIntent({ trigger: 'button' });
    const action = actionButton.dataset.aiSalesAction;
    if (action === 'rfq') {
      const rfq = generateRFQ(intent);
      fillInquiryForm(intent, rfq);
      const popup = createPopup();
      const rfqPanel = popup.querySelector('.miden-ai-recommendation__rfq');
      const textarea = rfqPanel.querySelector('textarea');
      rfqPanel.hidden = false;
      textarea.value = rfq;
      textarea.focus();
      actionButton.textContent = 'Email RFQ';
      actionButton.dataset.aiSalesAction = 'email-rfq';
      return;
    }

    if (action === 'email-rfq') {
      const body = document.querySelector('.miden-ai-recommendation textarea')?.value || generateRFQ(intent);
      window.MiDENRouter?.handleClick('EMAIL', {
        subject: `RFQ - ${intent.product.label}`,
        body,
        intent,
      });
      return;
    }

    if (action === 'whatsapp') {
      window.MiDENRouter?.handleClick('WHATSAPP', { intent, source: 'ai-sales-engine' });
      return;
    }

    if (action === 'product') {
      window.MiDENRouter?.handleClick('PRODUCT', {
        url: intent.product.url,
        intent,
        source: 'ai-sales-engine',
      });
    }
  };

  const init = () => {
    const pageType = getPageType();
    if (pageType === 'factory') state.factoryVisits += 1;

    window.addEventListener('scroll', updateScrollDepth, { passive: true });
    document.addEventListener('click', (event) => {
      const close = event.target.closest('.miden-ai-recommendation__close');
      if (close) {
        event.preventDefault();
        closePopup();
        return;
      }

      handlePopupAction(event);

      const productTarget = event.target.closest('a[href*="products/"], .product-card, [data-product], [data-product-card]');
      if (productTarget) {
        const label = productTarget.textContent || productTarget.getAttribute('href') || '';
        state.clicks.push(label.trim().slice(0, 80));
      }

      if (event.target.closest('[data-lightbox-image], .certificate-card, #certificatesGrid img')) {
        state.certificateViews += 1;
      }
    });

    window.setTimeout(() => triggerSalesMessage({ trigger: 'time' }), 12000);
  };

  window.MiDENAI = {
    detectIntent,
    recommendProducts,
    generateRFQ,
    triggerSalesMessage,
    isActive: true,
    state,
  };

  ready(init);
})();
