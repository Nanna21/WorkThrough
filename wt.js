// ==========================================
// 1. 화면 크기 조절 (드래그 리사이징) 기능
// ==========================================
const workspace = document.getElementById('workspace');
const resizerV = document.getElementById('resizer-v');
const resizerH = document.getElementById('resizer-h');
const resizerCenter = document.getElementById('resizer-center');

let isDraggingV = false;
let isDraggingH = false;
let isDraggingCenter = false;
let animationFrameId = null; // 최적화를 위한 변수

// 드래그 시작 시 차단
resizerV.addEventListener('mousedown', () => { isDraggingV = true; workspace.classList.add('is-dragging'); });
resizerH.addEventListener('mousedown', () => { isDraggingH = true; workspace.classList.add('is-dragging'); });
resizerCenter.addEventListener('mousedown', () => { isDraggingCenter = true; workspace.classList.add('is-dragging'); });

// 드래그 중 (requestAnimationFrame으로 즉각적이고 부드러운 반응 구현)
window.addEventListener('mousemove', (e) => {
    if (!isDraggingV && !isDraggingH && !isDraggingCenter) return;
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    animationFrameId = requestAnimationFrame(() => {
        let x = (e.clientX / window.innerWidth) * 100;
        let y = ((e.clientY - 50) / (window.innerHeight - 50)) * 100; 
        
        x = Math.max(10, Math.min(x, 90));
        y = Math.max(10, Math.min(y, 90));
        
        if (isDraggingV || isDraggingCenter) workspace.style.setProperty('--x', `${x}%`);
        if (isDraggingH || isDraggingCenter) workspace.style.setProperty('--y', `${y}%`);
    });
});

// 드래그 종료
window.addEventListener('mouseup', () => {
    isDraggingV = false;
    isDraggingH = false;
    isDraggingCenter = false;
    workspace.classList.remove('is-dragging');
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
});

// ==========================================
// 2. 레이아웃 변경 기능 (2, 3, 4분할)
// ==========================================
function changeLayout(layoutClass) {
    workspace.classList.remove('layout-2', 'layout-3', 'layout-4');
    workspace.classList.add(layoutClass);
    
    workspace.style.setProperty('--x', '50%');
    workspace.style.setProperty('--y', '50%');
}

// ==========================================
// 3. 강력한 Embed URL 자동 변환기
// ==========================================
function autoConvertEmbed(inputUrl) {
    try {
        const url = new URL(inputUrl);

        if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
            let videoId = '';
            if (url.hostname.includes('youtu.be')) {
                videoId = url.pathname.slice(1);
            } else if (url.pathname.includes('/shorts/')) {
                videoId = url.pathname.split('/')[2];
            } else {
                videoId = url.searchParams.get('v');
            }

            if (videoId) {
                const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
                
                // 유튜브 자동 생성 라디오(RD 믹스) 필터링
                if (url.searchParams.has('list')) {
                    const listId = url.searchParams.get('list');
                    if (!listId.startsWith('RD')) embedUrl.searchParams.set('list', listId);
                }
                if (url.searchParams.has('t')) {
                    const time = parseInt(url.searchParams.get('t'));
                    if (!isNaN(time)) embedUrl.searchParams.set('start', time);
                }
                return embedUrl.toString();
            }
        }

        if (url.hostname.includes('figma.com')) return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(inputUrl)}`;
        if (url.hostname.includes('docs.google.com')) return inputUrl.replace(/\/edit.*$/, '/preview');
        if (url.hostname.includes('codepen.io') && url.pathname.includes('/pen/')) return inputUrl.replace('/pen/', '/embed/') + '?default-tab=result';

        return inputUrl;
    } catch (error) {
        return inputUrl;
    }
}

// ==========================================
// 4. 주소 불러오기 버튼 로직
// ==========================================
function loadUrl(buttonElement) {
    const overlay = buttonElement.closest('.url-overlay');
    const iframe = overlay.parentElement.querySelector('iframe');
    let url = overlay.querySelector('input').value.trim();

    if (!url) { alert("주소를 입력해주세요!"); return; }
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;

    iframe.src = autoConvertEmbed(url);
    overlay.style.display = 'none';
}

// ==========================================
// 5. 위젯 드래그 앤 드롭 기능 및 데이터
// ==========================================
const widgets = document.querySelectorAll('.draggable-widget');
const panes = document.querySelectorAll('.pane');

// 프리셋 주소 모음
const presetUrls = {
    'map': 'https://www.openstreetmap.org/export/embed.html?bbox=126.96%2C37.55%2C126.99%2C37.58&layer=mapnik', 
    'chart': 'https://s.tradingview.com/widgetembed/?symbol=NASDAQ%3AAAPL', 
    'codepen': 'https://codepen.io/chriscoyier/embed/gfdDu?default-tab=result', 
    'jsfiddle': 'https://jsfiddle.net/',
    'stopwatch': 'https://stopwatch-app.com/widget/stopwatch?theme=light&color=indigo',
    'photopea': 'https://www.photopea.com/', 
    'excalidraw': 'https://excalidraw.com/', 
    'stackblitz': 'https://stackblitz.com/edit/web-platform?embed=1&hideNavigation=1',
    'timer': 'https://stopwatch-app.com/widget/timer?theme=light'
};

// 위젯 드래그 시작 이벤트
widgets.forEach(widget => {
    widget.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', widget.dataset.type);
        workspace.classList.add('is-dragging-widget'); 
    });
    widget.addEventListener('dragend', () => {
        workspace.classList.remove('is-dragging-widget');
    });
});

// 화면(Pane) 드롭 이벤트
panes.forEach(pane => {
    pane.addEventListener('dragover', (e) => {
        e.preventDefault(); 
        pane.classList.add('drag-over');
    });

    pane.addEventListener('dragleave', () => {
        pane.classList.remove('drag-over');
    });

    pane.addEventListener('drop', (e) => {
        e.preventDefault();
        pane.classList.remove('drag-over');
        
        const type = e.dataTransfer.getData('text/plain');
        
        if (presetUrls[type]) {
            const iframe = pane.querySelector('iframe');
            const overlay = pane.querySelector('.url-overlay');
            
            iframe.src = presetUrls[type];
            if (overlay) overlay.style.display = 'none';
        }
    });
});

// ==========================================
// 🔥 6. 개별 화면 컨트롤 (새로고침 & 주소 변경)
// ==========================================

// 현재 화면만 새로고침
function refreshPane(buttonElement) {
    const pane = buttonElement.closest('.pane');
    const iframe = pane.querySelector('iframe');
    
    const currentSrc = iframe.src;
    // 주소가 비어있지 않다면 동일한 주소를 덮어씌워 강제 새로고침
    if (currentSrc && currentSrc !== 'about:blank' && currentSrc !== window.location.href) {
        iframe.src = currentSrc;
    }
}

// 현재 화면 초기화 및 다른 주소 입력창 띄우기
function resetPane(buttonElement) {
    const pane = buttonElement.closest('.pane');
    const iframe = pane.querySelector('iframe');
    const overlay = pane.querySelector('.url-overlay');
    
    // 재생 중인 소리나 영상 등을 완전히 끄기 위해 빈 값 할당
    iframe.src = '';
    // 주소 입력 덮개 다시 보이기
    if (overlay) {
        overlay.style.display = 'flex';
        // 이전에 적혀있던 주소창 비우기
        const input = overlay.querySelector('input');
        if (input) input.value = '';
    }
}