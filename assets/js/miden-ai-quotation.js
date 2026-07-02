(() => {
  if (window.MiDENQuoteAI) return;

  const solutions = {
    'ev charger': {
      productType: 'Power Inductor + Planar Transformer',
      series: 'High Current Power Inductor Series and Planar Transformer Series',
      technicalNotes: 'Review ripple current, isolation requirement, thermal rise and switching topology before sample selection.',
      costLevel: 'High',
    },
    'solar inverter': {
      productType: 'High Power Inductor + EMI Choke',
      series: 'High Power Inductor Series and Common Mode EMI Choke Series',
      technicalNotes: 'Confirm DC-link current, inverter switching frequency, EMI target and thermal environment before quotation.',
      costLevel: 'High',
    },
    'energy storage system': {
      productType: 'Toroidal + High Current Inductor',
      series: 'Toroidal Inductor Series and High Current Inductor Series',
      technicalNotes: 'Confirm charge-discharge current, bus voltage, cooling condition and allowed magnetic component footprint.',
      costLevel: 'Medium',
    },
    default: {
      productType: 'Custom Magnetic Component',
      series: 'Custom Inductor, Transformer or EMI Choke Review',
      technicalNotes: 'Engineering evaluation is required based on application, current, frequency, size and drawing requirements.',
      costLevel: 'Medium',
    },
  };

  const normalize = (value) => (value || '').toString().toLowerCase();

  const pickPattern = (input, pattern) => {
    const match = normalize(input).match(pattern);
    return match ? match[0].toUpperCase().replace('KHZ', 'kHz') : '';
  };

  const inferApplication = (text) => {
    const normalized = normalize(text);
    if (/ev\s*charger|charger|charging/.test(normalized)) return 'EV Charger';
    if (/solar|inverter|pv/.test(normalized)) return 'Solar Inverter';
    if (/energy\s*storage|ess|battery|storage/.test(normalized)) return 'Energy Storage System';
    return '';
  };

  const inferSize = (text) => {
    const normalized = normalize(text);
    const explicit = normalized.match(/\b\d+(\.\d+)?\s*(mm|cm)\s*[x*]\s*\d+(\.\d+)?\s*(mm|cm)?\b/);
    if (explicit) return explicit[0].toUpperCase();
    if (/compact|small|low profile|limited space/.test(normalized)) return 'Compact or low-profile size preferred';
    if (/drawing|mechanical|footprint/.test(normalized)) return 'Confirm by drawing or footprint';
    return '';
  };

  const analyzeRequirement = (input = {}) => {
    const source = typeof input === 'string'
      ? input
      : [
        input.application,
        input.current,
        input.frequency,
        input.size,
        input.message,
        input.product,
        input.pageText,
      ].filter(Boolean).join(' ');

    const requirement = {
      application: input.application || inferApplication(source) || 'Application to be confirmed',
      current: input.current || pickPattern(source, /\b(20|30|50)\s*a\b/i) || 'Current to be confirmed',
      frequency: input.frequency || pickPattern(source, /\b(50|100|200)\s*khz\b/i) || 'Frequency to be confirmed',
      size: input.size || inferSize(source) || 'Size or drawing to be confirmed',
      rawInput: source,
    };
    console.log('Quote Requirement:', requirement);
    return requirement;
  };

  const recommendSolution = (requirement = {}) => {
    const application = normalize(requirement.application);
    let key = 'default';
    if (/ev/.test(application)) key = 'ev charger';
    if (/solar|inverter/.test(application)) key = 'solar inverter';
    if (/energy|storage|battery/.test(application)) key = 'energy storage system';

    const base = solutions[key];
    const recommendation = {
      productType: base.productType,
      series: base.series,
      technicalNotes: [
        base.technicalNotes,
        'Engineering evaluation required.',
        `Indicative cost level: ${base.costLevel}.`,
        'Custom quotation required after parameter confirmation.',
      ].join(' '),
      indicativeCostLevel: base.costLevel,
      quotationStatus: 'Custom quotation required',
    };
    console.log('Quote Recommendation:', recommendation);
    return recommendation;
  };

  const generateRFQ = (requirement, recommendation) => {
    const rfq = [
      'Hello MiDEN engineering team,',
      '',
      'Please support engineering selection and custom quotation for the following project.',
      '',
      `Application: ${requirement.application}`,
      `Current: ${requirement.current}`,
      `Frequency: ${requirement.frequency}`,
      `Size / mechanical limit: ${requirement.size}`,
      '',
      `Recommended solution: ${recommendation.productType}`,
      `Series direction: ${recommendation.series}`,
      `Engineering notes: ${recommendation.technicalNotes}`,
      '',
      'Commercial note: Engineering evaluation and formal quotation confirmation are required.',
      'Please confirm suitable product direction, samples, MOQ, lead time and any parameters still needed.',
    ].join('\n');
    console.log('Quote RFQ Generated:', rfq);
    return rfq;
  };

  const classifyCustomer = (context = {}) => {
    let score = 0;
    const text = normalize([
      context.application,
      context.current,
      context.frequency,
      context.size,
      context.message,
      context.pageType,
      context.product,
      window.location.pathname,
    ].filter(Boolean).join(' '));

    if (/products|product-detail|compare|certificate|factory/.test(text)) score += 1;
    if (/(20|30|50)\s*a|50\s*khz|100\s*khz|200\s*khz/.test(text)) score += 2;
    if (/ev|solar|inverter|energy|storage|drawing|sample|rfq|quote/.test(text)) score += 2;

    const segment = score >= 4 ? 'C' : score >= 2 ? 'B' : 'A';
    console.log('Quote Customer Segment:', segment, { score, context });
    return segment;
  };

  const collectPageInput = (payload = {}) => {
    const form = document.querySelector('#inquiry-form, [data-ai-form]');
    const formData = form ? new FormData(form) : null;
    const title = document.querySelector('h1')?.textContent || document.body.dataset.productName || '';
    return {
      application: payload.application || formData?.get('application') || '',
      current: payload.current || formData?.get('current') || '',
      frequency: payload.frequency || formData?.get('frequency') || '',
      size: payload.size || formData?.get('size') || '',
      product: payload.product || document.body.dataset.productName || title,
      message: payload.message || formData?.get('message') || '',
      pageType: payload.pageType || document.body.dataset.productCategory || '',
      pageText: `${title} ${document.querySelector('meta[name="description"]')?.content || ''}`,
    };
  };

  const fillInquiryForm = (requirement, recommendation, rfq) => {
    const form = document.querySelector('#inquiry-form');
    if (!form) return false;
    const productField = form.querySelector('[name="product"]');
    const messageField = form.querySelector('[name="message"]');
    if (productField) {
      const firstWord = recommendation.productType.split(' ')[0].toLowerCase();
      const option = Array.from(productField.options || []).find((item) => item.textContent.toLowerCase().includes(firstWord));
      if (option) productField.value = option.value;
    }
    if (messageField) {
      messageField.value = rfq;
      messageField.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return true;
  };

  const createQuotePopup = () => {
    let popup = document.querySelector('.miden-engineering-quote');
    if (popup) return popup;
    popup = document.createElement('aside');
    popup.className = 'miden-engineering-quote';
    popup.setAttribute('aria-hidden', 'true');
    popup.innerHTML = `
      <button class="miden-engineering-quote__close" type="button" aria-label="Close engineering quote">x</button>
      <p class="eyebrow">Engineering Quote</p>
      <h2>Request engineering quote</h2>
      <div class="miden-engineering-quote__summary"></div>
      <label>Editable RFQ<textarea rows="8"></textarea></label>
      <div class="miden-engineering-quote__actions">
        <button class="btn" type="button" data-quote-action="email">Email RFQ</button>
        <button class="btn secondary" type="button" data-quote-action="form">Submit RFQ form</button>
        <button class="btn secondary" type="button" data-quote-action="whatsapp">WhatsApp Engineer</button>
      </div>`;
    document.body.appendChild(popup);
    return popup;
  };

  const openEngineeringQuotePopup = (payload = {}) => {
    const input = collectPageInput(payload);
    const segment = classifyCustomer(input);
    if (payload.trigger === 'auto' && segment === 'A') return false;

    const requirement = analyzeRequirement(input);
    const recommendation = recommendSolution(requirement);
    const rfq = generateRFQ(requirement, recommendation);
    fillInquiryForm(requirement, recommendation, rfq);

    const popup = createQuotePopup();
    popup.querySelector('.miden-engineering-quote__summary').innerHTML = `
      <p><strong>${recommendation.productType}</strong></p>
      <p>${recommendation.series}</p>
      <p>${recommendation.quotationStatus}. Indicative cost level: ${recommendation.indicativeCostLevel}.</p>`;
    popup.querySelector('textarea').value = rfq;
    popup.classList.add('open');
    popup.setAttribute('aria-hidden', 'false');
    return true;
  };

  document.addEventListener('click', (event) => {
    const close = event.target.closest('.miden-engineering-quote__close');
    if (close) {
      event.preventDefault();
      const popup = document.querySelector('.miden-engineering-quote');
      popup?.classList.remove('open');
      popup?.setAttribute('aria-hidden', 'true');
      return;
    }

    const action = event.target.closest('[data-quote-action]');
    if (!action) return;
    event.preventDefault();
    const popup = document.querySelector('.miden-engineering-quote');
    const body = popup?.querySelector('textarea')?.value || '';
    if (action.dataset.quoteAction === 'email') {
      window.MiDENRouter?.handleClick('EMAIL', {
        subject: 'Engineering RFQ - MiDEN magnetic components',
        body,
      });
    }
    if (action.dataset.quoteAction === 'form') {
      const nested = /\/(products|news|industries|clusters|landing)\//.test(window.location.pathname.replace(/\\/g, '/'));
      window.location.href = `${nested ? '../' : ''}contact.html#inquiry-form`;
    }
    if (action.dataset.quoteAction === 'whatsapp') {
      window.MiDENRouter?.handleClick('WHATSAPP', { source: 'engineering-quote' });
    }
  });

  window.MiDENQuoteAI = {
    analyzeRequirement,
    recommendSolution,
    generateRFQ,
    classifyCustomer,
    openEngineeringQuotePopup,
    fillInquiryForm,
  };
})();
