// ★ 管理者だけがアクセスするための合言葉（好きな文字列に変更可能）
const ADMIN_PASS = "aodao"; 

window.onload = async function() {
    // 最初にExcelデータをすべて読み込む
    await loadExcel();

    // ★追加: 現在の時刻とExcelのメンテナンス期間を比較
    const now = new Date().getTime();
    let isMaintenance = false;
    for (let m of maintenanceData) {
        if (now >= m.start && now <= m.end) {
            isMaintenance = true;
            break;
        }
    }

    // メンテナンス期間中で、かつ管理者の合言葉が無い場合は画面を切り替えてストップ
    const urlParams = new URLSearchParams(window.location.search);
    if (isMaintenance && urlParams.get('admin') !== ADMIN_PASS) {
        document.querySelector('.container').style.display = 'none';
        document.getElementById('maintenanceScreen').classList.remove('hidden');
        return; 
    }

    // 問題なければ通常の画面を描画する
    if (typeof displayAnnouncements === 'function') displayAnnouncements(); 
    if (typeof displayArenaList === 'function') displayArenaList();
    if (typeof displayNoteExample === 'function') displayNoteExample(); 
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
        const isCondition = event.target.closest('.condition-tooltip-container');
        
        if (!isBadge && !isCondition) {
            const activeEl = document.activeElement;
            
            if (activeEl && (activeEl.classList.contains('material-badge') || activeEl.classList.contains('condition-tooltip-container'))) {
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