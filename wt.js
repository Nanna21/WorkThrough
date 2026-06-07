/* ==========================================
   1. 전역 변수 및 상태 관리
========================================== */
const workspace = document.getElementById('workspace');
const resizerV = document.getElementById('resizer-v');
const resizerH = document.getElementById('resizer-h');
const resizerCenter = document.getElementById('resizer-center');

let isDraggingV = false; let isDraggingH = false; let isDraggingCenter = false;
let animationFrameId = null;
let hoveredPane = null;
let draggedWidgetType = null;
const CLOSE_THRESHOLD = 15;

const presetUrls = {
    'map': 'https://www.openstreetmap.org/export/embed.html?bbox=126.96%2C37.55%2C126.99%2C37.58&layer=mapnik',
    'chart': 'https://s.tradingview.com/widgetembed/?symbol=NASDAQ%3AAAPL',
    'excalidraw': 'https://excalidraw.com/',
    'photopea': 'https://www.photopea.com/',
    'codepen': 'https://codepen.io/chriscoyier/embed/gfdDu?default-tab=result',
    'jsfiddle': 'https://jsfiddle.net/',
    'stackblitz': 'https://stackblitz.com/edit/web-platform?embed=1&hideNavigation=1',
    'stopwatch': 'https://stopwatch-app.com/widget/stopwatch?theme=light&color=indigo',
    'timer': 'https://stopwatch-app.com/widget/timer?theme=light'
    
};

/* ==========================================
   2. 초기화 (DOM Ready) 및 자동 저장/복구 (State Load)
========================================== */
document.addEventListener("DOMContentLoaded", () => {
    if (typeof checkAuth === 'function' && !checkAuth()) return;

    initResizers();
    initLayoutDropdowns();
    initDraggableWidgets();
    initPanes();
    initDarkTheme();
    initClipboardAndInputs();
    initWidgetBarScroll();
    initGlobalShortcuts();
    initThemePicker();
    loadWorkspaceState();
});

function handleLogout() {
    alert("로그아웃 되었습니다.");
    sessionStorage.clear();
    location.href = 'wtLogin.html';
}

function saveWorkspaceState() {
    const panes = document.querySelectorAll('.pane');
    const paneData = [];
    
    panes.forEach(pane => {
        const title = pane.querySelector('.pane-title').textContent;
        const iframeSrc = pane.querySelector('iframe').src;
        const hasCustom = pane.classList.contains('has-custom-widget');
        const customType = hasCustom ? (pane.querySelector('.cw-title').textContent.includes('스톱워치') ? 'custom-stopwatch' : 'custom-timer') : null;
        
        const posClass = ['tl', 'tr', 'bl', 'br'].find(c => pane.classList.contains(c));

        paneData.push({ posClass, title, iframeSrc, hasCustom, customType });
    });

    const state = {
        layout: ['layout-4', 'layout-3', 'layout-2-h', 'layout-2-v'].find(c => workspace.classList.contains(c)) || 'layout-4',
        x: document.documentElement.style.getPropertyValue('--x') || '50%',
        y: document.documentElement.style.getPropertyValue('--y') || '50%',
        dockHidden: document.getElementById('widget-container').classList.contains('collapsed'),
        panes: paneData
    };
    localStorage.setItem('workspaceState', JSON.stringify(state));
}

function loadWorkspaceState() {
    const saved = localStorage.getItem('workspaceState');
    if (!saved) return;
    
    const state = JSON.parse(saved);
    
    changeLayout(state.layout);
    document.documentElement.style.setProperty('--x', state.x);
    document.documentElement.style.setProperty('--y', state.y);

    if (state.dockHidden) {
        document.getElementById('widget-container').classList.add('collapsed');
    }

    const currentPanes = Array.from(document.querySelectorAll('.pane'));
    
    state.panes.forEach(data => {
        const pane = currentPanes.find(p => p.classList.contains(data.posClass));
        if (!pane) return;

        pane.querySelector('.pane-title').textContent = data.title;

        if (data.hasCustom && data.customType) {
            handleWidgetDrop(pane, data.customType);
        } else if (data.iframeSrc && data.iframeSrc !== 'about:blank' && data.iframeSrc !== window.location.href) {
            pane.querySelector('iframe').src = data.iframeSrc;
            const overlay = pane.querySelector('.url-overlay');
            if (overlay) overlay.style.display = 'none';
        }
    });
}

/* ==========================================
   3. 화면 크기 조절 (드래그 리사이징)
========================================== */
function initResizers() {
    if (!resizerV || !resizerH || !resizerCenter) return;

    resizerV.addEventListener('mousedown', () => { isDraggingV = true; workspace.classList.add('is-dragging'); });
    resizerH.addEventListener('mousedown', () => { isDraggingH = true; workspace.classList.add('is-dragging'); });
    resizerCenter.addEventListener('mousedown', () => { isDraggingCenter = true; workspace.classList.add('is-dragging'); });

    resizerV.addEventListener('dblclick', () => { resetRatio('v'); saveWorkspaceState(); });
    resizerH.addEventListener('dblclick', () => { resetRatio('h'); saveWorkspaceState(); });
    resizerCenter.addEventListener('dblclick', () => { resetRatio('all'); saveWorkspaceState(); });

    window.addEventListener('mousemove', (e) => {
        if (!isDraggingV && !isDraggingH && !isDraggingCenter) return;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        animationFrameId = requestAnimationFrame(() => {
            const rect = workspace.getBoundingClientRect();
            let x = ((e.clientX - rect.left) / rect.width) * 100;
            let y = ((e.clientY - rect.top) / rect.height) * 100;

            x = Math.max(5, Math.min(x, 95));
            y = Math.max(5, Math.min(y, 95));

            if (isDraggingV || isDraggingCenter) document.documentElement.style.setProperty('--x', `${x}%`);
            if (isDraggingH || isDraggingCenter) document.documentElement.style.setProperty('--y', `${y}%`);

            if (workspace.classList.contains('layout-2-v')) {
                if (x < CLOSE_THRESHOLD) document.documentElement.style.setProperty('--x', '0%');
                if (x > (100 - CLOSE_THRESHOLD)) document.documentElement.style.setProperty('--x', '100%');
            }
            else if (workspace.classList.contains('layout-2-h')) {
                if (y < CLOSE_THRESHOLD) document.documentElement.style.setProperty('--y', '0%');
                if (y > (100 - CLOSE_THRESHOLD)) document.documentElement.style.setProperty('--y', '100%');
            }
            else if (workspace.classList.contains('layout-4') || workspace.classList.contains('layout-3')) {
                const isLeftClosed = x < CLOSE_THRESHOLD; const isRightClosed = x > (100 - CLOSE_THRESHOLD);
                const isTopClosed = y < CLOSE_THRESHOLD; const isBottomClosed = y > (100 - CLOSE_THRESHOLD);

                const tl = workspace.querySelector('.tl'), tr = workspace.querySelector('.tr'), bl = workspace.querySelector('.bl'), br = workspace.querySelector('.br');
                if (tl) tl.classList.toggle('hidden', isLeftClosed || isTopClosed);
                if (tr) tr.classList.toggle('hidden', isRightClosed || isTopClosed);
                if (bl) bl.classList.toggle('hidden', isLeftClosed || isBottomClosed || workspace.classList.contains('layout-3'));
                if (br) br.classList.toggle('hidden', isRightClosed || isBottomClosed);

                resizerV.style.display = (isLeftClosed || isRightClosed) ? 'none' : 'block';
                resizerH.style.display = (isTopClosed || isBottomClosed) ? 'none' : 'block';
                resizerCenter.style.display = (isLeftClosed || isRightClosed || isTopClosed || isBottomClosed) ? 'none' : 'block';

                if (isLeftClosed) document.documentElement.style.setProperty('--x', '0%');
                if (isRightClosed) document.documentElement.style.setProperty('--x', '100%');
                if (isTopClosed) document.documentElement.style.setProperty('--y', '0%');
                if (isBottomClosed) document.documentElement.style.setProperty('--y', '100%');
            }
        });
    });

    window.addEventListener('mouseup', () => {
        if (isDraggingV || isDraggingH || isDraggingCenter) {
            isDraggingV = false; isDraggingH = false; isDraggingCenter = false;
            workspace.classList.remove('is-dragging');
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            saveWorkspaceState();
        }
    });
}

function resetRatio(type) {
    if (type === 'v' || type === 'all') document.documentElement.style.setProperty('--x', '50%');
    if (type === 'h' || type === 'all') document.documentElement.style.setProperty('--y', '50%');
}

/* ==========================================
   4. 레이아웃 제어 및 드롭다운
========================================== */
function changeLayout(layoutClass) {
    const panes = workspace.querySelectorAll('.pane');
    panes.forEach(pane => pane.classList.remove('hidden'));
    
    if(resizerV) resizerV.style.display = 'block';
    if(resizerH) resizerH.style.display = 'block';
    if(resizerCenter) resizerCenter.style.display = 'block';

    workspace.classList.remove('layout-2', 'layout-3', 'layout-4', 'layout-2-v', 'layout-2-h');
    workspace.classList.add(layoutClass);

    if (layoutClass === 'layout-2-v') {
        const bl = workspace.querySelector('.bl'); if (bl) bl.classList.add('hidden');
        const br = workspace.querySelector('.br'); if (br) br.classList.add('hidden');
    } else if (layoutClass === 'layout-2-h') {
        const tr = workspace.querySelector('.tr'); if (tr) tr.classList.add('hidden');
        const br = workspace.querySelector('.br'); if (br) br.classList.add('hidden');
    } else if (layoutClass === 'layout-3') {
        const bl = workspace.querySelector('.bl'); if (bl) bl.classList.add('hidden');
    }

    document.documentElement.style.setProperty('--x', '50%');
    document.documentElement.style.setProperty('--y', '50%');
    closeAllDropdowns();
    saveWorkspaceState();
}

function initLayoutDropdowns() {
    window.addEventListener('click', (e) => {
        if (!e.target.matches('.dropdown-btn') && !e.target.closest('.dropdown-menu')) {
            closeAllDropdowns('dropdown-2pane');
        }
        if (!e.target.matches('.shortcut-help-btn') && !e.target.closest('.shortcut-help-menu')) {
            closeAllDropdowns('shortcut-help-menu');
        }
    });
}

function toggleDropdown(event) { event.stopPropagation(); closeAllDropdowns('dropdown-2pane'); document.getElementById('dropdown-2pane').classList.toggle('show'); }
function toggleShortcutHelp(event) { event.stopPropagation(); closeAllDropdowns('shortcut-help-menu'); document.getElementById('shortcut-help-menu').classList.toggle('show'); }
function closeAllDropdowns(exceptId = '') {
    if (exceptId !== 'dropdown-2pane') { const d = document.getElementById('dropdown-2pane'); if (d) d.classList.remove('show'); }
    if (exceptId !== 'shortcut-help-menu') { const s = document.getElementById('shortcut-help-menu'); if (s) s.classList.remove('show'); }
}

function toggleWidgetDock() {
    const dock = document.getElementById('widget-container');
    dock.classList.toggle('collapsed');
    saveWorkspaceState();
}

/* ==========================================
   5. Embed URL 자동 변환기
========================================== */
function autoConvertEmbed(inputUrl) {
    try {
        const url = new URL(inputUrl);
        if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
            let videoId = url.hostname.includes('youtu.be') ? url.pathname.slice(1) : (url.pathname.includes('/shorts/') ? url.pathname.split('/')[2] : url.searchParams.get('v'));
            if (videoId) {
                const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
                if (url.searchParams.has('list') && !url.searchParams.get('list').startsWith('RD')) embedUrl.searchParams.set('list', url.searchParams.get('list'));
                if (url.searchParams.has('t')) { const time = parseInt(url.searchParams.get('t')); if (!isNaN(time)) embedUrl.searchParams.set('start', time); }
                return embedUrl.toString();
            }
        }
        if (url.hostname.includes('figma.com')) return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(inputUrl)}`;
        if (url.hostname.includes('docs.google.com')) return inputUrl.replace(/\/edit.*$/, '/preview');
        if (url.hostname.includes('codepen.io') && url.pathname.includes('/pen/')) return inputUrl.replace('/pen/', '/embed/') + '?default-tab=result';
        return inputUrl;
    } catch (error) { return inputUrl; }
}

/* ==========================================
   6. 화면(Pane) 포커스, 이름 변경 및 화면 교환(Swap)
========================================== */
function initPanes() {
    const panes = workspace.querySelectorAll('.pane');
    panes.forEach(pane => {
        pane.addEventListener('mouseenter', () => { 
            hoveredPane = pane;
            panes.forEach(p => p.classList.remove('active-focus'));
            pane.classList.add('active-focus');
        });
        
        const titleEl = pane.querySelector('.pane-title');
        if (titleEl) {
            titleEl.addEventListener('blur', saveWorkspaceState);
            titleEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); } });
        }

        const header = pane.querySelector('.pane-header');
        if (header) {
            header.addEventListener('dragstart', (e) => {
                const posClass = ['tl', 'tr', 'bl', 'br'].find(c => pane.classList.contains(c));
                e.dataTransfer.setData('application/pane-swap', posClass);
                workspace.classList.add('is-dragging-widget');
            });
            header.addEventListener('dragend', () => workspace.classList.remove('is-dragging-widget'));
        }

        pane.addEventListener('dragover', (e) => { e.preventDefault(); pane.classList.add('drag-over'); });
        pane.addEventListener('dragleave', () => pane.classList.remove('drag-over'));
        pane.addEventListener('drop', (e) => {
            e.preventDefault();
            pane.classList.remove('drag-over');
            
            const swapSourceClass = e.dataTransfer.getData('application/pane-swap');
            if (swapSourceClass) {
                const sourcePane = workspace.querySelector('.' + swapSourceClass);
                const targetClass = ['tl', 'tr', 'bl', 'br'].find(c => pane.classList.contains(c));
                
                if (sourcePane && sourcePane !== pane) {
                    sourcePane.classList.remove(swapSourceClass);
                    sourcePane.classList.add(targetClass);
                    pane.classList.remove(targetClass);
                    pane.classList.add(swapSourceClass);
                    saveWorkspaceState();
                }
                return;
            }

            const type = e.dataTransfer.getData('text/plain') || draggedWidgetType;
            if (type) handleWidgetDrop(pane, type);
        });
    });
}

function initDraggableWidgets() {
    const widgets = document.querySelectorAll('.draggable-widget');
    widgets.forEach(widget => {
        widget.addEventListener('dragstart', (e) => {
            draggedWidgetType = widget.getAttribute('data-type');
            workspace.classList.add('is-dragging-widget');
            e.dataTransfer.setData('text/plain', draggedWidgetType);
        });
        widget.addEventListener('dragend', () => { workspace.classList.remove('is-dragging-widget'); draggedWidgetType = null; });
    });
}

function handleWidgetDrop(paneElement, widgetType) {
    if (paneElement.customInterval) { clearInterval(paneElement.customInterval); paneElement.customInterval = null; }
    const holder = paneElement.querySelector('.custom-widget-holder');

    if (widgetType === 'custom-stopwatch') {
        paneElement.classList.add('has-custom-widget');
        initCustomStopwatch(holder, paneElement);
    } else if (widgetType === 'custom-timer') {
        paneElement.classList.add('has-custom-widget');
        initCustomTimer(holder, paneElement);
    } else {
        paneElement.classList.remove('has-custom-widget');
        if (holder) holder.innerHTML = '';
        const url = presetUrls[widgetType];
        if (url) {
            paneElement.querySelector('iframe').src = autoConvertEmbed(url);
            const overlay = paneElement.querySelector('.url-overlay');
            if (overlay) overlay.style.display = 'none';
        }
    }
    saveWorkspaceState();
}

/* ==========================================
   7. 개별 분할 Pane 내부 컨트롤러
========================================== */
function loadUrl(buttonElement) {
    const overlay = buttonElement.closest('.url-overlay');
    const iframe = overlay.parentElement.querySelector('iframe');
    let url = overlay.querySelector('input').value.trim();

    if (!url) { alert("주소를 입력해주세요!"); return; }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    iframe.src = autoConvertEmbed(url);
    overlay.style.display = 'none';
    saveWorkspaceState();
}

function openPip(buttonElement) {
    const pane = buttonElement.closest('.pane');
    const iframe = pane.querySelector('iframe');
    
    if (pane.classList.contains('has-custom-widget')) {
        alert("맞춤형 내장 위젯은 새 창으로 띄울 수 없습니다.");
        return;
    }

    const src = iframe.src;
    if (src && src !== 'about:blank' && src !== window.location.href) {
        window.open(src, '_blank', 'width=800,height=600,menubar=no,toolbar=no');
    } else {
        alert("열려있는 주소가 없습니다.");
    }
}

function refreshPane(buttonElement) {
    const pane = buttonElement.closest('.pane');
    if (pane.classList.contains('has-custom-widget')) {
        const holder = pane.querySelector('.custom-widget-holder');
        const isStopwatch = holder.querySelector('.cw-title').textContent.includes('스톱워치');
        if (pane.customInterval) clearInterval(pane.customInterval);
        if (isStopwatch) initCustomStopwatch(holder, pane); else initCustomTimer(holder, pane);
        return;
    }
    const iframe = pane.querySelector('iframe');
    if (iframe && iframe.src !== 'about:blank') {
        const currentSrc = iframe.src;
        iframe.src = 'about:blank';
        setTimeout(() => { iframe.src = currentSrc; }, 50);
    }
}

function resetPane(buttonElement) {
    const pane = buttonElement.closest('.pane');
    pane.classList.remove('has-custom-widget');
    if (pane.customInterval) { clearInterval(pane.customInterval); pane.customInterval = null; }
    
    const holder = pane.querySelector('.custom-widget-holder');
    if (holder) holder.innerHTML = '';
    
    const iframe = pane.querySelector('iframe');
    if (iframe) iframe.src = 'about:blank';
    
    const overlay = pane.querySelector('.url-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        const input = overlay.querySelector('input');
        if (input) { input.value = ''; setTimeout(() => input.focus(), 50); }
    }
    saveWorkspaceState();
}

/* ==========================================
   8. 클립보드 입력 및 가로 휠 제어
========================================== */
function initClipboardAndInputs() {
    const inputs = document.querySelectorAll('.input-group input');
    inputs.forEach(input => {
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (input.value.trim() === '') {
                    try {
                        const clipboardText = await navigator.clipboard.readText();
                        if (clipboardText.trim()) input.value = clipboardText.trim();
                        else return alert("클립보드가 비어있거나 텍스트가 아닙니다!");
                    } catch (err) { return alert("클립보드 접근 권한이 거부되었습니다."); }
                }
                const loadButton = input.parentElement.querySelector('button');
                if (loadButton) loadButton.click();
            }
        });
    });
}

function initWidgetBarScroll() {
    const widgetBar = document.getElementById('widget-container');
    if (widgetBar) widgetBar.addEventListener('wheel', (e) => { e.preventDefault(); widgetBar.scrollLeft += e.deltaY; }, { passive: false });
}

/* ==========================================
   9. 전역 단축키 (Shortcut)
========================================== */
function initGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
        const isCtrlMeta = e.ctrlKey || e.metaKey;
        if (isCtrlMeta && e.code === 'Space') {
            e.preventDefault();
            document.body.classList.toggle('zen-mode');
        }
        if (isCtrlMeta && !e.shiftKey) {
            if (e.key === '1') { e.preventDefault(); changeLayout('layout-2-v'); }
            if (e.key === '2') { e.preventDefault(); changeLayout('layout-3'); }
            if (e.key === '3') { e.preventDefault(); changeLayout('layout-4'); }
        }
        if (hoveredPane) {
            if (e.key === 'Escape') {
                e.preventDefault();
                const resetBtn = hoveredPane.querySelector('.pane-controls button[title="주소 초기화"]');
                if (resetBtn) resetBtn.click();
            }
            if (isCtrlMeta && e.key.toLowerCase() === 'r') {
                e.preventDefault();
                const refreshBtn = hoveredPane.querySelector('.pane-controls button[title="새로고침"]');
                if (refreshBtn) refreshBtn.click();
            }
        }
    });
}

/* ==========================================
   10. 테마 관리 (다크모드)
========================================== */
function initDarkTheme() {
    const controlsBar = document.querySelector(".controls");
    if (!controlsBar) return;
    
    let themeBtn = document.createElement("button");
    themeBtn.className = "dark-toggle-btn";
    themeBtn.setAttribute("title", "다크모드 전환");
    controlsBar.appendChild(themeBtn);

    const updateBtn = () => {
        const isDark = document.body.classList.contains('dark-mode');
        themeBtn.innerText = isDark ? "☀️" : "🌙";
    };

    if (localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark-mode");
    }
    updateBtn();

    themeBtn.addEventListener("click", () => {
        const hasDark = document.body.classList.toggle("dark-mode");
        localStorage.setItem("darkMode", hasDark);
        updateBtn();
    });
}

/* ==========================================
   11. 맞춤형 내장 엔진 (타이머/스톱워치)
========================================== */
function initCustomStopwatch(holder, pane) {
    if (!holder) return;
    holder.innerHTML = `
        <div class="cw-container">
            <div class="cw-title">⏱️ 내장 맞춤형 스톱워치</div>
            <div class="cw-display">00:00.00</div>
            <div class="cw-controls"><button class="cw-btn start">시작</button><button class="cw-btn stop" style="display:none;">정지</button><button class="cw-btn reset">초기화</button></div>
        </div>
    `;
    const display = holder.querySelector('.cw-display'); const startBtn = holder.querySelector('.cw-btn.start'); const stopBtn = holder.querySelector('.cw-btn.stop'); const resetBtn = holder.querySelector('.cw-btn.reset');
    let startTime = 0; let elapsedTime = 0;

    function updateTime() {
        const diff = Date.now() - startTime + elapsedTime;
        display.textContent = `${String(Math.floor(diff / 60000)).padStart(2, '0')}:${String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')}.${String(Math.floor((diff % 1000) / 10)).padStart(2, '0')}`;
    }

    startBtn.onclick = () => { startTime = Date.now(); pane.customInterval = setInterval(updateTime, 10); startBtn.style.display = 'none'; stopBtn.style.display = 'inline-block'; };
    stopBtn.onclick = () => { clearInterval(pane.customInterval); elapsedTime += Date.now() - startTime; stopBtn.style.display = 'none'; startBtn.style.display = 'inline-block'; };
    resetBtn.onclick = () => { clearInterval(pane.customInterval); elapsedTime = 0; display.textContent = "00:00.00"; stopBtn.style.display = 'none'; startBtn.style.display = 'inline-block'; };
}

function initCustomTimer(holder, pane) {
    if (!holder) return;
    holder.innerHTML = `
        <div class="cw-container">
            <div class="cw-title">⏳ 내장 맞춤형 타이머</div>
            <div class="cw-inputs"><input type="number" class="cw-input min" min="0" max="99" value="0"> 분 <input type="number" class="cw-input sec" min="0" max="59" value="0"> 초</div>
            <div class="cw-display" style="display:none;">00:00</div>
            <div class="cw-controls"><button class="cw-btn start">타이머 시작</button><button class="cw-btn stop" style="display:none;">정지</button><button class="cw-btn reset">설정 초기화</button></div>
        </div>
    `;
    const inputsDiv = holder.querySelector('.cw-inputs'); const minInput = holder.querySelector('.cw-input.min'); const secInput = holder.querySelector('.cw-input.sec'); const display = holder.querySelector('.cw-display'); const startBtn = holder.querySelector('.cw-btn.start'); const stopBtn = holder.querySelector('.cw-btn.stop'); const resetBtn = holder.querySelector('.cw-btn.reset');
    let totalSeconds = 0;

    function renderDisplay() { display.textContent = `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`; }

    startBtn.onclick = () => {
        if (startBtn.textContent === "타이머 시작") {
            totalSeconds = (parseInt(minInput.value) || 0) * 60 + (parseInt(secInput.value) || 0);
            if (totalSeconds <= 0) return alert("시간을 설정해 주세요.");
            inputsDiv.style.display = 'none'; display.style.display = 'block';
        }
        renderDisplay();
        pane.customInterval = setInterval(() => {
            if (totalSeconds <= 0) { clearInterval(pane.customInterval); display.style.color = '#ef4444'; alert("⏳ 설정하신 타이머 시간이 완료되었습니다!"); return; }
            totalSeconds--; renderDisplay();
        }, 1000);
        startBtn.style.display = 'none'; stopBtn.style.display = 'inline-block';
    };

    stopBtn.onclick = () => { clearInterval(pane.customInterval); startBtn.textContent = "재개"; stopBtn.style.display = 'none'; startBtn.style.display = 'inline-block'; };
    resetBtn.onclick = () => { clearInterval(pane.customInterval); totalSeconds = 0; minInput.value = 0; secInput.value = 0; display.style.color = ''; inputsDiv.style.display = 'flex'; display.style.display = 'none'; startBtn.textContent = "타이머 시작"; stopBtn.style.display = 'none'; startBtn.style.display = 'inline-block'; };
}
// ==========================================
// 12. 커스텀 테마 색상 (Color Picker) 관리
// ==========================================
function updateThemeColor(color) {
    document.documentElement.style.setProperty('--brand-color', color);
    localStorage.setItem('themeColor', color);
}

// 기존 initDarkTheme 함수 내부(DOMContentLoaded)에 아래 로직 추가
function initThemePicker() {
    const savedColor = localStorage.getItem('themeColor');
    const picker = document.getElementById('theme-color-picker');
    
    if (savedColor) {
        document.documentElement.style.setProperty('--brand-color', savedColor);
        if (picker) picker.value = savedColor;
    }
}
