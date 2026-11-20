Screens.gallery = {
  idx: 0,
  items: [],
  fsZoom: 1,
  fsPanX: 0,
  fsPanY: 0,

  available(){
    return DB.list('products').filter(p => (Number(p.qty) || 0) > 0);
  },

  render(el){
    this.items = this.available();
    if (this.idx >= this.items.length) this.idx = Math.max(0, this.items.length - 1);

    if (!this.items.length){
      el.innerHTML = `<button class="btn gray noprint" onclick="go('home')" style="margin-bottom:10px">⬅️ رجوع للرئيسية</button>
        <div class="box" style="text-align:center;padding:30px 16px">
          <h2>🖼️ معرض المنتجات المتاحة</h2>
          <p class="big">لا توجد منتجات متاحة حالياً في المخزون.</p>
          <button class="btn ok" onclick="go('inventory')">📦 الذهاب للمخزون</button>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div class="gallery-wrap">
        <div class="gallery-topbar">
          <button class="btn gray" style="width:auto;margin:0;padding:8px 14px" onclick="go('home')">⬅️ الرئيسية</button>
          <div class="gallery-counter" id="galCounter"></div>
          <button class="btn" style="width:auto;margin:0;padding:8px 14px" id="galFullBtn">🔍 ملء الشاشة</button>
        </div>

        <div class="gallery-stage" id="galStage">
          <button class="gal-arrow gal-prev" id="galPrev" title="السابق">❯</button>
          <div class="gal-slide" id="galSlide"></div>
          <button class="gal-arrow gal-next" id="galNext" title="التالي">❮</button>
        </div>

        <div class="gallery-edge-bar" id="galEdge"></div>

        <div class="gallery-controls">
          <button class="btn gray" style="margin:0" id="galFirst">⏮️ بداية المعرض</button>
          <button class="btn gray" style="margin:0" id="galLast">نهاية المعرض ⏭️</button>
        </div>
      </div>

      <!-- نافذة ملء الشاشة مع التكبير والتصغير -->
      <div class="gal-fullscreen hide" id="galFs">
        <div class="gal-fs-top">
          <button class="gal-fs-btn" id="fsClose">✖ إغلاق</button>
          <span class="gal-fs-title" id="fsTitle"></span>
          <div class="gal-fs-zoom-grp">
            <button class="gal-fs-btn" id="fsZoomOut">➖</button>
            <span id="fsZoomVal">100%</span>
            <button class="gal-fs-btn" id="fsZoomIn">➕</button>
            <button class="gal-fs-btn" id="fsReset">↺</button>
          </div>
        </div>

        <div class="gal-fs-viewport" id="fsViewport">
          <div class="gal-fs-content" id="fsContent"></div>
        </div>

        <div class="gal-fs-bottom">
          <button class="gal-fs-nav" id="fsPrev">❯ السابق</button>
          <div class="gal-fs-info" id="fsInfo"></div>
          <button class="gal-fs-nav" id="fsNext">التالي ❮</button>
        </div>
      </div>
    `;

    this.bindEvents(el);
    this.draw();
  },

  bindEvents(el){
    const prev = () => { if (this.idx > 0){ this.idx--; this.resetZoom(); this.draw(); } else UI.toast('أنت في بداية المعرض'); };
    const next = () => { if (this.idx < this.items.length - 1){ this.idx++; this.resetZoom(); this.draw(); } else UI.toast('أنت في نهاية المعرض'); };

    el.querySelector('#galPrev').onclick = prev;
    el.querySelector('#galNext').onclick = next;
    el.querySelector('#galFirst').onclick = () => { this.idx = 0; this.resetZoom(); this.draw(); };
    el.querySelector('#galLast').onclick = () => { this.idx = this.items.length - 1; this.resetZoom(); this.draw(); };

    // السحب لليمين واليسار باللمس في العرض العادي
    const stage = el.querySelector('#galStage');
    let startX = 0;
    stage.addEventListener('touchstart', e => {
      if (e.touches.length === 1) startX = e.touches[0].clientX;
    }, { passive: true });
    stage.addEventListener('touchend', e => {
      if (!startX) return;
      const dx = e.changedTouches[0].clientX - startX;
      startX = 0;
      if (Math.abs(dx) > 45){
        if (dx > 0) prev();
        else next();
      }
    });

    // ملء الشاشة
    const fs = el.querySelector('#galFs');
    const openFs = () => { this.resetZoom(); fs.classList.remove('hide'); this.drawFs(); };
    const closeFs = () => { fs.classList.add('hide'); this.resetZoom(); };

    el.querySelector('#galFullBtn').onclick = openFs;
    el.querySelector('#galSlide').onclick = openFs;
    el.querySelector('#fsClose').onclick = closeFs;
    el.querySelector('#fsPrev').onclick = prev;
    el.querySelector('#fsNext').onclick = next;

    el.querySelector('#fsZoomIn').onclick = () => this.setZoom(this.fsZoom + 0.4);
    el.querySelector('#fsZoomOut').onclick = () => this.setZoom(this.fsZoom - 0.4);
    el.querySelector('#fsReset').onclick = () => { this.resetZoom(); this.applyZoom(); };

    // تكبير/تصغير بالضغط المزدوج أو السحب في وضع ملء الشاشة
    const vp = el.querySelector('#fsViewport');
    let dragging = false, lastX = 0, lastY = 0, touchStartX = 0, pinchDist = 0, baseZoom = 1;

    vp.addEventListener('dblclick', () => {
      if (this.fsZoom > 1) this.resetZoom();
      else this.fsZoom = 2.2;
      this.applyZoom();
    });

    vp.addEventListener('wheel', e => {
      e.preventDefault();
      this.setZoom(this.fsZoom + (e.deltaY < 0 ? 0.25 : -0.25));
    }, { passive: false });

    vp.addEventListener('mousedown', e => {
      if (this.fsZoom <= 1) return;
      dragging = true;
      lastX = e.clientX - this.fsPanX;
      lastY = e.clientY - this.fsPanY;
    });
    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      this.fsPanX = e.clientX - lastX;
      this.fsPanY = e.clientY - lastY;
      this.applyZoom();
    });
    window.addEventListener('mouseup', () => { dragging = false; });

    vp.addEventListener('touchstart', e => {
      if (e.touches.length === 2){
        pinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        baseZoom = this.fsZoom;
      } else if (e.touches.length === 1){
        touchStartX = e.touches[0].clientX;
        lastX = e.touches[0].clientX - this.fsPanX;
        lastY = e.touches[0].clientY - this.fsPanY;
      }
    }, { passive: true });

    vp.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && pinchDist > 0){
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        this.setZoom(baseZoom * (dist / pinchDist));
      } else if (e.touches.length === 1 && this.fsZoom > 1){
        e.preventDefault();
        this.fsPanX = e.touches[0].clientX - lastX;
        this.fsPanY = e.touches[0].clientY - lastY;
        this.applyZoom();
      }
    }, { passive: false });

    vp.addEventListener('touchend', e => {
      if (e.touches.length < 2) pinchDist = 0;
      if (this.fsZoom === 1 && touchStartX && e.changedTouches.length === 1){
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 50){
          if (dx > 0) prev();
          else next();
        }
      }
      touchStartX = 0;
    });
  },

  resetZoom(){
    this.fsZoom = 1;
    this.fsPanX = 0;
    this.fsPanY = 0;
  },

  setZoom(z){
    this.fsZoom = Math.min(4, Math.max(1, Number(z.toFixed(2))));
    if (this.fsZoom === 1){
      this.fsPanX = 0;
      this.fsPanY = 0;
    }
    this.applyZoom();
  },

  applyZoom(){
    const img = document.getElementById('fsZoomImg');
    const lbl = document.getElementById('fsZoomVal');
    if (img){
      img.style.transform = `translate(${this.fsPanX}px, ${this.fsPanY}px) scale(${this.fsZoom})`;
    }
    if (lbl){
      lbl.textContent = Math.round(this.fsZoom * 100) + '%';
    }
  },

  draw(){
    const total = this.items.length;
    const p = this.items[this.idx];
    const isStart = this.idx === 0;
    const isEnd = this.idx === total - 1;

    document.getElementById('galCounter').textContent = `${this.idx + 1} من ${total}`;
    document.getElementById('galPrev').disabled = isStart;
    document.getElementById('galNext').disabled = isEnd;

    let edgeMsg = '';
    if (isStart && isEnd) edgeMsg = '📌 بداية ونهاية المعرض (صنف واحد متاح)';
    else if (isStart) edgeMsg = '🟢 بداية المعرض — اسحب لليسار أو اضغط التالي';
    else if (isEnd) edgeMsg = '🔴 نهاية المعرض — اسحب لليمين أو اضغط السابق';
    else edgeMsg = '↔️ اسحب لليمين أو اليسار للتنقل • اضغط على الصورة لملء الشاشة';
    document.getElementById('galEdge').textContent = edgeMsg;

    document.getElementById('galSlide').innerHTML = `
      <div class="gal-img-box">
        ${p.img ? `<img src="${p.img}" alt="${DB.esc(p.name)}">` : '<div class="gal-noimg">📦<br><small>لا توجد صورة</small></div>'}
      </div>
      <div class="gal-meta">
        <div class="gal-code">${DB.esc(p.code)}</div>
        <div class="gal-name">${DB.esc(p.name)}</div>
        <div class="gal-badges">
          <span class="gal-badge price">💰 السعر: ${DB.money(p.price)}</span>
          <span class="gal-badge qty">📦 المتاح: ${p.qty}</span>
        </div>
      </div>
    `;

    const fs = document.getElementById('galFs');
    if (fs && !fs.classList.contains('hide')) this.drawFs();
  },

  drawFs(){
    const total = this.items.length;
    const p = this.items[this.idx];
    const isStart = this.idx === 0;
    const isEnd = this.idx === total - 1;

    document.getElementById('fsTitle').textContent = `${p.name} (${this.idx + 1}/${total})`;
    document.getElementById('fsPrev').disabled = isStart;
    document.getElementById('fsNext').disabled = isEnd;

    let edgeTag = '';
    if (isStart && isEnd) edgeTag = ' | بداية ونهاية المعرض';
    else if (isStart) edgeTag = ' | 🟢 بداية المعرض';
    else if (isEnd) edgeTag = ' | 🔴 نهاية المعرض';

    document.getElementById('fsInfo').innerHTML = `
      <b>${DB.esc(p.name)}</b> — السعر: <span style="color:#7ef29a">${DB.money(p.price)}</span> — الكمية المتاحة: <span style="color:#ffd166">${p.qty}</span>${edgeTag}
    `;

    document.getElementById('fsContent').innerHTML = p.img
      ? `<img id="fsZoomImg" src="${p.img}" alt="${DB.esc(p.name)}">`
      : `<div id="fsZoomImg" class="gal-fs-noimg">📦<br>${DB.esc(p.name)}</div>`;

    this.applyZoom();
  }
};
