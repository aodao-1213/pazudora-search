function updateScreenFromHash() {
    const hash = window.location.hash.replace('#', '') || 'top';
    
    document.getElementById('sectionTop').classList.add('hidden');
    document.getElementById('sectionSearch').classList.add('hidden');
    document.getElementById('sectionArena').classList.add('hidden');
    
    const noticeSection = document.getElementById('sectionNotice');
    if (noticeSection) noticeSection.classList.add('hidden');
    
    const noticeListSection = document.getElementById('sectionNoticeList');
    if (noticeListSection) noticeListSection.classList.add('hidden');

    const howtoSection = document.getElementById('sectionHowTo');
    if (howtoSection) howtoSection.classList.add('hidden');

    const notesSection = document.getElementById('sectionNotes');
    if (notesSection) notesSection.classList.add('hidden');
    
    if (hash === 'top') document.getElementById('sectionTop').classList.remove('hidden');
    else if (hash === 'search') document.getElementById('sectionSearch').classList.remove('hidden');
    else if (hash === 'arena') document.getElementById('sectionArena').classList.remove('hidden');
    else if (hash === 'notice' && noticeSection) noticeSection.classList.remove('hidden');
    else if (hash === 'howto' && howtoSection) howtoSection.classList.remove('hidden');
    else if (hash === 'notes' && notesSection) notesSection.classList.remove('hidden');
    else if (hash === 'noticeList' && noticeListSection) {
        noticeListSection.classList.remove('hidden');
        if (typeof showNoticeList === 'function') showNoticeList(1);
    }
}

window.addEventListener('hashchange', updateScreenFromHash);

function showScreen(screenName) {
    window.location.hash = screenName;
}

// ★ 追加: 目次からシリーズの大枠にジャンプする機能
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

function showScreen(screenName) {
    // 全ての画面（セクション）のIDリスト（設定画面を追加）
    const screens = [
        'sectionTop',
        'sectionHowTo',
        'sectionNotes',
        'sectionNoticeList',
        'sectionNotice',
        'sectionSearch',
        'sectionArena',
        'sectionSettings' // ★ ここを追加しました
    ];

    // 一旦すべての画面を非表示にする
    screens.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden');
        }
    });

    // 指定された画面だけを表示する
    let targetId = 'sectionTop';
    if (screenName === 'howto') targetId = 'sectionHowTo';
    else if (screenName === 'notes') targetId = 'sectionNotes';
    else if (screenName === 'noticelist' || screenName === 'noticeList') targetId = 'sectionNoticeList';
    else if (screenName === 'notice') targetId = 'sectionNotice';
    else if (screenName === 'search') targetId = 'sectionSearch';
    else if (screenName === 'arena') targetId = 'sectionArena';
    else if (screenName === 'settings') targetId = 'sectionSettings'; // ★ ここを追加しました

    const targetEl = document.getElementById(targetId);
    if (targetEl) {
        targetEl.classList.remove('hidden');
    }

    // 画面の一番上にスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('DOMContentLoaded', updateScreenFromHash);