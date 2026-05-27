// script.js
const workspace = document.getElementById('workspace');
const resizerV = document.getElementById('resizer-v');
const resizerH = document.getElementById('resizer-h');
const resizerCenter = document.getElementById('resizer-center');

let isDraggingV = false;
let isDraggingH = false;
let isDraggingCenter = false;

// 드래그 시작 이벤트
resizerV.addEventListener('mousedown', () => isDraggingV = true);
resizerH.addEventListener('mousedown', () => isDraggingH = true);
resizerCenter.addEventListener('mousedown', () => isDraggingCenter = true);

// 드래그 중 이벤트
window.addEventListener('mousemove', (e) => {
    // 드래그 상태가 아니면 실행 안 함
    if (!isDraggingV && !isDraggingH && !isDraggingCenter) return;

    // 드래그 중일 때 iframe 안으로 마우스가 들어가도 끊기지 않도록 클래스 추가
    workspace.classList.add('is-dragging');

    // 마우스 위치를 백분율(%)로 계산
    let x = (e.clientX / window.innerWidth) * 100;
    let y = (e.clientY / window.innerHeight) * 100;

    // 화면 밖으로 밀려나지 않도록 최소/최대 비율 제한 (10% ~ 90%)
    x = Math.max(10, Math.min(x, 90));
    y = Math.max(10, Math.min(y, 90));

    // 드래그 종류에 따라 CSS 변수 업데이트
    if (isDraggingV || isDraggingCenter) {
        workspace.style.setProperty('--x', `${x}%`);
    }
    if (isDraggingH || isDraggingCenter) {
        workspace.style.setProperty('--y', `${y}%`);
    }
});

// 드래그 종료 이벤트
window.addEventListener('mouseup', () => {
    isDraggingV = false;
    isDraggingH = false;
    isDraggingCenter = false;
    workspace.classList.remove('is-dragging');
});