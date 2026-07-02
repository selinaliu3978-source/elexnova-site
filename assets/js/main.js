(() => {
const ready = (callback) => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
};

ready(() => {
document.querySelectorAll('.modal, .overlay').forEach((element) => {
  if (element.classList.contains('rfq-modal') || element.classList.contains('image-modal') || element.classList.contains('hero-overlay')) return;
  element.remove();
});
document.querySelectorAll('.rfq-modal, .image-modal').forEach((element) => element.remove());
document.body.classList.remove('image-modal-open');

const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');

if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const open = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
}

document.querySelectorAll('.dropdown-toggle').forEach((button) => {
  button.addEventListener('click', () => {
    const menu = button.closest('.dropdown');
    if (menu) menu.classList.toggle('open');
  });
});

(() => {
  let imageModal = document.getElementById('image-modal');
  if (!imageModal) {
    imageModal = document.createElement('div');
    imageModal.id = 'image-modal';
    document.body.appendChild(imageModal);
  }
  imageModal.className = 'image-modal';
  imageModal.setAttribute('aria-hidden', 'true');
  imageModal.style.display = 'none';
  imageModal.innerHTML = `
    <button class="close" type="button" aria-label="Close image viewer">&times;</button>
    <button class="image-modal__nav image-modal__prev" type="button" aria-label="Previous product image">&#8249;</button>
    <div class="image-modal__stage">
      <img id="modal-img" alt="">
    </div>
    <button class="image-modal__nav image-modal__next" type="button" aria-label="Next product image">&#8250;</button>
    <div class="image-modal__tools" aria-label="Image zoom controls">
      <button class="image-modal__zoom-out" type="button" aria-label="Zoom out">-</button>
      <span class="image-modal__counter" aria-live="polite"></span>
      <button class="image-modal__zoom-in" type="button" aria-label="Zoom in">+</button>
    </div>`;

  const modalImg = imageModal.querySelector('#modal-img');
  const modalStage = imageModal.querySelector('.image-modal__stage');
  const closeButton = imageModal.querySelector('.close');
  const prevButton = imageModal.querySelector('.image-modal__prev');
  const nextButton = imageModal.querySelector('.image-modal__next');
  const counter = imageModal.querySelector('.image-modal__counter');
  const zoomInButton = imageModal.querySelector('.image-modal__zoom-in');
  const zoomOutButton = imageModal.querySelector('.image-modal__zoom-out');
  const certViewer = document.getElementById('certViewer');
  const certViewerImg = document.getElementById('certViewerImg');
  const certViewerStage = certViewer?.querySelector('.cert-viewer__stage');
  const certViewerClose = certViewer?.querySelector('.close');
  const certViewerPrev = certViewer?.querySelector('.cert-viewer__prev');
  const certViewerNext = certViewer?.querySelector('.cert-viewer__next');
  const certViewerZoomIn = certViewer?.querySelector('.cert-viewer__zoom-in');
  const certViewerZoomOut = certViewer?.querySelector('.cert-viewer__zoom-out');
  const certViewerCounter = certViewer?.querySelector('.cert-viewer__counter');
  let galleryItems = [];
  let activeIndex = 0;
  let modalScale = 1;
  let certificateScale = 1;

  const getImageSrc = (link) => {
    const image = link.matches('img') ? link : link.querySelector('img');
    return link.dataset.lightboxSrc || link.getAttribute('href') || image?.currentSrc || image?.getAttribute('src') || '';
  };

  const getImageAlt = (link) => {
    const image = link.matches('img') ? link : link.querySelector('img');
    return link.dataset.lightboxAlt || image?.getAttribute('alt') || '';
  };

  const getLightboxMode = (link) => link.dataset.lightboxZoom || '';

  const getCertificateOriginalSrc = (link) => link.getAttribute('href') || link.dataset.lightboxSrc || getImageSrc(link);

  const getGalleryLinks = (imageLink) => {
    const categoryScope = imageLink.closest('.certificate-card, .product-category-section, .product-catalog, .product-catalog-grid, .factory-page-preview, .factory-section, .certificate-grid, .gallery') || document;
    return Array.from(categoryScope.querySelectorAll('[data-lightbox-image]'))
      .filter((link) => getImageSrc(link));
  };

  const updateNavState = () => {
    const hasMultipleImages = galleryItems.length > 1;
    if (prevButton) prevButton.hidden = !hasMultipleImages;
    if (nextButton) nextButton.hidden = !hasMultipleImages;
    if (counter) {
      counter.hidden = false;
      counter.textContent = hasMultipleImages
        ? `${activeIndex + 1} / ${galleryItems.length} | ${Math.round(modalScale * 100)}%`
        : `${Math.round(modalScale * 100)}%`;
    }
  };

  const preloadAdjacentImages = () => {
    if (galleryItems.length < 2) return;
    [activeIndex - 1, activeIndex + 1].forEach((index) => {
      const nextIndex = (index + galleryItems.length) % galleryItems.length;
      const preloadSrc = getImageSrc(galleryItems[nextIndex]);
      if (!preloadSrc) return;
      const image = new Image();
      image.src = preloadSrc;
    });
  };

  const updateCertificateNavState = () => {
    const hasMultipleImages = galleryItems.length > 1;
    if (certViewerPrev) certViewerPrev.hidden = !hasMultipleImages;
    if (certViewerNext) certViewerNext.hidden = !hasMultipleImages;
    if (certViewerCounter) {
      certViewerCounter.hidden = false;
      certViewerCounter.textContent = hasMultipleImages
        ? `${activeIndex + 1} / ${galleryItems.length} | ${Math.round(certificateScale * 100)}%`
        : `${Math.round(certificateScale * 100)}%`;
    }
  };

  const applyModalFit = () => {
    if (!modalImg || !modalStage || !modalImg.naturalWidth || !modalImg.naturalHeight) return;
    const stageRect = modalStage.getBoundingClientRect();
    const fitRatio = Math.min(
      stageRect.width / modalImg.naturalWidth,
      stageRect.height / modalImg.naturalHeight
    );
    const displayRatio = Math.max(.01, fitRatio) * modalScale;
    modalImg.style.width = `${modalImg.naturalWidth * displayRatio}px`;
    modalImg.style.height = `${modalImg.naturalHeight * displayRatio}px`;
    modalImg.style.maxWidth = 'none';
    modalImg.style.maxHeight = 'none';
    modalImg.style.transform = 'none';
    modalImg.style.cursor = modalScale > 1 ? 'zoom-out' : 'zoom-in';
  };

  const setModalScale = (scale) => {
    modalScale = Math.min(2, Math.max(1, scale));
    if (modalStage) {
      modalStage.classList.toggle('is-zoomed', modalScale > 1);
      if (modalScale === 1) {
        modalStage.scrollLeft = 0;
        modalStage.scrollTop = 0;
      }
    }
    applyModalFit();
    updateNavState();
  };

  const setCertificateScale = (scale) => {
    certificateScale = Math.min(2, Math.max(1, scale));
    if (certViewerStage) {
      certViewerStage.classList.toggle('is-zoomed', certificateScale > 1);
      if (certificateScale === 1) {
        certViewerStage.scrollLeft = 0;
        certViewerStage.scrollTop = 0;
      }
    }
    applyCertificateFit();
    updateCertificateNavState();
  };

  const applyCertificateFit = () => {
    if (!certViewerImg || !certViewerStage || !certViewerImg.naturalWidth || !certViewerImg.naturalHeight) return;
    const stageRect = certViewerStage.getBoundingClientRect();
    const fitRatio = Math.min(
      stageRect.width / certViewerImg.naturalWidth,
      stageRect.height / certViewerImg.naturalHeight
    );
    const displayRatio = Math.max(.01, fitRatio) * certificateScale;
    certViewerImg.style.width = `${certViewerImg.naturalWidth * displayRatio}px`;
    certViewerImg.style.height = `${certViewerImg.naturalHeight * displayRatio}px`;
    certViewerImg.style.maxWidth = 'none';
    certViewerImg.style.maxHeight = 'none';
    certViewerImg.style.transform = 'none';
    if (certViewerImg) {
      certViewerImg.style.cursor = certificateScale > 1 ? 'zoom-out' : 'zoom-in';
    }
  };

  const showImage = (index) => {
    if (!galleryItems.length || !modalImg) return;
    activeIndex = (index + galleryItems.length) % galleryItems.length;
    const activeLink = galleryItems[activeIndex];
    setModalScale(1);
    modalImg.onload = applyModalFit;
    modalImg.src = getImageSrc(activeLink);
    modalImg.alt = getImageAlt(activeLink);
    updateNavState();
    preloadAdjacentImages();
  };

  const showCertificate = (index) => {
    if (!galleryItems.length || !certViewerImg) return;
    activeIndex = (index + galleryItems.length) % galleryItems.length;
    const activeLink = galleryItems[activeIndex];
    setCertificateScale(1);
    certViewerImg.removeAttribute('srcset');
    certViewerImg.removeAttribute('sizes');
    certViewerImg.decoding = 'async';
    certViewerImg.onload = applyCertificateFit;
    certViewerImg.src = getCertificateOriginalSrc(activeLink);
    certViewerImg.alt = getImageAlt(activeLink);
    updateCertificateNavState();
    preloadAdjacentImages();
  };

  const closeModal = () => {
    imageModal.classList.remove('open');
    imageModal.classList.remove('image-modal--certificate');
    imageModal.style.display = 'none';
    imageModal.setAttribute('aria-hidden', 'true');
    if (modalImg) modalImg.removeAttribute('src');
    setModalScale(1);
    document.body.classList.remove('image-modal-open');
  };

  const closeCertificateViewer = () => {
    if (!certViewer) return;
    certViewer.classList.add('hidden');
    certViewer.setAttribute('aria-hidden', 'true');
    if (certViewerImg) certViewerImg.removeAttribute('src');
    setCertificateScale(1);
    document.body.classList.remove('cert-viewer-open');
  };

  const openModal = (imageLink) => {
    galleryItems = getGalleryLinks(imageLink);
    activeIndex = Math.max(0, galleryItems.indexOf(imageLink));
    imageModal.style.display = 'flex';
    imageModal.setAttribute('aria-hidden', 'false');
    imageModal.classList.toggle('image-modal--certificate', getLightboxMode(imageLink) === 'certificate');
    document.body.classList.add('image-modal-open');
    showImage(activeIndex);
    requestAnimationFrame(() => imageModal.classList.add('open'));
  };

  const openCertificateViewer = (imageLink) => {
    if (!certViewer) {
      openModal(imageLink);
      return;
    }
    galleryItems = getGalleryLinks(imageLink);
    activeIndex = Math.max(0, galleryItems.indexOf(imageLink));
    certViewer.classList.remove('hidden');
    certViewer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cert-viewer-open');
    showCertificate(activeIndex);
  };

  const showPrevious = () => showImage(activeIndex - 1);
  const showNext = () => showImage(activeIndex + 1);
  const showPreviousCertificate = () => showCertificate(activeIndex - 1);
  const showNextCertificate = () => showCertificate(activeIndex + 1);

  window.MiDENLightbox = {
    open(imageLink) {
      if (!imageLink) return;
      if (getLightboxMode(imageLink) === 'certificate') {
        openCertificateViewer(imageLink);
        return;
      }
      openModal(imageLink);
    },
  };

  document.querySelectorAll('.certificate-grid img').forEach((img) => {
    img.classList.add('cert-img');
    img.setAttribute('title', 'Click to view certificate in high resolution');
  });

  document.querySelectorAll('.factory-page-preview figure img, .factory-grid figure img').forEach((img) => {
    img.dataset.lightboxImage = '';
    img.dataset.lightboxSrc = img.currentSrc || img.getAttribute('src') || '';
    img.style.cursor = 'zoom-in';
  });

  document.querySelectorAll('.product-card img, .product-library-card img, .product-catalog-grid img').forEach((img) => {
    if (img.closest('[data-lightbox-image]')) return;
    img.dataset.lightboxImage = '';
    img.dataset.lightboxSrc = img.currentSrc || img.getAttribute('src') || '';
    img.style.cursor = 'zoom-in';
  });

  document.querySelectorAll('.home-product-card').forEach((card) => {
    const link = card.querySelector('a');
    if (!link) return;
    link.setAttribute('aria-expanded', 'false');
    card.querySelectorAll('img').forEach((img) => {
      delete img.dataset.lightboxImage;
      delete img.dataset.lightboxSrc;
      img.style.cursor = 'pointer';
    });
    link.addEventListener('click', (event) => {
      const isOpen = card.classList.contains('is-open');
      if (isOpen && !event.target.closest('.home-product-card__image')) return;
      event.preventDefault();
      document.querySelectorAll('.home-product-card.is-open').forEach((openCard) => {
        if (openCard === card) return;
        openCard.classList.remove('is-open');
        openCard.querySelector('a')?.setAttribute('aria-expanded', 'false');
      });
      card.classList.toggle('is-open', !isOpen);
      link.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented) return;
    const imageLink = event.target.closest('[data-lightbox-image]');
    if (!imageLink) return;
    event.preventDefault();
    if (getLightboxMode(imageLink) === 'certificate') {
      openCertificateViewer(imageLink);
      return;
    }
    openModal(imageLink);
  });

  closeButton?.addEventListener('click', closeModal);
  zoomInButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    setModalScale(modalScale + .25);
  });
  zoomOutButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    setModalScale(modalScale - .25);
  });
  modalImg?.addEventListener('dblclick', (event) => {
    event.stopPropagation();
    setModalScale(modalScale === 1 ? 2 : 1);
  });
  modalImg?.addEventListener('wheel', (event) => {
    if (!imageModal.classList.contains('open')) return;
    event.preventDefault();
    setModalScale(modalScale + (event.deltaY < 0 ? .15 : -.15));
  }, { passive: false });
  certViewerClose?.addEventListener('click', closeCertificateViewer);
  certViewerPrev?.addEventListener('click', (event) => {
    event.stopPropagation();
    showPreviousCertificate();
  });
  certViewerNext?.addEventListener('click', (event) => {
    event.stopPropagation();
    showNextCertificate();
  });
  certViewerZoomIn?.addEventListener('click', (event) => {
    event.stopPropagation();
    setCertificateScale(certificateScale + .25);
  });
  certViewerZoomOut?.addEventListener('click', (event) => {
    event.stopPropagation();
    setCertificateScale(certificateScale - .25);
  });
  certViewerImg?.addEventListener('dblclick', (event) => {
    event.stopPropagation();
    setCertificateScale(certificateScale === 1 ? 2 : 1);
  });
  certViewerImg?.addEventListener('wheel', (event) => {
    if (!certViewer || certViewer.classList.contains('hidden')) return;
    event.preventDefault();
    setCertificateScale(certificateScale + (event.deltaY < 0 ? .15 : -.15));
  }, { passive: false });
  window.addEventListener('resize', () => {
    applyModalFit();
    applyCertificateFit();
  });
  prevButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    showPrevious();
  });
  nextButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    showNext();
  });
  imageModal.addEventListener('click', (event) => {
    if (event.target === imageModal || event.target === modalStage) closeModal();
  });
  certViewer?.addEventListener('click', (event) => {
    if (event.target === certViewer || event.target === certViewerStage) closeCertificateViewer();
  });
  document.addEventListener('keydown', (event) => {
    if (certViewer && !certViewer.classList.contains('hidden')) {
      if (event.key === 'Escape') closeCertificateViewer();
      if (event.key === 'ArrowLeft') showPreviousCertificate();
      if (event.key === 'ArrowRight') showNextCertificate();
      return;
    }
    if (!imageModal.classList.contains('open')) return;
    if (event.key === 'Escape') closeModal();
    if (event.key === 'ArrowLeft') showPrevious();
    if (event.key === 'ArrowRight') showNext();
  });
})();

(() => {
  const salesEmail = 'selinaliu3978@gmail.com';
  const whatsapp = '8619808253978';
  const defaultEmailSubject = 'RFQ from Website';
  const defaultEmailBody = 'Hi, I am interested in your magnetic components.';
  const buildEmailComposeUrl = (subject, body) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(salesEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const defaultEmailHref = buildEmailComposeUrl(defaultEmailSubject, defaultEmailBody);
  const isProductPage = /\/products\/[^/]+\.html$/.test(window.location.pathname.replace(/\\/g, '/'));
  const isProductsIndexPage = /\/products\.html$/.test(window.location.pathname.replace(/\\/g, '/'));
  const isLandingPage = document.body.classList.contains('landing-page');
  const conversionLabels = window.GOOGLE_ADS_CONVERSION_LABELS || {};
  const remarketingId = window.GOOGLE_ADS_REMARKETING_ID || 'AW-CONVERSION_ID';
  if (!window.gtag) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(){ window.dataLayer.push(arguments); };
    const adsTag = document.createElement('script');
    adsTag.async = true;
    adsTag.src = `https://www.googletagmanager.com/gtag/js?id=${remarketingId}`;
    document.head.appendChild(adsTag);
    window.gtag('js', new Date());
    window.gtag('config', remarketingId);
  }
  const productName = document.body.dataset.product
    || document.querySelector('.product-hero h1')?.textContent.trim()
    || document.querySelector('h1')?.textContent.trim()
    || 'Magnetic Component';
  const productCategory = document.body.dataset.category
    || (isProductPage ? productName : (document.querySelector('.product-hero .eyebrow')?.textContent.trim() || 'General Inquiry'));
  const isFactoryPage = /\/factory\.html$/.test(window.location.pathname);
  const isHomePage = /\/(index\.html)?$/.test(window.location.pathname);

  const trackLeadEvent = (eventName, params = {}) => {
    const payload = {
      product_name: productName,
      product_category: productCategory,
      page_location: window.location.href,
      ...params,
    };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...payload });
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, payload);
      if (conversionLabels[eventName]) {
        window.gtag('event', 'conversion', {
          send_to: conversionLabels[eventName],
          ...payload,
        });
      }
    }
  };

  const readJson = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (_) {
      return fallback;
    }
  };

  const saveLeadProfile = (updates = {}) => {
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );
    const profile = {
      first_seen: Date.now(),
      pages: [],
      products: [],
      factory_viewed: false,
      rfq_opened: false,
      rfq_submitted: false,
      source_pages: [],
      lead_class: 'C',
      score: 0,
      intent: 'LOW PRIORITY',
      remarketing_segments: [],
      ...readJson('midenLeadProfile', {}),
    };
    const next = { ...profile, ...cleanUpdates };
    next.pages = Array.from(new Set([...(profile.pages || []), ...(cleanUpdates.pages || [])])).slice(-40);
    next.products = Array.from(new Set([...(profile.products || []), ...(cleanUpdates.products || [])])).slice(-20);
    next.source_pages = Array.from(new Set([...(profile.source_pages || []), ...(cleanUpdates.source_pages || [])])).slice(-20);
    next.remarketing_segments = Array.from(new Set([...(profile.remarketing_segments || []), ...(cleanUpdates.remarketing_segments || [])]));
    if (next.rfq_submitted || next.whatsapp_contacted) {
      next.lead_class = 'A';
      next.intent = 'HIGH PRIORITY';
      next.score = Math.max(next.score, 90);
      if (!next.remarketing_segments.includes('High Intent visitors')) next.remarketing_segments.push('High Intent visitors');
    } else if (next.products.length >= 1) {
      next.lead_class = 'B';
      next.intent = 'MEDIUM PRIORITY';
      next.score = Math.max(next.score, 60);
    } else if (isHomePage && next.products.length === 0) {
      next.lead_class = 'C';
      next.intent = 'LOW PRIORITY';
      next.score = Math.max(next.score, 20);
      if (!next.remarketing_segments.includes('Low Priority remarketing')) next.remarketing_segments.push('Low Priority remarketing');
    }
    localStorage.setItem('midenLeadProfile', JSON.stringify(next));
    trackLeadEvent('lead_score_update', {
      lead_intent: next.intent,
      lead_class: next.lead_class,
      lead_score: next.score,
      remarketing_segments: next.remarketing_segments.join(', '),
    });
    return next;
  };

  trackLeadEvent('page_view');
  saveLeadProfile({
    pages: [window.location.pathname],
    factory_viewed: isFactoryPage || undefined,
  });

  if (isProductPage || isLandingPage) {
    trackLeadEvent('Product_Page_View');
    trackLeadEvent('product_view');
    saveLeadProfile({
      products: [productName],
      remarketing_segments: ['Product viewers'],
    });
  }

  if (isProductPage) {
    const remarketingViews = JSON.parse(localStorage.getItem('midenRemarketingViews') || '[]')
      .filter((item) => item && typeof item === 'object');
    remarketingViews.push({
      product: productName,
      category: productCategory,
      url: window.location.href,
      submitted: false,
      time: Date.now(),
    });
    localStorage.setItem('midenRemarketingViews', JSON.stringify(remarketingViews.slice(-30)));
    trackLeadEvent('Remarketing_Product_View', {
      audience: 'product_view_no_rfq',
    });
  }

  const buildMailto = (data) => {
    const origin = window.location.origin || '';
    const body = [
      `Product Type: ${data.product || productName}`,
      `Product Category: ${data.category || productCategory}`,
      `Application: ${data.application || ''}`,
      `Quantity: ${data.quantity || ''}`,
      `Email: ${data.email || ''}`,
      `Requirement: ${data.requirement || ''}`,
      `Sample Request: ${data.sampleRequest || 'No'}`,
      `Page: ${window.location.href}`,
      '',
      'Please review the following reference materials:',
      'Product Catalog: assets/downloads/product-catalog.pdf',
      'Company Profile: assets/downloads/company-profile.pdf',
      'Factory Video: factory.html',
      'Certificates: certificates.html',
    ].join('\n');
    return buildEmailComposeUrl('MiDEN RFQ Inquiry', body);
  };

  const scheduleFollowUp = (data = {}) => {
    const now = Date.now();
    const plan = {
      product: data.product || productName,
      source_page: window.location.href,
      created_at: now,
      steps: [
        { channel: 'WhatsApp', timing: 'Immediate', purpose: 'Acknowledge inquiry and ask key application parameters', status: 'triggered' },
        { channel: 'Email', timing: 'Immediate', purpose: 'Acknowledgment email with catalog and company profile', status: 'triggered' },
        { channel: 'Email', timing: 'Quotation email', purpose: 'Technical solution, Option A / B, MOQ, lead time and application fit', status: 'scheduled' },
        { channel: 'Email', timing: '48h follow-up', due_at: now + (48 * 60 * 60 * 1000), purpose: 'Follow up decision status and sample request', status: 'scheduled' },
      ],
      quotation_structure: {
        technical_solution: '',
        option_a: '',
        option_b: '',
        moq: '',
        lead_time: '',
        application_fit: '',
      },
      trust_materials: [
        'factory.html',
        'certificates.html',
        'assets/downloads/product-catalog.pdf',
        'assets/downloads/company-profile.pdf',
      ],
    };
    const plans = readJson('midenFollowUpPlans', []);
    plans.push(plan);
    localStorage.setItem('midenFollowUpPlans', JSON.stringify(plans.slice(-20)));
    trackLeadEvent('follow_up_plan_created', {
      product_name: plan.product,
      source_page: plan.source_page,
      follow_up_steps: 'WhatsApp immediate, acknowledgment email, quotation email, 48h follow-up email',
    });
    return plan;
  };

  const buildThanksWhatsAppUrl = (product) => {
    const thanksMessage = [
      'Hi, thanks for your inquiry.',
      `Product: ${product || productName}`,
      '',
      'To recommend the right solution, could you share the application details?',
      '- inductance',
      '- current',
      '- frequency',
      '',
      'We can then provide:',
      'Option A: standard magnetic component solution',
      'Option B: customized magnetic component solution',
      '',
      'After confirming the specification, we will push quotation with MOQ, lead time and application fit.',
    ].join('\n');
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(thanksMessage)}`;
  };

  const modal = document.createElement('div');
  modal.className = 'rfq-modal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="rfq-modal__panel" role="dialog" aria-modal="true" aria-labelledby="rfq-modal-title">
      <button class="rfq-modal__close" type="button" aria-label="Close RFQ form">x</button>
      <p class="eyebrow">RFQ Support</p>
      <h2 id="rfq-modal-title">Request RFQ / Get Quote</h2>
      <p>Send your product requirement and our sales team will respond with quotation support.</p>
      <form class="rfq-modal__form">
        <label>Product Type<input name="product" value="${productName.replace(/"/g, '&quot;')}" required></label>
        <input type="hidden" name="category" value="${productCategory.replace(/"/g, '&quot;')}">
        <label>Application<input name="application" placeholder="Power supply, EV charger, industrial control..."></label>
        <label>Quantity<input name="quantity" placeholder="Prototype, 1K pcs, 10K pcs..."></label>
        <label>Email<input name="email" type="email" required></label>
        <label class="sample-request-option"><input name="sampleRequest" type="checkbox" value="Yes"> Sample request available</label>
        <button class="btn" type="submit">Send Inquiry</button>
      </form>
    </div>`;
  document.body.appendChild(modal);

  const openRfq = () => {
    if (sessionStorage.getItem('rfqModalSubmitted') === '1') return;
    modal.style.display = 'flex';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    trackLeadEvent('rfq_open');
    trackLeadEvent('RFQ_Open');
    saveLeadProfile({
      rfq_opened: true,
      source_pages: [window.location.href],
      remarketing_segments: ['RFQ open users'],
    });
  };

  const closeRfq = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
  };

  const openRfqPanel = () => {
    if (window.MiDENRouter) {
      window.MiDENRouter.handleClick('RFQ', { source: 'main-openRfqPanel' });
      return;
    }
    openRfq();
  };

  modal.querySelector('.rfq-modal__close')?.addEventListener('click', closeRfq);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeRfq();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('open')) closeRfq();
  });
  modal.querySelector('form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    sessionStorage.setItem('rfqModalSubmitted', '1');
    localStorage.setItem('midenRfqSubmitted', '1');
    const submittedProfile = saveLeadProfile({
      rfq_submitted: true,
      whatsapp_contacted: true,
      source_pages: [window.location.href],
      remarketing_segments: ['High Intent visitors', 'RFQ open users'],
    });
    const submissions = readJson('midenLeadSubmissions', []);
    submissions.push({
      source_page: window.location.href,
      product: form.get('product'),
      email: form.get('email'),
      lead_intent: submittedProfile.intent,
      lead_class: submittedProfile.lead_class,
      time: Date.now(),
    });
    localStorage.setItem('midenLeadSubmissions', JSON.stringify(submissions.slice(-20)));
    trackLeadEvent('RFQ_Submit', {
      product_type: form.get('product'),
      application: form.get('application'),
      quantity: form.get('quantity'),
      email: form.get('email'),
      sample_request: form.get('sampleRequest') || 'No',
      lead_source: isLandingPage ? 'Google Ads Landing Page' : 'Website RFQ Modal',
      source_page: window.location.href,
      lead_intent: submittedProfile.intent,
      lead_class: submittedProfile.lead_class,
    });
    window.location.href = buildMailto({
      product: form.get('product'),
      category: form.get('category'),
      application: form.get('application'),
      quantity: form.get('quantity'),
      email: form.get('email'),
      sampleRequest: form.get('sampleRequest') || 'No',
    });
    scheduleFollowUp({
      product: form.get('product'),
    });
    trackLeadEvent('quote_template_ready', {
      product_name: form.get('product') || productName,
      fields: 'Technical solution, Option A / B, MOQ, Lead time, Application fit',
    });
  });

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented) return;
    const trigger = event.target.closest('a, button');
    if (!trigger) return;
    const label = trigger.textContent.trim();
    if (label === 'Request RFQ / Get Quote' || label === 'Get Quote Fast' || label === 'Get Quote for this Product') {
      event.preventDefault();
      window.MiDENRouter?.handleClick('RFQ', { source: trigger }) || openRfqPanel();
    }
  });

  document.querySelectorAll('.lead-rfq-form').forEach((formElement) => {
    formElement.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = new FormData(formElement);
      localStorage.setItem('midenRfqSubmitted', '1');
      const submittedProfile = saveLeadProfile({
        rfq_submitted: true,
        whatsapp_contacted: true,
        source_pages: [window.location.href],
        remarketing_segments: ['High Intent visitors', 'RFQ open users'],
      });
      trackLeadEvent('RFQ_Submit', {
        product_type: form.get('Product Type') || form.get('Product') || productName,
        specification: form.get('Specification'),
        application: form.get('Application'),
        quantity: form.get('Quantity'),
        email: form.get('Email'),
        sample_request: form.get('Sample Request') || 'No',
        lead_source: isLandingPage ? 'Google Ads Landing Page' : 'Website RFQ Form',
        source_page: window.location.href,
        lead_intent: submittedProfile.intent,
        lead_class: submittedProfile.lead_class,
      });
      if (isLandingPage) assistantWhatsapp?.setAttribute('href', buildThanksWhatsAppUrl(form.get('Product Type') || productName));
      scheduleFollowUp({
        product: form.get('Product Type') || form.get('Product') || productName,
      });
      trackLeadEvent('quote_template_ready', {
        product_name: form.get('Product Type') || form.get('Product') || productName,
        fields: 'Technical solution, Option A / B, MOQ, Lead time, Application fit',
      });
      window.location.href = buildMailto({
        product: form.get('Product Type') || form.get('Product') || productName,
        category: productCategory,
        application: form.get('Application'),
        quantity: form.get('Quantity'),
        email: form.get('Email'),
        requirement: form.get('Requirement') || form.get('Specification') || '',
        sampleRequest: form.get('Sample Request') || 'No',
      });
    });
  });

  document.querySelectorAll('a[href^="mailto:"], a[href^="https://mail.google.com/mail/"]').forEach((link) => {
    link.addEventListener('click', () => {
      trackLeadEvent('Email_Click', {
        lead_source: isLandingPage ? 'Google Ads Landing Page' : 'Website',
      });
    });
  });

  const salesAssistantState = {
    product: productName !== 'Magnetic Component' ? productName : '',
    application: '',
    inductance: '',
    current: '',
    frequency: '',
  };

  const assistant = document.createElement('div');
  assistant.className = 'ai-sales-assistant';
  assistant.innerHTML = `
    <button class="ai-sales-assistant__toggle" type="button" aria-expanded="false">AI Sales</button>
    <section class="ai-sales-assistant__panel" aria-hidden="true">
      <header class="ai-sales-assistant__header">
        <div><strong>Miden Technical Assistant</strong><span>Technical Sales Assistant</span></div>
        <button class="ai-sales-assistant__close" type="button" aria-label="Close assistant">x</button>
      </header>
      <div class="ai-sales-assistant__body">
        <div class="ai-message">Hi 👋<br>I am your Miden Technical Assistant.<br>What are you looking for?</div>
        <div class="ai-options" data-ai-options>
          <button type="button" data-product="Power Inductor">Power Inductor</button>
          <button type="button" data-product="Transformer">Transformer</button>
          <button type="button" data-product="EMI Choke">EMI Choke</button>
          <button type="button" data-product="Custom Magnetic Component">Custom Magnetic Component</button>
        </div>
        <form class="ai-sales-assistant__form" data-ai-form hidden>
          <label>Application<input name="application" placeholder="SMPS, EV charger, EMI filter..."></label>
          <label>Inductance<input name="inductance" placeholder="10 uH, 1 mH, custom..."></label>
          <label>Current<input name="current" placeholder="2A, 10A, 30A..."></label>
          <label>Frequency<input name="frequency" placeholder="50 kHz, 100 kHz, 1 MHz..."></label>
          <button class="btn" type="submit">Recommend Solution</button>
        </form>
        <div class="ai-sales-assistant__result" data-ai-result hidden></div>
        <form class="ai-sales-assistant__email" data-ai-email-capture hidden>
          <label>Email<input name="email" type="email" placeholder="your@email.com" required></label>
          <button class="btn" type="submit">Send Requirement</button>
        </form>
      </div>
      <footer class="ai-sales-assistant__actions" data-ai-actions hidden>
        <button class="btn" type="button" data-ai-rfq data-miden-action="RFQ">Get Quote</button>
        <a class="btn secondary" href="${defaultEmailHref}" data-ai-email data-miden-action="EMAIL">Send Requirement</a>
        <a class="btn secondary" href="https://wa.me/${whatsapp}" target="_blank" rel="noopener" data-ai-whatsapp data-miden-action="WHATSAPP">WhatsApp Chat</a>
      </footer>
    </section>`;
  document.body.appendChild(assistant);

  const assistantToggle = assistant.querySelector('.ai-sales-assistant__toggle');
  const assistantPanel = assistant.querySelector('.ai-sales-assistant__panel');
  const assistantClose = assistant.querySelector('.ai-sales-assistant__close');
  const assistantForm = assistant.querySelector('[data-ai-form]');
  const assistantResult = assistant.querySelector('[data-ai-result]');
  const assistantActions = assistant.querySelector('[data-ai-actions]');
  const assistantWhatsapp = assistant.querySelector('[data-ai-whatsapp]');
  const assistantEmail = assistant.querySelector('[data-ai-email]');
  const assistantEmailCapture = assistant.querySelector('[data-ai-email-capture]');

  const setAssistantOpen = (open) => {
    assistant.classList.toggle('open', open);
    assistantToggle?.setAttribute('aria-expanded', String(open));
    assistantPanel?.setAttribute('aria-hidden', String(!open));
    if (open) trackLeadEvent('ai_assistant_open');
  };

  const updateAssistantLinks = () => {
    const product = salesAssistantState.product || productName;
    const requirement = [
      `Product: ${product}`,
      `Application: ${salesAssistantState.application}`,
      `Inductance: ${salesAssistantState.inductance}`,
      `Current: ${salesAssistantState.current}`,
      `Frequency: ${salesAssistantState.frequency}`,
      `Source: AI Sales Assistant`,
    ].join('\n');
    const emailBody = salesAssistantState.rfq || requirement;
    const whatsappText = `Hi, I need:\n${product}\nFrom Miden Website`;
    if (assistantWhatsapp) assistantWhatsapp.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(whatsappText)}`;
    if (assistantEmail) {
      assistantEmail.href = buildEmailComposeUrl('Miden Technical Assistant RFQ', emailBody);
    }
  };

  assistantToggle?.addEventListener('click', () => setAssistantOpen(!assistant.classList.contains('open')));
  assistantClose?.addEventListener('click', () => setAssistantOpen(false));

  const openProductCategory = (slug) => {
    const categoryUrls = {
      'power-inductor': '/products/power-inductor.html',
      transformer: '/products/high-frequency-transformers.html',
      'common-mode-choke': '/products/common-mode-choke.html',
      'custom-magnetic-components': '/products/custom-magnetic-components.html',
    };
    if (categoryUrls[slug]) {
      const url = categoryUrls[slug];
      if (window.MiDENRouter) {
        window.MiDENRouter.handleClick('PRODUCT', { url, source: 'ai-sales-assistant' });
      } else {
        window.location.href = url;
      }
    }
  };

  document.addEventListener('click', (event) => {
    const popupTarget = event.target.closest('.ai-sales-assistant');
    if (!popupTarget) return;
    console.log('AI popup clicked:', event.target);

    const button = event.target.closest('button');
    if (!button) return;
    const label = button.textContent || '';
    let product = button.dataset.product || '';
    let slug = '';

    if (label.includes('Power Inductor')) {
      product = 'Power Inductor';
      slug = 'power-inductor';
    } else if (label.includes('Transformer')) {
      product = 'Transformer';
      slug = 'transformer';
    } else if (label.includes('EMI Choke')) {
      product = 'EMI Choke';
      slug = 'common-mode-choke';
    } else if (label.includes('Custom Magnetic Component')) {
      product = 'Custom Magnetic Component';
      slug = 'custom-magnetic-components';
    }

    if (!slug) return;
    event.preventDefault();
    salesAssistantState.product = product;
    assistantForm.hidden = false;
    assistantActions.hidden = true;
    assistantResult.hidden = true;
    saveLeadProfile({
      products: [salesAssistantState.product],
      remarketing_segments: ['Product viewers'],
    });
    trackLeadEvent('ai_product_selected', {
      product_name: salesAssistantState.product,
    });
    openProductCategory(slug);
  });

  assistantForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(assistantForm);
    salesAssistantState.application = form.get('application') || '';
    salesAssistantState.inductance = form.get('inductance') || '';
    salesAssistantState.current = form.get('current') || '';
    salesAssistantState.frequency = form.get('frequency') || '';
    assistantResult.hidden = false;
    if (window.MiDENQuoteAI) {
      const requirement = window.MiDENQuoteAI.analyzeRequirement({
        application: salesAssistantState.application,
        current: salesAssistantState.current,
        frequency: salesAssistantState.frequency,
        size: salesAssistantState.inductance,
        product: salesAssistantState.product || productName,
      });
      const recommendation = window.MiDENQuoteAI.recommendSolution(requirement);
      salesAssistantState.rfq = window.MiDENQuoteAI.generateRFQ(requirement, recommendation);
      assistantResult.innerHTML = `
        <strong>Engineering recommendation</strong>
        <p>${recommendation.productType}</p>
        <p>${recommendation.series}</p>
        <p>${recommendation.technicalNotes}</p>
        <p><strong>${recommendation.quotationStatus}</strong></p>`;
    } else {
      assistantResult.innerHTML = `
        <strong>Recommended direction</strong>
        <p>Option A: Standard model for quick sample evaluation.</p>
        <p>Option B: Custom solution based on your application, inductance, current and frequency.</p>`;
    }
    assistantActions.hidden = false;
    updateAssistantLinks();
    saveLeadProfile({
      products: [salesAssistantState.product || productName],
      remarketing_segments: ['RFQ open users'],
    });
    trackLeadEvent('ai_recommendation_ready', {
      product_name: salesAssistantState.product || productName,
      application: salesAssistantState.application,
    });
  });

  assistantEmailCapture?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(assistantEmailCapture);
    saveLeadProfile({
      source_pages: [window.location.href],
      remarketing_segments: ['Low Priority remarketing'],
    });
    trackLeadEvent('ai_email_capture', {
      email: form.get('email'),
      lead_class: 'C',
    });
    window.location.href = buildEmailComposeUrl('Miden Technical Assistant Requirement Follow-up', `Email: ${form.get('email')}\nPage: ${window.location.href}`);
  });

  let quoteDock = null;
  if (!isLandingPage) {
    quoteDock = document.createElement('div');
    quoteDock.className = 'quote-dock';
    quoteDock.innerHTML = `<button class="btn" type="button" data-miden-action="RFQ">Request RFQ / Get Quote</button>`;
    document.body.appendChild(quoteDock);
  }

  if (isProductPage) {
    const views = JSON.parse(localStorage.getItem('midenProductViews') || '[]')
      .filter((item) => typeof item === 'string');
    if (!views.includes(window.location.pathname)) views.push(window.location.pathname);
    localStorage.setItem('midenProductViews', JSON.stringify(views.slice(-12)));
    document.body.dataset.productName = productName;
    document.body.dataset.productCategory = productCategory;

    const sideButton = document.createElement('button');
    sideButton.className = 'product-rfq-fixed';
    sideButton.type = 'button';
    sideButton.textContent = 'Get Quote for this Product';
    sideButton.dataset.midenAction = 'RFQ';
    document.body.appendChild(sideButton);

    if (views.length >= 2 && quoteDock) {
      quoteDock.classList.add('show');
    }
  }

  document.querySelectorAll('a[href^="https://wa.me/8619808253978"]').forEach((link) => {
    const message = `Hi, I need:\n${productName}\nFrom Miden Website`;
    link.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
    link.addEventListener('click', () => {
      saveLeadProfile({
        whatsapp_contacted: true,
        source_pages: [window.location.href],
        remarketing_segments: ['High Intent visitors'],
      });
      trackLeadEvent('whatsapp_click');
      trackLeadEvent('WhatsApp_Click', {
        lead_source: isLandingPage ? 'Google Ads Landing Page' : 'Website',
        source_page: window.location.href,
      });
    });
  });

  if (!isLandingPage) {
    window.setTimeout(() => {
      document.querySelector('.floating-contact')?.classList.add('show');
      trackLeadEvent('whatsapp_visible_after_30s');
    }, 30000);
    const openAssistantAfterEngagement = () => {
      const viewerOpen = document.body.classList.contains('image-modal-open')
        || document.body.classList.contains('cert-viewer-open')
        || modal.classList.contains('open');
      if (viewerOpen) {
        window.setTimeout(openAssistantAfterEngagement, 3000);
        return;
      }
      setAssistantOpen(true);
      assistantEmailCapture.hidden = false;
      trackLeadEvent('ai_low_stay_email_prompt', {
        lead_class: readJson('midenLeadProfile', {}).lead_class || 'C',
      });
    };
    window.setTimeout(openAssistantAfterEngagement, 12000);
  }

  let scrollTriggered = false;
  window.addEventListener('scroll', () => {
    if (isLandingPage || !quoteDock) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const percent = (window.scrollY / scrollable) * 100;
    if (percent >= 70 && !scrollTriggered) {
      scrollTriggered = true;
      quoteDock.classList.add('show');
    }
    if (percent >= 92) quoteDock.classList.add('show');
  }, { passive: true });

  const startedAt = Date.now();
  const reportTimeOnPage = () => {
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    trackLeadEvent('time_on_page', {
      seconds,
      lead_intent: readJson('midenLeadProfile', {}).intent || 'LOW PRIORITY',
    });
  };
  window.setInterval(reportTimeOnPage, 30000);
  window.addEventListener('beforeunload', reportTimeOnPage);
  console.log('Product page initialized successfully');
})();
});
})();
