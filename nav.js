function updateScreenFromHash() {
    // URLの末尾（#topなど）を取得。なければ 'top' とする
    const hash = window.location.hash.replace('#', '') || 'top';
    
    // 存在するすべての画面のIDリスト
    const screens = [
        'sectionTop', 'sectionSearch', 'sectionArena', 'sectionNotice', 
        'sectionNoticeList', 'sectionHowTo', 'sectionNotes', 
        'sectionSettings', 'sectionSettingsHistory'
    ];
    
    // 一旦すべての画面を非表示にする
    screens.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    // ハッシュに応じて対象の画面だけを表示する
    if (hash === 'top') document.getElementById('sectionTop').classList.remove('hidden');
    else if (hash === 'search') document.getElementById('sectionSearch').classList.remove('hidden');
    else if (hash === 'arena') document.getElementById('sectionArena').classList.remove('hidden');
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
        // ★ 履歴画面が開かれた瞬間に、履歴リストを描画する
        if (typeof renderSettingsHistory === 'function') renderSettingsHistory();
    }
}

// ハッシュ（URL）が切り替わったときに画面を更新する
window.addEventListener('hashchange', updateScreenFromHash);

// 画面遷移用の関数（ハッシュを変更するだけで画面が切り替わる）
function showScreen(screenName) {
    window.location.hash = screenName;
}

// 目次からシリーズの大枠にジャンプする機能
function jumpToSeries(seriesId) {
    const target = document.getElementById(`series-${seriesId}`);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // 目次が開いている場合、見やすさのために閉じる
        const tocDetails = document.querySelector('.toc-details');
        if (tocDetails) {
            tocDetails.removeAttribute('open');
        }
    }
}

function jumpToDungeon(dungeonName) {
    showScreen('arena');
    
    setTimeout(() => {
        const safeId = encodeURIComponent(dungeonName);
        const target = document.getElementById(`dungeon-${safeId}`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
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