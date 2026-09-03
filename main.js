// ==========================================
// 🛠 管理者用設定
// ==========================================
// ★ メンテナンスモードにする場合は false を true に変更する
const IS_MAINTENANCE = true; 

// ★ 管理者だけがアクセスするための合言葉（好きな文字列に変更可能）
const ADMIN_PASS = "HK"; 

window.onload = async function() {
    // メンテナンスモードの判定
    const urlParams = new URLSearchParams(window.location.search);
    if (IS_MAINTENANCE && urlParams.get('admin') !== ADMIN_PASS) {
        // 一般ユーザーにはメイン画面を隠し、メンテナンス画面を出す
        document.querySelector('.container').style.display = 'none';
        document.getElementById('maintenanceScreen').classList.remove('hidden');
        return; // Excelの読み込みなど、これ以降の処理を完全にストップ
    }

    // 通常の読み込み処理（メンテオフ、または管理者が合言葉で入った場合）
    await loadExcel();
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