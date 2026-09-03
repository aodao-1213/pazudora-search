// ★ 管理者だけがアクセスするための合言葉
const ADMIN_PASS = "aodao"; 

window.onload = async function() {
    await loadExcel();

    const now = new Date().getTime();
    let isMaintenance = false;
    let activeMainte = null; // 現在該当しているメンテナンス設定を保持

    // 現在の時刻がメンテナンス期間内かチェック
    for (let m of maintenanceData) {
        if (now >= m.start && now <= m.end) {
            isMaintenance = true;
            activeMainte = m;
            break;
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    
    // ★追加: テスト機能。URLの末尾が ?test=1 なら強制的にメンテナンス画面を表示する
    if (urlParams.get('test') === '1') {
        isMaintenance = true;
        // Excelに予定が1つでもあればそれを表示し、無ければダミーテキストを表示
        activeMainte = maintenanceData[0] || { startStr: 'テスト開始日時', endStr: 'テスト終了日時' };
    }

    // メンテナンス状態 ＆ 管理者パスワードがない場合
    if (isMaintenance && urlParams.get('admin') !== ADMIN_PASS) {
        document.querySelector('.container').style.display = 'none';
        
        // ★追加: メンテナンス画面の「未定」の文字を、Excelから取った日時に書き換える
        const periodText = document.getElementById('maintenancePeriodText');
        if (periodText && activeMainte) {
            periodText.innerHTML = `${activeMainte.startStr} 〜 <br>${activeMainte.endStr}`;
        }
        
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