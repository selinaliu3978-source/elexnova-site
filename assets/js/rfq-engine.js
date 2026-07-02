(() => {
  if (window.MiDENRFQEngine) return;

  const state = {
    timerTriggered: false,
    scrollTriggered: false,
    productTriggered: false,
  };
  const autoShownKey = 'midenGlobalRFQShown';
  const productViewsKey = 'midenGlobalProductViews';
  const productViewThreshold = 2;
  const timerDelayMs = 20000;
  const scrollThreshold = 60;

  const isProductPage = () => /\/products\/[^/]+\.html$/i.test(window.location.pathname.replace(/\\/g, '/'));

  const getProductName = () => (
    document.body?.dataset.productName
    || document.body?.dataset.product
    || document.querySelector('h1')?.textContent?.trim()
    || 'MiDEN magnetic components'
  );

  const isBlockingOverlayOpen = () => (
    document.body.classList.contains('image-modal-open')
    || document.body.classList.contains('cert-viewer-open')
    || Boolean(document.querySelector('.image-modal.open'))
    || Boolean(document.querySelector('#certViewer:not(.hidden)'))
  );

  const markShown = () => {
    try {
      sessionStorage.setItem(autoShownKey, '1');
      sessionStorage.setItem('midenRFQPopupShown', '1');
    } catch (error) {
      console.warn('RFQ session marker unavailable:', error);
    }
  };

  const wasAutoShown = () => {
    try {
      return sessionStorage.getItem(autoShownKey) === '1'
        || sessionStorage.getItem('midenRFQPopupShown') === '1'
        || sessionStorage.getItem('rfqModalSubmitted') === '1';
    } catch (error) {
      return false;
    }
  };

  const openExistingModal = (payload = {}) => {
    const modal = document.querySelector('.rfq-modal');
    if (!modal) return false;

    const productInput = modal.querySelector('input[name="product"]');
    if (productInput && payload.product) productInput.value = payload.product;

    modal.style.display = 'flex';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.querySelector('.miden-ai-recommendation.open')?.classList.remove('open');
    document.querySelector('.miden-engineering-quote.open')?.classList.remove('open');
    document.querySelector('.smart-inquiry-popup.open')?.classList.remove('open');
    markShown();
    return true;
  };

  const openRFQ = (payload = {}) => {
    const detail = {
      trigger: payload.trigger || 'global-rfq-engine',
      product: payload.product || getProductName(),
      source: payload.source || 'rfq-engine',
    };

    if (isBlockingOverlayOpen()) {
      window.setTimeout(() => openRFQ(detail), 2500);
      return false;
    }

    if (openExistingModal(detail)) return true;

    if (window.MiDENRouter && typeof window.MiDENRouter.handleClick === 'function') {
      window.MiDENRouter.handleClick('RFQ', detail);
      markShown();
      return true;
    }

    const contactPath = /\/(products|news|industries|clusters|landing)\//.test(window.location.pathname.replace(/\\/g, '/'))
      ? '../contact.html#inquiry-form'
      : 'contact.html#inquiry-form';
    window.location.href = contactPath;
    return true;
  };

  const triggerOnce = (key, payload = {}) => {
    if (state[key] || wasAutoShown()) return;
    state[key] = true;
    openRFQ(payload);
  };

  const initTimerTrigger = () => {
    window.setTimeout(() => {
      triggerOnce('timerTriggered', { trigger: '20-second-timer' });
    }, timerDelayMs);
  };

  const initScrollTrigger = () => {
    window.addEventListener('scroll', () => {
      if (state.scrollTriggered || wasAutoShown()) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const percent = (window.scrollY / scrollable) * 100;
      if (percent >= scrollThreshold) {
        triggerOnce('scrollTriggered', { trigger: '60-percent-scroll' });
      }
    }, { passive: true });
  };

  const initProductViewCounter = () => {
    if (!isProductPage()) return;

    let views = [];
    try {
      views = JSON.parse(sessionStorage.getItem(productViewsKey) || '[]').filter((item) => typeof item === 'string');
    } catch (error) {
      views = [];
    }

    const path = window.location.pathname;
    if (!views.includes(path)) views.push(path);
    try {
      sessionStorage.setItem(productViewsKey, JSON.stringify(views.slice(-20)));
    } catch (error) {
      console.warn('RFQ product counter unavailable:', error);
    }

    if (views.length >= productViewThreshold) {
      window.setTimeout(() => {
        triggerOnce('productTriggered', {
          trigger: 'session-product-view-counter',
          product: getProductName(),
          productViews: views.length,
        });
      }, 800);
    }
  };

  const initManualTriggers = () => {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-rfq-trigger], [data-miden-action="RFQ"], a[href$="contact.html"], a[href$="contact.html#inquiry-form"]');
      if (!trigger) return;

      const label = trigger.textContent.trim().toLowerCase();
      const isRFQIntent = trigger.matches('[data-rfq-trigger], [data-miden-action="RFQ"]')
        || /rfq|quote|technical support|get support|inquiry/.test(label);
      if (!isRFQIntent) return;

      event.preventDefault();
      openRFQ({
        trigger: 'manual-click',
        source: trigger,
        product: getProductName(),
      });
    }, true);
  };

  const init = () => {
    initManualTriggers();
    initTimerTrigger();
    initScrollTrigger();
    initProductViewCounter();
  };

  window.MiDENRFQEngine = {
    open: openRFQ,
    triggerOnce,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
