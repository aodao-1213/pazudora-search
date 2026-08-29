// Enterキーで検索を実行
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchMaterial();
        this.blur();
    }
});

// ★ 検索履歴をドロップダウンリストとして生成する関数
function updateSearchHistoryUI() {
    const historyArea = document.getElementById('searchHistoryArea');
    if (!historyArea) return;
    
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

// ★ 入力欄をタップした時に履歴を表示する
document.getElementById('searchInput').addEventListener('focus', function() {
    const history = JSON.parse(localStorage.getItem('padSearchHistory') || '[]');
    if (history.length > 0) {
        document.getElementById('searchHistoryArea').style.display = 'flex';
        this.classList.add('input-active'); // リストと一体化させるために角丸を消す
    }
});

// ★ 外をタップした時に履歴を隠す（リストのクリックが空振りしないよう少し待つ）
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
    
    if (history.length > 10) history.pop(); // 少し多めに10件まで保存
    
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