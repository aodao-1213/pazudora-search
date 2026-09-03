const ADMIN_PASS = "aodao"; 

window.onload = async function() {
    await loadExcel();

    const now = new Date().getTime();
    let isMaintenance = false;
    let activeMainte = null;

    for (let m of maintenanceData) {
        if (now >= m.start && now <= m.end) {
            isMaintenance = true;
            activeMainte = m;
            break;
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('test') === '1') {
        isMaintenance = true;
        activeMainte = maintenanceData[0] || { startStr: 'テスト開始日時', endStr: 'テスト終了日時' };
    }

    if (isMaintenance && urlParams.get('admin') !== ADMIN_PASS) {
        document.querySelector('.container').style.display = 'none';
        
        const periodText = document.getElementById('maintenancePeriodText');
        if (periodText && activeMainte) {
            // ★ 修正: <br> を外し、1行で表示するように変更
            periodText.innerHTML = `${activeMainte.startStr} 〜 ${activeMainte.endStr}`;
        }
        
        document.getElementById('maintenanceScreen').classList.remove('hidden');
        return; 
    }

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