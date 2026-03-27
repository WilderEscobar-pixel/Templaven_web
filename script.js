/* =========================================================
   Templaven — Main Script v2
   Scroll-Scrub Hero · Flip Cards · File Upload · Form → WA
   ========================================================= */

'use strict';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ──────────────────────────────────────────────────────────
//  1. SCROLL-SCRUB HERO (Canvas Frame Sequence)
// ──────────────────────────────────────────────────────────
(async function initHeroScrub() {
    const canvas      = $('#hero-canvas');
    const errorBanner = $('#hero-manifest-error');
    const scrollTrack = $('#hero-scroll-track');
    if (!canvas || !scrollTrack) return;

    const ctx = canvas.getContext('2d');

    // A) Load manifest
    let framePaths = [];
    try {
        const res = await fetch('frames/manifest.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        framePaths = await res.json();
        if (!Array.isArray(framePaths) || framePaths.length === 0) throw new Error('Empty manifest');
    } catch (err) {
        console.warn('[Hero] Manifest error:', err);
        if (errorBanner) errorBanner.style.display = 'flex';
        scrollTrack.style.height = '100vh';
        return;
    }

    const TOTAL = framePaths.length;
    const scrollMultiplier = Math.min(Math.max(TOTAL / 30, 3), 8);
    scrollTrack.style.height = `${scrollMultiplier * 100}vh`;

    // B) Canvas sizing
    const resize = () => {
        canvas.width  = canvas.clientWidth  * devicePixelRatio;
        canvas.height = canvas.clientHeight * devicePixelRatio;
        ctx.scale(devicePixelRatio, devicePixelRatio);
        if (images[currentIndex]?.complete) drawFrame(currentIndex);
    };
    window.addEventListener('resize', resize);

    // C) Cover draw
    function drawFrame(index) {
        const img = images[index];
        if (!img?.complete || !img.naturalWidth) return;
        const cw = canvas.clientWidth, ch = canvas.clientHeight;
        const ratio = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
        const dw = img.naturalWidth * ratio, dh = img.naturalHeight * ratio;
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }

    const images = new Array(TOTAL);
    let loadedCount = 0, currentIndex = 0;

    function loadRange(start, end) {
        for (let i = start; i < Math.min(end, TOTAL); i++) {
            if (images[i]) continue;
            const img = new Image();
            img.src = framePaths[i];
            img.onload = () => { loadedCount++; if (i === currentIndex) drawFrame(i); };
            images[i] = img;
        }
    }
    loadRange(0, Math.min(30, TOTAL));
    (window.requestIdleCallback || (fn => setTimeout(fn, 500)))(() => loadRange(30, TOTAL));

    let target = 0;
    function onScroll() {
        const trackTop   = scrollTrack.getBoundingClientRect().top + scrollY;
        const scrollable = scrollTrack.offsetHeight - innerHeight;
        const progress   = Math.min(Math.max((scrollY - trackTop) / scrollable, 0), 1);
        target = Math.round(progress * (TOTAL - 1));
    }
    function renderLoop() {
        requestAnimationFrame(renderLoop);
        if (target === currentIndex) return;
        currentIndex = target;
        drawFrame(currentIndex);
        loadRange(currentIndex + 1, currentIndex + 20);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); resize(); renderLoop();
})();


// ──────────────────────────────────────────────────────────
//  2. STICKY HEADER
// ──────────────────────────────────────────────────────────
const header = $('header');
if (header) {
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', scrollY > 50);
    }, { passive: true });
}


// ──────────────────────────────────────────────────────────
//  3. FADE-IN-UP ANIMATIONS
// ──────────────────────────────────────────────────────────
const fadeObs = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        setTimeout(() => el.classList.add('visible'), +(el.dataset.delay || 0));
        obs.unobserve(el);
    });
}, { threshold: 0.12 });
$$('.fade-in-up').forEach(el => fadeObs.observe(el));


// ──────────────────────────────────────────────────────────
//  4. ANIMATED COUNTERS
// ──────────────────────────────────────────────────────────
function countUp(el, target, duration = 2000) {
    const start = performance.now();
    const isLarge = target >= 1000;
    (function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - (1 - p) ** 3;
        const v = Math.round(target * eased);
        if (isLarge)         el.textContent = '+' + Math.round(v / 1000) + 'K';
        else if (target === 100) el.textContent = v + '%';
        else if (target === 5)   el.textContent = v + 'x';
        else                     el.textContent = '+' + v;
        if (p < 1) requestAnimationFrame(tick);
    })(start);
}
const cntObs = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const numEl = entry.target.querySelector('h3');
        const t = parseInt(numEl.dataset.target, 10);
        if (!isNaN(t)) countUp(numEl, t);
        obs.unobserve(entry.target);
    });
}, { threshold: 0.4 });
$$('.counter-box').forEach(b => cntObs.observe(b));


// ──────────────────────────────────────────────────────────
//  5. FLIP CARDS — touch support
// ──────────────────────────────────────────────────────────
$$('.flip-card').forEach(card => {
    card.addEventListener('click', () => {
        // Only toggle on touch/mobile (CSS hover handles desktop)
        if (window.matchMedia('(hover: none)').matches) {
            card.classList.toggle('flipped');
        }
    });
});


// ──────────────────────────────────────────────────────────
//  6. SELECTOR BUTTONS (AI Simulator panels)
// ──────────────────────────────────────────────────────────
$$('.btn-group').forEach(group => {
    $$('.btn-select', group).forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.btn-select', group).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
});


// ──────────────────────────────────────────────────────────
//  7. AI SIMULATOR — Real File Picker + Drag & Drop
// ──────────────────────────────────────────────────────────
const uploadZone  = $('#upload-zone');
const fileInput   = $('#file-input');
const browseLink  = $('#browse-link');
const resultMock  = $('#result-mockup');

function triggerSim(file) {
    if (!resultMock) return;
    uploadZone.classList.remove('dragover');

    // Get selected parameters for the AI PROMPT
    const typeBtn   = $('.selector-group:nth-of-type(2) .btn-select.active')?.textContent || 'glass structure';
    const finishBtn = $('.selector-group:nth-of-type(3) .btn-select.active')?.textContent || 'clear';
    
    // AI Inspiration prompt engineering
    const aiPrompt = `Luxury modern architectural photo of ${typeBtn} made of ${finishBtn} tempered glass, high resolution, 8k, photorealistic, minimal design, templaven style, sharp reflections, hyper-detailed`;
    const seed = Math.floor(Math.random() * 10000);
    const aiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(aiPrompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;

    // Show loading
    resultMock.style.display = 'flex';
    resultMock.classList.add('loading');
    resultMock.style.backgroundImage = '';
    resultMock.innerHTML = `
        <div style="text-align:center; padding:20px;">
            <div class="loader"></div>
            <p style="margin-top:15px; font-size:.85rem; color:#fff; text-shadow:0 2px 4px #000;">
                ✨ IA Generando Realismo...<br>
                <span style="color:#aaa; font-size:.75rem">Creando diseño de ${typeBtn.toLowerCase()} (${finishBtn.toLowerCase()})</span>
            </p>
        </div>`;

    // PRE-FETCH the AI image to ensure crossfade
    const imgObj = new Image();
    imgObj.src = aiUrl;
    
    imgObj.onload = () => {
        // Let user see the loading for at least 2sec for "premium" effect
        setTimeout(() => {
            resultMock.classList.remove('loading');
            resultMock.style.backgroundImage = `url('${aiUrl}')`;
            resultMock.style.backgroundSize  = 'cover';
            resultMock.style.backgroundPosition = 'center';
            resultMock.innerHTML = `
                <div style="position:absolute; bottom:0; left:0; right:0; padding:25px;
                     background:linear-gradient(transparent, rgba(5,15,30,0.95)); text-align:center;">
                    <p style="font-size:.85rem; color:#fff; margin-bottom:12px; font-weight:500;">
                         Instalación ${typeBtn} (${finishBtn}) — Diseño IA Templaven
                    </p>
                    <div style="display:flex; justify-content:center; gap:10px;">
                        <a href="https://wa.me/584245891620?text=Hola%20Templaven%2C%20me%20encantó%20el%20diseño%20de%20${typeBtn}%20${finishBtn}%20que%20vi%20en%20su%20web" 
                           class="btn btn-primary" style="font-size:.75rem; padding:8px 15px;" 
                           target="_blank">
                            <i class="fa-brands fa-whatsapp"></i> Cotizar este Estilo
                        </a>
                        <button onclick="document.getElementById('file-input').click()" 
                                style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); 
                                padding:8px 15px; border-radius:30px; color:#fff; font-size:.75rem; cursor:pointer;">
                            Subir mi foto
                        </button>
                    </div>
                </div>`;
            resultMock.style.display = 'flex';
        }, 2500);
    };

    imgObj.onerror = () => {
        resultMock.innerHTML = `<p style="color:red">Error al conectar con la IA. Intenta de nuevo.</p>`;
    };
}

if (uploadZone) {
    // Drag-over visual
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));

    // Drop
    uploadZone.addEventListener('drop', e => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) triggerSim(file);
    });

    // Click on zone → open file picker
    uploadZone.addEventListener('click', e => {
        if (e.target.closest('a')) return; // don't trigger when clicking inner buttons
        fileInput?.click();
    });

    // Browse link
    browseLink?.addEventListener('click', e => { e.stopPropagation(); fileInput?.click(); });

    // File input change
    fileInput?.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) triggerSim(file);
    });
}


// ──────────────────────────────────────────────────────────
//  8. CONTACT FORM → WhatsApp
// ──────────────────────────────────────────────────────────
window.handleFormSubmit = function(e) {
    e.preventDefault();
    const name = $('#form-name')?.value || '';
    const tel  = $('#form-tel')?.value  || '';
    const type = $('#form-type')?.value || 'Consulta general';
    const msg  = $('#form-msg')?.value  || '';

    const text = encodeURIComponent(
        `Hola Templaven 👋\n` +
        `*Nombre:* ${name}\n` +
        `*Teléfono:* ${tel}\n` +
        `*Proyecto:* ${type}\n` +
        `*Detalles:* ${msg}`
    );
    window.open(`https://wa.me/584245891620?text=${text}`, '_blank');
};
