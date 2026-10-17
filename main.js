const ADMIN_PASS = "aodao"; 

// URLに ?admin=… が付いているか（メンテ中でもサイトを見られる・管理画面ボタンを出す）
function isAdminMode() {
    return new URLSearchParams(window.location.search).get('admin') === ADMIN_PASS;
}

// 今がメンテ期間中なら、その期間を返す（?test=1 の時はテスト用に必ずメンテ扱い）
function findActiveMaintenance() {
    if (new URLSearchParams(window.location.search).get('test') === '1') {
        return maintenanceData[0] || { startStr: 'テスト開始日時', endStr: 'テスト終了日時' };
    }
    const now = Date.now();
    return maintenanceData.find(m => now >= m.start && now <= m.end) || null;
}

// メンテ画面を出してサイト本体を隠す。表示したら true
function showMaintenanceIfNeeded() {
    const activeMainte = findActiveMaintenance();
    if (!activeMainte || isAdminMode()) return false;

    document.querySelector('.container').style.display = 'none';
    const periodText = document.getElementById('maintenancePeriodText');
    if (periodText) {
        // 両方が「未定」の場合は専用のテキストを表示する
        periodText.textContent = (activeMainte.startStr === '未定' && activeMainte.endStr === '未定')
            ? '終了時期は未定です。'
            : `${activeMainte.startStr} 〜 ${activeMainte.endStr}`;
    }
    document.getElementById('maintenanceScreen').classList.remove('hidden');
    return true;
}

// データの最終更新日（data.json を作った日）をトップ画面と報酬リストに出す
function displayDataUpdated() {
    const date = dataGeneratedAt ? new Date(dataGeneratedAt) : null;
    const valid = date && !isNaN(date.getTime());
    const pad = (n) => String(n).padStart(2, '0');
    const text = valid ? `📅 データ更新：${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}` : '';
    document.querySelectorAll('.data-updated').forEach(el => {
        el.textContent = text;
        el.hidden = !valid;
    });
}

// ある程度下にスクロールしたら「ページ上部へ戻る」ボタンを出す
function updateBackToTop() {
    const button = document.getElementById('backToTop');
    if (button) button.classList.toggle('is-visible', window.scrollY > 500);
}
window.addEventListener('scroll', updateBackToTop, { passive: true });
window.addEventListener('hashchange', () => setTimeout(updateBackToTop, 50));

window.onload = async function() {
    // メンテ期間・お知らせ（JSON）を先に読む。メンテ中ならダンジョンのデータは読み込まずにメンテ画面を出す
    await loadSiteSettings();
    if (showMaintenanceIfNeeded()) return;

    // ダンジョンのデータ（data.json。無ければ dangeon.xlsx）
    await loadSiteData();
    displayDataUpdated();

    if (typeof displayAnnouncements === 'function') displayAnnouncements();
    if (typeof displayNoteExample === 'function') displayNoteExample();
    // データが揃ったので、今開いている画面（報酬リスト・お知らせなど）を描き直す
    if (typeof updateScreenFromHash === 'function') updateScreenFromHash();
};

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                if (typeof searchMaterial === 'function') searchMaterial();
                this.blur();
            }
        });

        searchInput.addEventListener('focus', function() {
            const history = JSON.parse(localStorage.getItem('padSearchHistory') || '[]');
            if (history.length > 0) {
                const historyArea = document.getElementById('searchHistoryArea');
                if (historyArea) historyArea.style.display = 'flex';
                this.classList.add('input-active');
            }
        });

        searchInput.addEventListener('blur', function() {
            setTimeout(() => {
                const historyArea = document.getElementById('searchHistoryArea');
                if (historyArea) historyArea.style.display = 'none';
                this.classList.remove('input-active');
            }, 200);
        });
    }
    
    if (typeof updateSearchHistoryUI === 'function') {
        updateSearchHistoryUI();
    }

    function dismissTooltips(event) {
        const isBadge = event.target.closest('.material-badge');

        if (!isBadge) {
            const activeEl = document.activeElement;

            if (activeEl && activeEl.classList.contains('material-badge')) {
                activeEl.blur();
            }

            document.querySelectorAll('.material-badge').forEach(badge => {
                badge.dataset.tapped = "false";
            });
        }
    }

    document.addEventListener('click', dismissTooltips);
    document.addEventListener('touchstart', dismissTooltips, { passive: true });

    // 素材名の吹き出しが画面の端からはみ出さないよう、出す時に位置を調整する
    // （左右は画面内に収まるだけ横にずらし、上に余裕が無ければアイコンの下側に出す）
    window.placeTooltip = function placeTooltip(badge) {
        const tip = badge.querySelector('.custom-tooltip');
        if (!tip) return;
        const margin = 8;
        tip.style.setProperty('--tip-shift', '0px');
        tip.classList.remove('is-below');

        const rect = tip.getBoundingClientRect();
        let shift = 0;
        if (rect.left < margin) shift = margin - rect.left;
        else if (rect.right > window.innerWidth - margin) shift = (window.innerWidth - margin) - rect.right;
        tip.style.setProperty('--tip-shift', `${Math.round(shift)}px`);

        if (rect.top < margin) tip.classList.add('is-below');
    };

    const onBadgeShow = (event) => {
        const badge = event.target.closest && event.target.closest('.material-badge');
        if (badge) window.placeTooltip(badge);
    };
    // PCはマウスを乗せた時、スマホはタップした時（pointerdown / focusin）に位置を調整する
    document.addEventListener('mouseover', onBadgeShow);
    document.addEventListener('pointerdown', onBadgeShow);
    document.addEventListener('focusin', onBadgeShow);
});