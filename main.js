window.onload = async function() {
    await loadExcel();
    if (typeof displayAnnouncements === 'function') displayAnnouncements(); 
    if (typeof displayArenaList === 'function') displayArenaList();
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

    // ★ 追加: 画面の空いている場所をタップした時に吹き出しを消す処理
    function dismissTooltips(event) {
        const isBadge = event.target.closest('.material-badge');
        const isCondition = event.target.closest('.condition-tooltip-container');
        
        // アイコン以外の場所をタップした場合
        if (!isBadge && !isCondition) {
            // CSSのフォーカスを外して吹き出しを隠す
            if (document.activeElement) {
                document.activeElement.blur();
            }
            // ダブルタップ判定用のフラグもすべてリセットする
            document.querySelectorAll('.material-badge').forEach(badge => {
                badge.dataset.tapped = "false";
            });
        }
    }

    // PCのクリックとスマホのタップ両方に対応させる
    document.addEventListener('click', dismissTooltips);
    document.addEventListener('touchstart', dismissTooltips, { passive: true });
});