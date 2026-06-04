// ==========================================
// 1. 화면 크기 조절 (드래그 리사이징) 및 자동 숨김 기능
// ==========================================
const workspace = document.getElementById('workspace');
const resizerV = document.getElementById('resizer-v');
const resizerH = document.getElementById('resizer-h');
const resizerCenter = document.getElementById('resizer-center');

let isDraggingV = false;
let isDraggingH = false;
let isDraggingCenter = false;
let animationFrameId = null; 

// 현재 마우스가 위치한 Pane을 추적하기 위한 변수 (단축키용)
let hoveredPane = null;

// 화면이 자동으로 완전히 닫히는 임계값 설정 (15% 이하로 줄어들면 사라짐)
const CLOSE_THRESHOLD = 15; 

// 드래그 시작 시 차단
resizerV.addEventListener('mousedown', () => { isDraggingV = true; workspace.classList.add('is-dragging'); });
resizerH.addEventListener('mousedown', () => { isDraggingH = true; workspace.classList.add('is-dragging'); });
resizerCenter.addEventListener('mousedown', () => { isDraggingCenter = true; workspace.classList.add('is-dragging'); });

// 구분선 더블클릭 시 크기 배율을 50% 균등 비율로 즉시 초기화
resizerV.addEventListener('dblclick', () => workspace.style.setProperty('--x', '50%'));
resizerH.addEventListener('dblclick', () => workspace.style.setProperty('--y', '50%'));
resizerCenter.addEventListener('dblclick', () => {
    workspace.style.setProperty('--x', '50%');
    workspace.style.setProperty('--y', '50%');
});

// 드래그 중 (requestAnimationFrame으로 즉각적이고 부드러운 반응 구현)
window.addEventListener('mousemove', (e) => {
    if (!isDraggingV && !isDraggingH && !isDraggingCenter) return;
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    animationFrameId = requestAnimationFrame(() => {
        let x = (e.clientX / window.innerWidth) * 100;
        let y = ((e.clientY - 50) / (window.innerHeight - 50)) * 100; 
        
        // 경계 제한 유연화 (유연한 닫기 감지를 위해 마진폭 조정)
        x = Math.max(5, Math.min(x, 95));
        y = Math.max(5, Math.min(y, 95));
        
        if (isDraggingV || isDraggingCenter) workspace.style.setProperty('--x', `${x}%`);
        if (isDraggingH || isDraggingCenter) workspace.style.setProperty('--y', `${y}%`);

        // 레이아웃 종류별 마우스 이동 끝점 도달 제어 및 4분할 화면 자동 숨김 처리
        if (workspace.classList.contains('layout-2-v')) {
            if (x < CLOSE_THRESHOLD) workspace.style.setProperty('--x', '0%');
            if (x > (100 - CLOSE_THRESHOLD)) workspace.style.setProperty('--x', '100%');
        }
        else if (workspace.classList.contains('layout-2-h')) {
            if (y < CLOSE_THRESHOLD) workspace.style.setProperty('--y', '0%');
            if (y > (100 - CLOSE_THRESHOLD)) workspace.style.setProperty('--y', '100%');
        }
        else if (workspace.classList.contains('layout-4')) {
            const isLeftClosed = x < CLOSE_THRESHOLD;
            const isRightClosed = x > (100 - CLOSE_THRESHOLD);
            const isTopClosed = y < CLOSE_THRESHOLD;
            const isBottomClosed = y > (100 - CLOSE_THRESHOLD);

            // 축소 상태에 따라 개별 Pane 화면 노출 숨김 처리
            document.querySelector('.pane.tl').classList.toggle('hidden', isLeftClosed || isTopClosed);
            document.querySelector('.pane.tr').classList.toggle('hidden', isRightClosed || isTopClosed);
            document.querySelector('.pane.bl').classList.toggle('hidden', isLeftClosed || isBottomClosed);
            document.querySelector('.pane.br').classList.toggle('hidden', isRightClosed || isBottomClosed);
            
            // 크기 조절선(리사이저)도 연쇄적으로 숨김/복구
            resizerV.style.display = (isLeftClosed || isRightClosed) ? 'none' : 'block';
            resizerH.style.display = (isTopClosed || isBottomClosed) ? 'none' : 'block';
            resizerCenter.style.display = (isLeftClosed || isRightClosed || isTopClosed || isBottomClosed) ? 'none' : 'block';
            
            if (isLeftClosed) workspace.style.setProperty('--x', '0%');
            if (isRightClosed) workspace.style.setProperty('--x', '100%');
            if (isTopClosed) workspace.style.setProperty('--y', '0%');
            if (isBottomClosed) workspace.style.setProperty('--y', '100%');
        }
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
// 2. 레이아웃 변경 기능 (가로/세로 2분할, 3분할, 4분할)
// ==========================================
function changeLayout(layoutClass) {
    document.querySelectorAll('.pane').forEach(pane => pane.classList.remove('hidden'));
    resizerV.style.display = 'block';
    resizerH.style.display = 'block';
    resizerCenter.style.display = 'block';

    workspace.classList.remove('layout-2', 'layout-3', 'layout-4', 'layout-2-v', 'layout-2-h');
    workspace.classList.add(layoutClass);
    
    workspace.style.setProperty('--x', '50%');
    workspace.style.setProperty('--y', '50%');

    closeAllDropdowns();
}

// 2분할 하위 드롭다운 축 선택용 팝업 토글
function toggleDropdown(event) {
    event.stopPropagation(); 
    closeAllDropdowns('dropdown-2pane'); // 단축키 창 열려있으면 닫기
    const menu = document.getElementById('dropdown-2pane');
    menu.classList.toggle('show');
}

// 💥 신규 추가: 단축키 안내 팝업창 토글 함수
function toggleShortcutHelp(event) {
    event.stopPropagation();
    closeAllDropdowns('shortcut-help-menu'); // 분할 선택 창 열려있으면 닫기
    const menu = document.getElementById('shortcut-help-menu');
    menu.classList.toggle('show');
}

// 모든 레이아웃 드롭다운 메뉴 숨김 처리 (예외 허용)
function closeAllDropdowns(exceptId = '') {
    if (exceptId !== 'dropdown-2pane') document.getElementById('dropdown-2pane').classList.remove('show');
    if (exceptId !== 'shortcut-help-menu') document.getElementById('shortcut-help-menu').classList.remove('show');
}

// 드롭다운 외부의 다른 빈 곳을 클릭하면 모든 팝업 자동 닫기
window.addEventListener('click', () => {
    closeAllDropdowns();
});

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

widgets.forEach(widget => {
    widget.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', widget.dataset.type);
        workspace.classList.add('is-dragging-widget'); 
    });
    widget.addEventListener('dragend', () => {
        workspace.classList.remove('is-dragging-widget');
    });
});

panes.forEach(pane => {
    // 단축키 매핑용 마우스 위치 Pane 추적
    pane.addEventListener('mouseenter', () => { hoveredPane = pane; });
    pane.addEventListener('mouseleave', () => { if (hoveredPane === pane) hoveredPane = null; });

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
// 6. 개별 화면 컨트롤 (새로고침 & 주소 변경)
// ==========================================
function refreshPane(buttonElement) {
    const pane = buttonElement.closest('.pane');
    const iframe = pane.querySelector('iframe');
    
    const currentSrc = iframe.src;
    if (currentSrc && currentSrc !== 'about:blank' && currentSrc !== window.location.href) {
        iframe.src = currentSrc;
    }
}

function resetPane(buttonElement) {
    const pane = buttonElement.closest('.pane');
    const iframe = pane.querySelector('iframe');
    const overlay = pane.querySelector('.url-overlay');
    
    iframe.src = '';
    if (overlay) {
        overlay.style.display = 'flex';
        const input = overlay.querySelector('input');
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 50); 
        }
    }
}

// ==========================================
// 7. 통합 기능 관리 (DOM 로드 후 일괄 활성화)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // ---- [A] 기존 코드 마크업 변경 없는 다크모드 동적 구현 ----
    const controlsBar = document.querySelector(".controls");
    
    if (controlsBar) {
        const toggleBtn = document.createElement("button");
        toggleBtn.className = "dark-toggle-btn";
        toggleBtn.setAttribute("title", "다크모드 전환");
        toggleBtn.innerText = "🌙"; 
        
        controlsBar.appendChild(toggleBtn);
        
        const isDarkMode = localStorage.getItem("darkMode") === "true";
        if (isDarkMode) {
            document.body.classList.add("dark-mode");
            toggleBtn.innerText = "☀️";
        }
        
        toggleBtn.addEventListener("click", () => {
            const hasDark = document.body.classList.toggle("dark-mode");
            toggleBtn.innerText = hasDark ? "☀️" : "🌙";
            localStorage.setItem("darkMode", hasDark);
        });
    }

    // ---- [B] 클립보드 자동 붙여넣기 + 엔터 즉시 로드 기능 ----
    const inputs = document.querySelectorAll('.input-group input');

    inputs.forEach(input => {
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); 

                if (input.value.trim() === '') {
                    try {
                        const clipboardText = await navigator.clipboard.readText();
                        
                        if (clipboardText.trim()) {
                            input.value = clipboardText.trim();
                        } else {
                            alert("클립보드가 비어있거나 텍스트 형식이 아닙니다!");
                            return;
                        }
                    } catch (err) {
                        console.error("클립보드 읽기 실패:", err);
                        alert("클립보드 접근 권한이 거부되었거나 브라우저에서 지원하지 않습니다. 최초 1회 권한 허용을 해주셔야 작동합니다.");
                        return;
                    }
                }

                const loadButton = input.parentElement.querySelector('button');
                if (loadButton) {
                    loadButton.click();
                }
            }
        });
    });

    // ---- [C] 마우스 휠 위젯 독 가로 스크롤 제어 ----
    const widgetBar = document.getElementById('widget-container');
    if (widgetBar) {
        widgetBar.addEventListener('wheel', (e) => {
            e.preventDefault();
            widgetBar.scrollLeft += e.deltaY; 
        }, { passive: false });
    }

    // ---- [D] 전역 유틸리티 조작 단축키 시스템 구현 ----
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
            if (e.key === '1') { e.preventDefault(); changeLayout('layout-2-v'); }
            if (e.key === '2') { e.preventDefault(); changeLayout('layout-3'); }
            if (e.key === '3') { e.preventDefault(); changeLayout('layout-4'); }
        }

        if (hoveredPane) {
            if (e.key === 'Escape') {
                e.preventDefault();
                const resetBtn = hoveredPane.querySelector('.pane-controls button[title="주소 변경"]');
                if (resetBtn) resetBtn.click();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
                e.preventDefault();
                const refreshBtn = hoveredPane.querySelector('.pane-controls button[title="새로고침"]');
                if (refreshBtn) refreshBtn.click();
            }
        }
    });
});