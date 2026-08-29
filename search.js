// Enterキーで検索を実行
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchMaterial();
        this.blur();
    }
});

// ★ 検索履歴を画面にボタン（タグ）として複数表示する関数
function updateSearchHistoryUI() {
    let historyArea = document.getElementById('searchHistoryArea');
    
    // もしHTML側に枠が書き忘れられていても、自動で作成する機能を追加
    if (!historyArea) {
        historyArea = document.createElement('div');
        historyArea.id = 'searchHistoryArea';
        historyArea.className = 'history-area';
        const searchInput = document.getElementById('searchInput');
        // 入力欄のすぐ下に枠を差し込む
        searchInput.parentNode.insertBefore(historyArea, searchInput.nextSibling);
    }
    
    let history = JSON.parse(localStorage.getItem('padSearchHistory') || '[]');
    
    if (history.length === 0) {
        historyArea.innerHTML = '';
        historyArea.style.display = 'none';
        return;
    }

    historyArea.style.display = 'flex';
    let html = '<span class="history-title">履歴:</span>';
    
    // 履歴を最大8件までボタンとして並べる
    history.forEach(word => {
        const safeWord = word.replace(/'/g, "\\'");
        html += `<button type="button" class="history-tag" onclick="useHistory('${safeWord}')">${word}</button>`;
    });

    historyArea.innerHTML = html;
}

// 履歴タグをクリックしたときの処理
function useHistory(word) {
    document.getElementById('searchInput').value = word;
    searchMaterial();
}

// 検索ワードを保存する関数
function saveSearchHistory(query) {
    if (!query) return;
    let history = JSON.parse(localStorage.getItem('padSearchHistory') || '[]');
    
    history = history.filter(item => item !== query);
    history.unshift(query);
    
    if (history.length > 8) history.pop(); // 最大8件まで保存
    
    localStorage.setItem('padSearchHistory', JSON.stringify(history));
    updateSearchHistoryUI();
}

// ページを開いた時に履歴を表示
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
            if (reward.name.includes(query)) {
                if (!foundMap[reward.name]) foundMap[reward.name] = [];
                
                let displayNote = reward.note;
                if (displayNote && !displayNote.match(/^[×xX～~]/)) displayNote = `(${displayNote})`;
                
                foundMap[reward.name].push({
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
            const safeName = encodeURIComponent(name);
            const locations = foundMap[name];
            const firstDungeon = locations[0].dungeonName;

            html += `<div class="item">
                        <div class="search-result-header clickable" onclick="jumpToDungeon('${firstDungeon}')">
                            <div class="material-badge" title="${name}">
                                <img src="images/${safeName}.png" alt="${name}" 
                                     onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                                <span class="fallback-text" style="display:none;">${name}</span>
                            </div>
                            <span class="search-result-name">${name}</span>
                        </div>
                        
                        <div style="margin-top: 10px;">📍 ドロップ場所:</div>
                        <ul class="search-location-list">`;
            
            locations.forEach(loc => {
                const noteHtml = loc.note ? `<span class="search-note">${loc.note}</span>` : '';
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