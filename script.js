/* ========================================
   AetherInk Studio - Main Script
======================================== */

const STORAGE_KEY = 'aetherink_portfolio';
const ADMIN_PASS = 'aetherink2026';

// Category labels & icons
const CATEGORIES = {
  logos:     { label: 'Logos',          icon: '🎨' },
  banners:   { label: 'Banners',        icon: '🖼️' },
  panels:    { label: 'Panels',         icon: '📐' },
  overlays:  { label: 'Overlays',       icon: '🖥️' },
  subbadges: { label: 'Sub Badges',     icon: '🏅' },
  emotes:    { label: 'Emotes',         icon: '😊' },
  vtuber:    { label: 'VTuber Models',  icon: '🎭' },
  character: { label: 'Character Art',  icon: '👤' },
  furry:     { label: 'Furry Art',      icon: '🦊' }
};

// ---------- Data Helpers ----------
function getItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// Uploaded files are stored as blobs in IndexedDB rather than localStorage.
const MEDIA_DB_NAME = 'aetherink_media_db';
const MEDIA_STORE = 'mediaFiles';
function openMediaDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(MEDIA_DB_NAME, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(MEDIA_STORE)) req.result.createObjectStore(MEDIA_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function saveMedia(id, file) {
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readwrite');
    tx.objectStore(MEDIA_STORE).put({ blob: file, name: file.name, type: file.type }, id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
async function getMedia(id) {
  if (!id) return null;
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(MEDIA_STORE, 'readonly').objectStore(MEDIA_STORE).get(id);
    req.onsuccess = () => { db.close(); resolve(req.result || null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}
async function deleteMedia(id) {
  if (!id) return;
  const db = await openMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readwrite');
    tx.objectStore(MEDIA_STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function getMediaType(media) {
  const explicitType = String(media?.type || '').toLowerCase();
  if (explicitType) return explicitType;

  // For URL-based media, infer a useful type from the file extension.
  const cleanUrl = String(media?.url || '').split(/[?#]/)[0].toLowerCase();
  const extensionTypes = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.avif': 'image/avif', '.bmp': 'image/bmp',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
    '.m4v': 'video/x-m4v', '.ogv': 'video/ogg',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.pdf': 'application/pdf'
  };
  const extension = Object.keys(extensionTypes).find(ext => cleanUrl.endsWith(ext));
  return extension ? extensionTypes[extension] : '';
}

function mediaElement(url, type, title) {
  const safe = escapeHTML(title || '');
  const safeUrl = escapeHTML(url || '');
  if ((type || '').startsWith('video/')) return `<video src="${safeUrl}" controls muted playsinline preload="metadata" aria-label="${safe}"></video>`;
  if ((type || '').startsWith('audio/')) return `<audio src="${safeUrl}" controls aria-label="${safe}"></audio>`;
  if ((type || '').startsWith('image/')) return `<img src="${safeUrl}" alt="${safe}" loading="lazy">`;
  return `<a class="uploaded-file-link" href="${safeUrl}" target="_blank" rel="noopener">📎 Open ${safe || 'uploaded file'}</a>`;
}

// A clean, clickable thumbnail for each public portfolio asset.
function portfolioMediaThumbnail(media, title) {
  const type = getMediaType(media);
  const safeUrl = escapeHTML(media.url || '');
  const safeTitle = escapeHTML(title || 'Portfolio asset');

  if (type.startsWith('image/')) {
    return `<img src="${safeUrl}" alt="${safeTitle}" loading="lazy">`;
  }
  if (type.startsWith('video/')) {
    return `<video src="${safeUrl}" muted autoplay loop playsinline preload="metadata" aria-label="${safeTitle}"></video>`;
  }
  if (type.startsWith('audio/')) {
    return `<div class="portfolio-file-placeholder"><span>♫</span><small>AUDIO FILE</small></div>`;
  }
  if (type === 'application/pdf' || String(media.name || '').toLowerCase().endsWith('.pdf')) {
    return `<div class="portfolio-file-placeholder"><span>PDF</span><small>DOCUMENT</small></div>`;
  }
  return `<div class="portfolio-file-placeholder"><span>↗</span><small>OPEN FILE</small></div>`;
}
async function getItemMedia(item) {
  if (item.mediaId) {
    const media = await getMedia(item.mediaId);
    if (media && media.blob) return { url: URL.createObjectURL(media.blob), type: media.type || media.blob.type || '', name: media.name || '' };
  }
  return item.image ? { url: item.image, type: '', name: '' } : null;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- Seed Demo Data (first visit) ----------
function seedDemoData() {
  if (localStorage.getItem(STORAGE_KEY)) return;

  const demo = [
    { id: generateId(), title: 'Neon Wolf Logo', category: 'logos', desc: 'Bold neon-style logo for a gaming brand', image: '', emoji: '🐺', created: Date.now() },
    { id: generateId(), title: 'Stream Banner Pack', category: 'banners', desc: 'Animated-ready banner set', image: '', emoji: '🖼️', created: Date.now() },
    { id: generateId(), title: 'Minimal Panels', category: 'panels', desc: 'Clean Twitch panel set', image: '', emoji: '📐', created: Date.now() },
    { id: generateId(), title: 'Cyber Overlay', category: 'overlays', desc: 'Futuristic stream overlay', image: '', emoji: '🖥️', created: Date.now() },
    { id: generateId(), title: 'Fox Sub Badges', category: 'subbadges', desc: '6-tier subscriber badges', image: '', emoji: '🏅', created: Date.now() },
    { id: generateId(), title: 'Happy Cat Emotes', category: 'emotes', desc: '12-piece emote pack', image: '', emoji: '🐱', created: Date.now() },
    { id: generateId(), title: 'Luna VTuber Model', category: 'vtuber', desc: 'Full Live2D model with expressions', image: '', emoji: '🎭', created: Date.now() },
    { id: generateId(), title: 'OC Reference Sheet', category: 'character', desc: 'Original character full ref', image: '', emoji: '👤', created: Date.now() },
    { id: generateId(), title: 'Furry Badge Set', category: 'furry', desc: 'Commission furry badges', image: '', emoji: '🦊', created: Date.now() }
  ];
  saveItems(demo);
}

// ---------- Portfolio Rendering (index.html) ----------
async function renderPortfolio(filter = 'all') {
  const grid = document.getElementById('portfolioGrid');
  if (!grid) return;
  const pageCategory = document.body?.dataset?.categoryPage || '';
  const activeFilter = pageCategory || filter;

  grid.innerHTML = `<div class="empty-state"><div class="icon">⏳</div><h3>Loading…</h3></div>`;

  let items = [];
  // Prefer Firebase cloud portfolio when configured
  try {
    const mod = await import('./portfolio-cloud.js');
    if (mod.isCloudReady()) {
      const cloud = await mod.fetchPortfolio(activeFilter === 'all' ? null : activeFilter);
      items = cloud.map(c => ({
        id: c.id,
        title: c.title,
        category: c.category,
        desc: c.description || '',
        image: c.imageUrl || '',
        emoji: c.emoji || '',
        mediaType: c.mediaType || '',
        created: c.createdAt?.toMillis?.() || Date.now(),
        cloud: true
      }));
    }
  } catch (err) {
    console.warn('Cloud portfolio unavailable, using local fallback:', err);
  }

  if (!items.length) {
    // Local fallback (device-only) for offline / before Firebase setup
    const local = getItems();
    items = activeFilter === 'all' ? local : local.filter(i => i.category === activeFilter);
  }

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state"><div class="icon">📭</div><h3>No projects yet</h3><p>Projects in this category will appear here after admin uploads to Firebase.</p></div>`;
    return;
  }

  const cards = await Promise.all(items.map(async item => {
    const cat = CATEGORIES[item.category] || { label: item.category, icon: '✨' };
    let media = null;
    if (item.cloud && item.image) {
      media = { url: item.image, type: item.mediaType || '', name: '' };
    } else {
      media = await getItemMedia(item);
    }
    const mediaType = media ? getMediaType(media) : '';
    const thumb = media ? portfolioMediaThumbnail(media, item.title) : (item.emoji || cat.icon);
    const safeTitle = escapeHTML(item.title || 'Untitled project');
    const safeDesc = escapeHTML(item.desc || '');
    const safeCategory = escapeHTML(cat.label || 'Portfolio');
    const safeCategoryKey = escapeHTML(item.category || '');
    const clickAttrs = media
      ? `data-media-url="${escapeHTML(media.url)}" data-media-type="${escapeHTML(mediaType)}" data-media-title="${safeTitle}" data-media-name="${escapeHTML(media.name || '')}" role="button" tabindex="0" aria-label="Open ${safeTitle}"`
      : '';
    return `<article class="portfolio-item${media ? ' portfolio-item-clickable' : ''}" data-category="${safeCategoryKey}" ${clickAttrs}><div class="portfolio-thumb">${thumb}${media ? '<span class="portfolio-view-hint">VIEW FULL SIZE <b>↗</b></span>' : ''}</div><div class="portfolio-info"><div class="category">${safeCategory}</div><h3>${safeTitle}</h3><p>${safeDesc}</p></div></article>`;
  }));
  grid.innerHTML = cards.join('');
}

// ---------- Portfolio Asset Lightbox ----------
function closePortfolioLightbox() {
  const lightbox = document.getElementById('portfolioLightbox');
  if (!lightbox) return;
  const media = lightbox.querySelector('video, audio');
  if (media) media.pause();
  lightbox.remove();
  document.body.classList.remove('lightbox-open');
}

function openPortfolioLightbox(url, type, title, fileName) {
  closePortfolioLightbox();

  const lightbox = document.createElement('div');
  lightbox.id = 'portfolioLightbox';
  lightbox.className = 'portfolio-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', `${title || 'Portfolio asset'} preview`);

  const dialog = document.createElement('div');
  dialog.className = 'portfolio-lightbox-dialog';

  const header = document.createElement('div');
  header.className = 'portfolio-lightbox-header';
  const heading = document.createElement('h2');
  heading.textContent = title || fileName || 'Portfolio preview';
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'portfolio-lightbox-close';
  closeButton.setAttribute('aria-label', 'Close preview');
  closeButton.textContent = '×';
  closeButton.addEventListener('click', closePortfolioLightbox);
  header.append(heading, closeButton);

  const stage = document.createElement('div');
  stage.className = 'portfolio-lightbox-stage';
  const resolvedType = String(type || '').toLowerCase();
  let preview;

  if (resolvedType.startsWith('image/')) {
    preview = document.createElement('img');
    preview.src = url;
    preview.alt = title || 'Full-size portfolio artwork';
    preview.className = 'portfolio-lightbox-media';
  } else if (resolvedType.startsWith('video/')) {
    preview = document.createElement('video');
    preview.src = url;
    preview.controls = true;
    preview.autoplay = true;
    preview.playsInline = true;
    preview.className = 'portfolio-lightbox-media';
  } else if (resolvedType.startsWith('audio/')) {
    preview = document.createElement('audio');
    preview.src = url;
    preview.controls = true;
    preview.autoplay = true;
    preview.className = 'portfolio-lightbox-audio';
  } else if (resolvedType === 'application/pdf' || String(fileName || '').toLowerCase().endsWith('.pdf')) {
    preview = document.createElement('iframe');
    preview.src = url;
    preview.title = title || 'PDF preview';
    preview.className = 'portfolio-lightbox-document';
  } else {
    preview = document.createElement('div');
    preview.className = 'portfolio-lightbox-unsupported';
    const message = document.createElement('p');
    message.textContent = 'Preview is not available for this file type.';
    const openLink = document.createElement('a');
    openLink.href = url;
    openLink.target = '_blank';
    openLink.rel = 'noopener';
    openLink.textContent = 'Open or download file';
    preview.append(message, openLink);
  }

  stage.appendChild(preview);
  dialog.append(header, stage);
  lightbox.appendChild(dialog);
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) closePortfolioLightbox();
  });
  document.body.appendChild(lightbox);
  document.body.classList.add('lightbox-open');
  closeButton.focus();
}

function initPortfolioLightbox() {
  const grid = document.getElementById('portfolioGrid');
  if (!grid || grid.dataset.lightboxReady === 'true') return;
  grid.dataset.lightboxReady = 'true';

  const openCard = card => {
    if (!card?.dataset.mediaUrl) return;
    openPortfolioLightbox(
      card.dataset.mediaUrl,
      card.dataset.mediaType || '',
      card.dataset.mediaTitle || 'Portfolio asset',
      card.dataset.mediaName || ''
    );
  };

  grid.addEventListener('click', event => {
    const card = event.target.closest('.portfolio-item-clickable');
    if (card && grid.contains(card)) openCard(card);
  });
  grid.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('.portfolio-item-clickable');
    if (!card || !grid.contains(card)) return;
    event.preventDefault();
    openCard(card);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePortfolioLightbox();
  });
}

// ---------- Filter Buttons ----------
function initFilters() {
  const bar = document.getElementById('filterBar');
  if (!bar) return;

  bar.addEventListener('click', e => {
    if (!e.target.classList.contains('filter-btn')) return;
    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    renderPortfolio(e.target.dataset.filter);
  });
}

// ---------- Navbar ----------
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('menuToggle');
  const links = document.getElementById('navLinks');

  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    });
  }

  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => links.classList.remove('open'));
    });
  }
}

// ---------- Contact Form (EmailJS) ----------
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const status = document.getElementById('contactFormStatus');
  const submitButton = document.getElementById('contactSubmitButton');
  const config = window.AETHERINK_EMAILJS_CONFIG || {};
  const configured = Boolean(
    window.emailjs &&
    config.publicKey && config.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY' &&
    config.serviceId && config.serviceId !== 'YOUR_EMAILJS_SERVICE_ID' &&
    config.templateId && config.templateId !== 'YOUR_EMAILJS_TEMPLATE_ID'
  );

  const showStatus = (message, type) => {
    if (!status) return;
    status.textContent = message;
    status.className = `contact-form-status is-${type}`;
  };

  if (configured) {
    // Browser-side throttle helps reduce accidental repeat submissions.
    emailjs.init({
      publicKey: config.publicKey,
      limitRate: { id: 'aetherink-contact-form', throttle: 10000 }
    });
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();

    // Quietly reject simple bot submissions that fill the hidden honeypot.
    const honeypot = form.querySelector('[name="website"]');
    if (honeypot && honeypot.value.trim()) return;

    if (!configured) {
      showStatus('EmailJS is not set up yet. Open emailjs-config.js and replace YOUR_EMAILJS_PUBLIC_KEY, YOUR_EMAILJS_SERVICE_ID and YOUR_EMAILJS_TEMPLATE_ID with your real values from emailjs.com (see EMAILJS-SETUP.md). Until then, contact us on Discord.', 'error');
      return;
    }

    if (!form.reportValidity()) return;

    const originalLabel = submitButton?.textContent || 'Send Message';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
    }
    showStatus('Sending your message securely...', 'sending');

    try {
      await emailjs.sendForm(config.serviceId, config.templateId, form);
      showStatus('Your message has been sent! We will get back to you soon.', 'success');
      form.reset();
    } catch (error) {
      console.error('AetherInk contact form error:', error);
      showStatus('Sorry, your message could not be sent. Please try again or contact us on Discord.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  });
}

// ========== ADMIN FUNCTIONS ==========

function login() {
  const pass = document.getElementById('adminPassword')?.value;
  if (pass === ADMIN_PASS) {
    sessionStorage.setItem('aetherinkAdmin', 'true');
    showDashboard();
  } else {
    alert('Wrong password!');
  }
}

async function loginWithGoogle() {
  try {
    const mod = await import('./portfolio-cloud.js');
    if (!mod.isCloudReady()) {
      alert('Firebase config missing. Fill firebase-config.js first (apiKey, projectId, storageBucket, appId, ADMIN_EMAIL).');
      return;
    }
    await mod.adminGoogleLogin();
    sessionStorage.setItem('aetherinkAdmin', 'true');
    sessionStorage.setItem('aetherinkAdminCloud', 'true');
    showDashboard();
  } catch (err) {
    console.error(err);
    alert(err.message || 'Google login failed');
  }
}

async function logout() {
  sessionStorage.removeItem('aetherinkAdmin');
  sessionStorage.removeItem('aetherinkAdminCloud');
  try {
    const mod = await import('./portfolio-cloud.js');
    await mod.adminLogout();
  } catch (_) {}
  location.reload();
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'block';
  showCategory('all');
  initAddForm();
}

let currentAdminCat = 'all';

async function showCategory(cat) {
  currentAdminCat = cat;

  // Update nav active state
  document.querySelectorAll('.admin-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.cat === cat);
  });

  const title = cat === 'all' ? 'All Items' : (CATEGORIES[cat]?.label || cat);
  document.getElementById('listTitle').textContent = title;

  // Pre-select category in form
  const select = document.getElementById('itemCategory');
  if (select && cat !== 'all') select.value = cat;

  await renderAdminList(cat);
}

async function renderAdminList(cat = 'all') {
  const list = document.getElementById('itemsList');
  const countEl = document.getElementById('listCount');
  if (!list) return;

  let items = [];
  try {
    const mod = await import('./portfolio-cloud.js');
    if (mod.isCloudReady()) {
      const cloud = await mod.fetchPortfolio(cat === 'all' ? null : cat);
      items = cloud.map(c => ({
        id: c.id,
        title: c.title,
        category: c.category,
        desc: c.description || '',
        image: c.imageUrl || '',
        emoji: c.emoji || '',
        mediaType: c.mediaType || '',
        created: c.createdAt?.toMillis?.() || 0,
        cloud: true
      }));
    }
  } catch (_) {}

  if (!items.length) {
    items = getItems();
    if (cat !== 'all') items = items.filter(i => i.category === cat);
  }

  countEl.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;

  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state" style="padding:40px"><div class="icon">📭</div><p>No items in this category yet.</p></div>`;
    return;
  }

  items.sort((a, b) => (b.created || 0) - (a.created || 0));

  const rows = await Promise.all(items.map(async item => {
    const catInfo = CATEGORIES[item.category] || { label: item.category, icon: '✨' };
    let media = null;
    if (item.cloud && item.image) media = { url: item.image, type: item.mediaType || '', name: '' };
    else media = await getItemMedia(item);
    const thumb = media ? mediaElement(media.url, media.type, item.title) : (item.emoji || catInfo.icon);
    const badge = item.cloud ? ' ☁️' : ' 💻';
    return `<div class="item-row"><div class="info"><div class="thumb">${thumb}</div><div class="meta"><h4>${escapeHTML(item.title)}${badge}</h4><span>${catInfo.label}${item.desc ? ' • ' + escapeHTML(item.desc) : ''}</span></div></div><button class="btn-danger" onclick="deleteItem('${item.id}')">Delete</button></div>`;
  }));
  list.innerHTML = rows.join('');
}

function initAddForm() {
  const form = document.getElementById('addItemForm');
  if (!form || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const title = document.getElementById('itemTitle').value.trim();
    const category = document.getElementById('itemCategory').value;
    const desc = document.getElementById('itemDesc').value.trim();
    const image = document.getElementById('itemImage').value.trim();
    const file = document.getElementById('itemFile')?.files?.[0];
    const emoji = document.getElementById('itemEmoji').value.trim() || CATEGORIES[category]?.icon || '✨';
    if (!title) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    const prev = submitBtn?.textContent;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Uploading…'; }

    try {
      // Prefer cloud when Google admin session is active
      let usedCloud = false;
      try {
        const mod = await import('./portfolio-cloud.js');
        if (mod.isCloudReady() && sessionStorage.getItem('aetherinkAdminCloud') === 'true') {
          await mod.uploadPortfolioItem({
            title,
            category,
            description: desc,
            file: file || null,
            imageUrl: image,
            emoji
          });
          usedCloud = true;
        }
      } catch (cloudErr) {
        console.warn('Cloud upload failed, falling back to local:', cloudErr);
        if (sessionStorage.getItem('aetherinkAdminCloud') === 'true') {
          alert('Cloud upload failed: ' + (cloudErr.message || cloudErr) + '\n\nSign in with Google (admin email) and check Storage/Firestore rules.');
          return;
        }
      }

      if (!usedCloud) {
        const id = generateId();
        if (file) await saveMedia(id, file);
        const items = getItems();
        items.push({ id, title, category, desc, image: file ? '' : image, mediaId: file ? id : '', emoji, created: Date.now() });
        saveItems(items);
        alert('✅ Saved on this device only (local). For LIVE site use Google admin login after Firebase setup.');
      } else {
        alert('✅ Uploaded to Firebase — live website will show this on all devices.');
      }

      form.reset();
      document.getElementById('itemCategory').value = category;
      await showCategory(currentAdminCat);
    } catch (err) {
      console.error(err);
      alert('Upload failed: ' + (err.message || err));
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = prev || '➕ Add Item'; }
    }
  });
}

async function deleteItem(id) {
  if (!confirm('Delete this item?')) return;

  // Try cloud delete first
  try {
    const mod = await import('./portfolio-cloud.js');
    if (mod.isCloudReady() && sessionStorage.getItem('aetherinkAdminCloud') === 'true') {
      const all = await mod.fetchPortfolio(null);
      const item = all.find(x => x.id === id);
      if (item) {
        await mod.deletePortfolioItem(item);
        await showCategory(currentAdminCat);
        return;
      }
    }
  } catch (err) {
    console.warn('Cloud delete failed:', err);
  }

  const oldItem = getItems().find(i => i.id === id);
  const items = getItems().filter(i => i.id !== id);
  saveItems(items);
  if (oldItem && oldItem.mediaId) await deleteMedia(oldItem.mediaId);
  showCategory(currentAdminCat);
}

// Allow Enter key on password
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('adminPassword') === document.activeElement) {
    login();
  }
});

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  renderPortfolio(document.body?.dataset?.categoryPage || 'all');
  initPortfolioLightbox();
  initFilters();
  initNavbar();
  initContactForm();
});
/* ========== Live Viewers (simulated concurrent) ========== */
function initLiveViewers() {
  const countEl = document.getElementById('liveCount');
  if (!countEl) return;

  // Track total page views
  const VIEW_KEY = 'aetherink_views';
  let total = parseInt(localStorage.getItem(VIEW_KEY) || '0', 10) + 1;
  localStorage.setItem(VIEW_KEY, total);

  // Simulated concurrent viewers (looks real, fluctuates)
  // Base on time of day + slight randomness so it feels alive
  const hour = new Date().getHours();
  let base = 3;
  if (hour >= 10 && hour <= 14) base = 7;       // midday peak
  else if (hour >= 18 && hour <= 23) base = 9;  // evening peak
  else if (hour >= 1 && hour <= 6) base = 2;    // night low

  let current = base + Math.floor(Math.random() * 4);
  countEl.textContent = current;

  // Gently fluctuate every 4–9 seconds
  function tick() {
    const delta = Math.random() > 0.55 ? 1 : -1;
    current = Math.max(1, Math.min(18, current + delta));
    // small chance of bigger jump
    if (Math.random() < 0.12) {
      current = Math.max(1, Math.min(18, current + (Math.random() > 0.5 ? 2 : -2)));
    }
    countEl.textContent = current;
    const next = 3500 + Math.random() * 5500;
    setTimeout(tick, next);
  }
  setTimeout(tick, 4000 + Math.random() * 3000);
}

/* ========== Scroll Animations ========== */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Stagger portfolio items a bit
        if (entry.target.classList.contains('portfolio-item')) {
          const items = document.querySelectorAll('.portfolio-item');
          items.forEach((item, i) => {
            item.style.transitionDelay = `${Math.min(i * 0.07, 0.5)}s`;
          });
        }
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  document.querySelectorAll('.animate-on-scroll, .portfolio-item').forEach(el => {
    observer.observe(el);
  });

  // Also observe newly rendered portfolio items later
  const grid = document.getElementById('portfolioGrid');
  if (grid) {
    const mo = new MutationObserver(() => {
      grid.querySelectorAll('.portfolio-item:not(.visible)').forEach(el => {
        observer.observe(el);
      });
    });
    mo.observe(grid, { childList: true });
  }
}


document.addEventListener('DOMContentLoaded', () => {
  // existing ones already run; we just add ours
  initLiveViewers();
  // small delay so portfolio is rendered first
  setTimeout(initScrollAnimations, 100);
});
