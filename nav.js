const SITE_TITLE = 'パズドラ 闘技場報酬＆素材検索ツール';

// ブラウザのタブ名（ブックマーク・履歴に出る名前）を「画面名 | サイト名」にする
function setPageTitle(screenTitle) {
    document.title = screenTitle ? `${screenTitle} | ${SITE_TITLE}` : SITE_TITLE;
}

function updateScreenFromHash() {
    const hash = window.location.hash.replace('#', '') || 'top';

    const screens = [
        'sectionTop', 'sectionSearch', 'sectionArena', 'sectionNotice',
        'sectionNoticeList', 'sectionHowTo', 'sectionNotes',
        'sectionSettings', 'sectionSettingsHistory', 'sectionSettingsTheme'
    ];

    screens.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const show = (id) => document.getElementById(id)?.classList.remove('hidden');

    if (hash === 'search') {
        show('sectionSearch');
        setPageTitle('素材・ダンジョン検索');
    }
    else if (hash === 'arena' || hash.startsWith('arena/')) {
        // 報酬リストは #arena / #arena/ステージ名 / #arena/ステージ名/ダンジョン名 の3段階（タブ名は displayArenaList で設定）
        show('sectionArena');
        if (typeof displayArenaList === 'function') displayArenaList();
        window.scrollTo(0, 0);
    }
    else if (hash === 'notice' || hash.startsWith('notice/')) {
        // お知らせ詳細は #notice/番号（タブ名は renderNoticeDetail で設定）
        show('sectionNotice');
        if (typeof renderNoticeDetail === 'function') renderNoticeDetail();
        window.scrollTo(0, 0);
    }
    else if (hash === 'noticeList') {
        show('sectionNoticeList');
        setPageTitle('お知らせ一覧');
        if (typeof showNoticeList === 'function') showNoticeList(1);
    }
    else if (hash === 'howto') {
        show('sectionHowTo');
        setPageTitle('使い方');
    }
    else if (hash === 'notes') {
        show('sectionNotes');
        setPageTitle('注意書き');
    }
    else if (hash === 'settings') {
        show('sectionSettings');
        setPageTitle('設定');
    }
    else if (hash === 'settingsHistory') {
        show('sectionSettingsHistory');
        setPageTitle('検索履歴の管理');
        if (typeof renderSettingsHistory === 'function') renderSettingsHistory();
    }
    else if (hash === 'settingsTheme') {
        show('sectionSettingsTheme');
        setPageTitle('カラー設定');
    }
    else {
        // #top と、知らないURL（打ち間違いなど）はトップ画面を出す（真っ白な画面にしない）
        show('sectionTop');
        setPageTitle('');
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