function updateScreenFromHash() {
    const hash = window.location.hash.replace('#', '') || 'top';
    
    // ★ sectionSettingsTheme を追加
    const screens = [
        'sectionTop', 'sectionSearch', 'sectionArena', 'sectionNotice', 
        'sectionNoticeList', 'sectionHowTo', 'sectionNotes', 
        'sectionSettings', 'sectionSettingsHistory', 'sectionSettingsTheme'
    ];
    
    screens.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    if (hash === 'top') document.getElementById('sectionTop').classList.remove('hidden');
    else if (hash === 'search') document.getElementById('sectionSearch').classList.remove('hidden');
    else if (hash === 'arena' || hash.startsWith('arena/')) {
        // 報酬リストは #arena / #arena/ステージ名 / #arena/ステージ名/ダンジョン名 の3段階
        document.getElementById('sectionArena').classList.remove('hidden');
        if (typeof displayArenaList === 'function') displayArenaList();
        window.scrollTo(0, 0);
    }
    else if (hash === 'notice') document.getElementById('sectionNotice')?.classList.remove('hidden');
    else if (hash === 'noticeList') {
        document.getElementById('sectionNoticeList')?.classList.remove('hidden');
        if (typeof showNoticeList === 'function') showNoticeList(1);
    }
    else if (hash === 'howto') document.getElementById('sectionHowTo')?.classList.remove('hidden');
    else if (hash === 'notes') document.getElementById('sectionNotes')?.classList.remove('hidden');
    else if (hash === 'settings') document.getElementById('sectionSettings')?.classList.remove('hidden');
    else if (hash === 'settingsHistory') {
        document.getElementById('sectionSettingsHistory')?.classList.remove('hidden');
        if (typeof renderSettingsHistory === 'function') renderSettingsHistory();
    }
    else if (hash === 'settingsTheme') {
        document.getElementById('sectionSettingsTheme')?.classList.remove('hidden');
    }
}

// ハッシュ（URL）が切り替わったときに画面を更新する
window.addEventListener('hashchange', updateScreenFromHash);

// 画面遷移用の関数（ハッシュを変更するだけで画面が切り替わる）
function showScreen(screenName) {
    window.location.hash = screenName;
}

// 検索結果などから、そのダンジョンの報酬画面を直接開いて光らせる
function jumpToDungeon(dungeonName) {
    const arena = dungeonData.find(d => d.name === dungeonName);
    showScreen(arena ? arenaHash(arena.series, arena.name) : 'arena');

    setTimeout(() => {
        const safeId = encodeURIComponent(dungeonName);
        const target = document.getElementById(`dungeon-${safeId}`);
        if (target) {
            target.classList.remove('flash-highlight');
            setTimeout(() => {
                target.classList.add('flash-highlight');
            }, 10);

            setTimeout(() => {
                target.classList.remove('flash-highlight');
            }, 4000);
        }
    }, 200);
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
            document.querySelectorAll('.material-badge').forEach(b => {
                b.dataset.tapped = "false";
            });
            
            badge.dataset.tapped = "true";
            badge.focus(); 
            
            setTimeout(() => { badge.dataset.tapped = "false"; }, 3000);
            return; 
        }
    }
    jumpToSearch(itemName);
}

window.addEventListener('DOMContentLoaded', updateScreenFromHash);