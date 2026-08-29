window.onload = async function() {
    await loadExcel();
    if (typeof displayAnnouncements === 'function') displayAnnouncements(); // ★ 追加
    if (typeof displayArenaList === 'function') displayArenaList();
};

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchMaterial();
                this.blur();
            }
        });

        searchInput.addEventListener('focus', function() {
            const history = JSON.parse(localStorage.getItem('padSearchHistory') || '[]');
            if (history.length > 0) {
                document.getElementById('searchHistoryArea').style.display = 'flex';
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
});