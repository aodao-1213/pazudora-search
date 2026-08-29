// ★ URLのハッシュ（#）を見て画面を切り替える内部関数
function updateScreenFromHash() {
    const hash = window.location.hash.replace('#', '') || 'top';
    
    document.getElementById('sectionTop').classList.add('hidden');
    document.getElementById('sectionSearch').classList.add('hidden');
    document.getElementById('sectionArena').classList.add('hidden');
    
    if (hash === 'top') document.getElementById('sectionTop').classList.remove('hidden');
    else if (hash === 'search') document.getElementById('sectionSearch').classList.remove('hidden');
    else if (hash === 'arena') document.getElementById('sectionArena').classList.remove('hidden');
}

// ★ ブラウザの「戻る」「進む」が押されたときに画面を更新する
window.addEventListener('hashchange', updateScreenFromHash);

// ★ 画面遷移の指示（直接画面を隠すのではなく、URLのハッシュを変更する）
function showScreen(screenName) {
    window.location.hash = screenName;
}

function jumpToDungeon(dungeonName) {
    showScreen('arena');
    // ハッシュ変更による画面切り替えを待つため、少しだけ遅延させる
    setTimeout(() => {
        const safeId = encodeURIComponent(dungeonName);
        const target = document.getElementById(`dungeon-${safeId}`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            target.classList.remove('flash-highlight');
            setTimeout(() => {
                target.classList.add('flash-highlight');
            }, 10);

            setTimeout(() => {
                target.classList.remove('flash-highlight');
            }, 4000);
        }
    }, 100);
}

function jumpToSearch(itemName) {
    showScreen('search');
    document.getElementById('searchInput').value = itemName;
    if (typeof searchMaterial === 'function') {
        searchMaterial();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleBadgeClick(event, itemName) {
    const canHover = window.matchMedia('(hover: hover)').matches;
    
    if (!canHover) {
        const badge = event.currentTarget;
        if (badge.dataset.tapped !== "true") {
            badge.dataset.tapped = "true";
            setTimeout(() => { badge.dataset.tapped = "false"; }, 3000);
            return; 
        }
    }
    jumpToSearch(itemName);
}

// 初期読み込み時にURLのハッシュを見て正しい画面を表示する
window.addEventListener('DOMContentLoaded', updateScreenFromHash);