function updateScreenFromHash() {
    const hash = window.location.hash.replace('#', '') || 'top';
    
    document.getElementById('sectionTop').classList.add('hidden');
    document.getElementById('sectionSearch').classList.add('hidden');
    document.getElementById('sectionArena').classList.add('hidden');
    
    const noticeSection = document.getElementById('sectionNotice');
    if (noticeSection) noticeSection.classList.add('hidden');
    
    if (hash === 'top') document.getElementById('sectionTop').classList.remove('hidden');
    else if (hash === 'search') document.getElementById('sectionSearch').classList.remove('hidden');
    else if (hash === 'arena') document.getElementById('sectionArena').classList.remove('hidden');
    // ★ 追加: お知らせ詳細画面の表示指示
    else if (hash === 'notice' && noticeSection) noticeSection.classList.remove('hidden');
}

window.addEventListener('hashchange', updateScreenFromHash);

function showScreen(screenName) {
    window.location.hash = screenName;
}

function jumpToDungeon(dungeonName) {
    showScreen('arena');
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

window.addEventListener('DOMContentLoaded', updateScreenFromHash);