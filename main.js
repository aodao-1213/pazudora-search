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

window.onload = async function() {
    // メンテ期間・お知らせ（JSON）を先に読む。メンテ中なら重いExcelは読み込まずにメンテ画面を出す
    await loadSiteSettings();
    if (settingsLoaded.maintenance && showMaintenanceIfNeeded()) return;

    await loadExcel();
    // maintenance.json が無い時は、Excelの「メンテ期間」シートで判定する
    if (!settingsLoaded.maintenance && showMaintenanceIfNeeded()) return;

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
});