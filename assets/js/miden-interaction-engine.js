(() => {
  if (window.MiDENRouter) return;

  const salesEmail = 'selinaliu3978@gmail.com';
  const whatsapp = '8619808253978';
  const buildEmailUrl = (payload = {}) => {
    const subject = payload.subject || 'RFQ from Website';
    const body = payload.body || 'Hi, I am interested in your magnetic components.';
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(salesEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const getPathPrefix = () => (
    /\/(products|news|industries|clusters|landing)\//.test(window.location.pathname.replace(/\\/g, '/')) ? '../' : ''
  );

  const isBlockingOverlayOpen = () => (
    document.body.classList.contains('image-modal-open')
    || document.body.classList.contains('cert-viewer-open')
    || Boolean(document.querySelector('.image-modal.open'))
    || Boolean(document.querySelector('.rfq-modal.open'))
    || Boolean(document.querySelector('#certViewer:not(.hidden)'))
  );

  const createRFQPopup = () => {
    let popup = document.querySelector('.smart-inquiry-popup');
    if (popup) return popup;

    popup = document.createElement('aside');
    popup.className = 'smart-inquiry-popup';
    popup.setAttribute('aria-hidden', 'true');
    popup.innerHTML = `
      <button class="smart-inquiry-popup__close" type="button" aria-label="Close inquiry popup">x</button>
      <p class="eyebrow">RFQ Support</p>
      <h2>Request RFQ / Get Quote</h2>
      <p>Send us your target inductance, current, frequency, size, application or drawings. MiDEN can support product selection, sample review and quotation.</p>
      <div class="smart-inquiry-popup__actions">
        <button class="btn" type="button" data-miden-action="RFQ_FORM">Submit RFQ Form</button>
        <button class="btn secondary" type="button" data-miden-action="WHATSAPP">WhatsApp</button>
        <button class="btn secondary" type="button" data-miden-action="EMAIL">Email</button>
      </div>`;
    document.body.appendChild(popup);
    return popup;
  };

  const showRFQPopup = (payload = {}) => {
    if (isBlockingOverlayOpen()) {
      window.setTimeout(() => showRFQPopup(payload), 3000);
      return;
    }
    const popup = createRFQPopup();
    popup.classList.add('open');
    popup.setAttribute('aria-hidden', 'false');
    sessionStorage.setItem('midenRFQPopupShown', '1');
  };

  const closeRFQPopup = () => {
    const popup = document.querySelector('.smart-inquiry-popup');
    if (!popup) return;
    popup.classList.remove('open');
    popup.setAttribute('aria-hidden', 'true');
    localStorage.setItem('midenRFQPopupClosedAt', String(Date.now()));
  };

  const openRFQForm = () => {
    const url = `${getPathPrefix()}contact.html#inquiry-form`;
    window.location.href = url;
  };

  const openEmailClient = (payload) => {
    const href = payload?.source?.getAttribute?.('href');
    if (href && /^https:\/\/mail\.google\.com\/mail\//.test(href)) {
      window.open(href, '_blank', 'noopener');
      return;
    }
    window.open(buildEmailUrl(payload), '_blank', 'noopener');
  };

  const openLightbox = (payload = {}) => {
    if (window.MiDENLightbox && typeof window.MiDENLightbox.open === 'function') {
      window.MiDENLightbox.open(payload.source || payload.element);
    }
  };

  const openAISalesAssistant = () => {
    document.querySelector('.ai-sales-assistant')?.classList.add('open');
  };

  window.MiDENRouter = {
    handleClick(type, payload = {}) {
      console.log('MiDEN Router Event:', type, payload);
      switch (type) {
        case 'RFQ':
          if (window.MiDENQuoteAI?.openEngineeringQuotePopup?.(payload)) break;
          showRFQPopup(payload);
          break;
        case 'RFQ_FORM':
          openRFQForm(payload);
          break;
        case 'WHATSAPP':
          window.open(`https://wa.me/${whatsapp}`, '_blank', 'noopener');
          break;
        case 'EMAIL':
          openEmailClient(payload);
          break;
        case 'PRODUCT':
          if (payload.url) window.location.href = payload.url;
          break;
        case 'LIGHTBOX':
          openLightbox(payload);
          break;
        case 'AI':
          openAISalesAssistant(payload);
          break;
        default:
          break;
      }
    },
    closeRFQPopup,
  };

  const initRFQTrigger = () => {
    console.log('RFQ Router Loaded');
  };

  document.addEventListener('click', (event) => {
    const close = event.target.closest('.smart-inquiry-popup__close');
    if (close) {
      event.preventDefault();
      closeRFQPopup();
      return;
    }

    const actionTarget = event.target.closest('[data-miden-action]');
    if (actionTarget) {
      event.preventDefault();
      window.MiDENRouter.handleClick(actionTarget.dataset.midenAction, {
        source: actionTarget,
      });
      return;
    }

    const whatsappLink = event.target.closest('a[href^="https://wa.me/"]');
    if (whatsappLink) {
      event.preventDefault();
      window.MiDENRouter.handleClick('WHATSAPP', { source: whatsappLink });
      return;
    }

    const emailLink = event.target.closest('a[href^="mailto:"], a[href^="https://mail.google.com/mail/"]');
    if (emailLink) {
      event.preventDefault();
      window.MiDENRouter.handleClick('EMAIL', { source: emailLink });
      return;
    }

    const lightboxLink = event.target.closest('[data-lightbox-image]');
    if (lightboxLink) {
      event.preventDefault();
      window.MiDENRouter.handleClick('LIGHTBOX', { source: lightboxLink });
    }
  });

  document.addEventListener('DOMContentLoaded', initRFQTrigger);
  if (document.readyState !== 'loading') initRFQTrigger();
})();
