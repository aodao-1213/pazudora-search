document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchMaterial();
        this.blur();
    }
});

function updateSearchHistoryUI() {
    let historyArea = document.getElementById('searchHistoryArea');
    if (!historyArea) {
        historyArea = document.createElement('div');
        historyArea.id = 'searchHistoryArea';
        historyArea.className = 'history-area';
        const searchInput = document.getElementById('searchInput');
        searchInput.parentNode.insertBefore(historyArea, searchInput.nextSibling);
    }
    
    let history = JSON.parse(localStorage.getItem('padSearchHistory') || '[]');
    if (history.length === 0) {
        historyArea.innerHTML = '';
        historyArea.style.display = 'none';
        return;
    }

    let html = '';
    history.forEach(word => {
        const safeWord = word.replace(/'/g, "\\'");
        html += `<button type="button" class="history-item" onclick="useHistory('${safeWord}')">${word}</button>`;
    });
    historyArea.innerHTML = html;
}

document.getElementById('searchInput').addEventListener('focus', function() {
    const history = JSON.parse(localStorage.getItem('padSearchHistory') || '[]');
    if (history.length > 0) {
        document.getElementById('searchHistoryArea').style.display = 'flex';
        this.classList.add('input-active');
    }
});

document.getElementById('searchInput').addEventListener('blur', function() {
    setTimeout(() => {
        const historyArea = document.getElementById('searchHistoryArea');
        if (historyArea) historyArea.style.display = 'none';
        this.classList.remove('input-active');
    }, 200);
});

function useHistory(word) {
    document.getElementById('searchInput').value = word;
    searchMaterial();
}

function saveSearchHistory(query) {
    if (!query) return;
    let history = JSON.parse(localStorage.getItem('padSearchHistory') || '[]');
    history = history.filter(item => item !== query);
    history.unshift(query);
    if (history.length > 10) history.pop();
    localStorage.setItem('padSearchHistory', JSON.stringify(history));
    updateSearchHistoryUI();
}

updateSearchHistoryUI();

function searchMaterial() {
    const query = document.getElementById('searchInput').value.trim();
    const resultDiv = document.getElementById('searchResult');

    if (query === "") {
        resultDiv.innerHTML = "検索キーワードを入力してください。";
        return;
    }

    saveSearchHistory(query);
    const foundMap = {};

    dungeonData.forEach(dungeon => {
        dungeon.allRewards.forEach(reward => {
            if (reward.name.includes(query) || (reward.id && reward.id.includes(query))) {
                if (!foundMap[reward.name]) {
                    foundMap[reward.name] = { id: reward.id, locations: [] };
                }
                
                let displayNote = reward.note;
                if (displayNote && !displayNote.match(/^[×xX～~]/)) displayNote = `(${displayNote})`;
                
                foundMap[reward.name].locations.push({
                    series: dungeon.series,
                    dungeonName: dungeon.name,
                    category: reward.category,
                    note: displayNote || ""
                });
            }
        });
    });

    const itemNames = Object.keys(foundMap);
    if (itemNames.length > 0) {
        let html = "";
        itemNames.forEach(name => {
            const data = foundMap[name];
            const safeName = encodeURIComponent(name);
            const locations = data.locations;
            
            const displayName = data.id ? `No.${data.id} ${name}` : name;

            // ★ onclickとclickableクラスを削除し、純粋な表示領域に変更
            html += `<div class="item">
                        <div class="search-result-header">
                            <div class="material-badge" tabindex="0">
                                <img src="images/${safeName}.png" alt="${name}" 
                                     onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                                <span class="fallback-text" style="display:none;">${name}</span>
                                <span class="custom-tooltip">${displayName}</span>
                            </div>
                            <span class="search-result-name">${displayName}</span>
                        </div>
                        
                        <div style="margin-top: 10px;">📍 ドロップ場所:</div>
                        <ul class="search-location-list">`;
            
            locations.forEach(loc => {
                const noteHtml = loc.note ? `<span class="search-note">${loc.note}</span>` : '';
                // リンク一覧からのジャンプ機能は維持
                html += `<li class="jump-link" onclick="jumpToDungeon('${loc.dungeonName}')">
                            ${loc.series} / ${loc.dungeonName} 
                            <span class="search-category">[${loc.category}]</span> ${noteHtml}
                         </li>`;
            });

            html += `   </ul>
                     </div>`;
        });
        resultDiv.innerHTML = html;
    } else {
        resultDiv.innerHTML = "該当する素材は見つかりませんでした。";
    }
}