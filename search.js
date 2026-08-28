// ★ Enterキーで検索を実行する設定
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchMaterial();
        this.blur(); // スマホで検索後にキーボードを自動で閉じる
    }
});

// ★ 検索履歴を読み込んでリストを更新する関数
function updateSearchHistory() {
    const datalist = document.getElementById('searchHistoryList');
    if (!datalist) return;
    let history = JSON.parse(localStorage.getItem('padSearchHistory') || '[]');
    
    let html = '';
    history.forEach(word => {
        html += `<option value="${word}"></option>`;
    });
    datalist.innerHTML = html;
}

// ★ 検索ワードをブラウザに保存する関数
function saveSearchHistory(query) {
    if (!query) return;
    let history = JSON.parse(localStorage.getItem('padSearchHistory') || '[]');
    
    // 同じワードがあれば削除して、常に最新を一番上にする
    history = history.filter(item => item !== query);
    history.unshift(query);
    
    // 最大10件まで保存
    if (history.length > 10) history.pop();
    
    localStorage.setItem('padSearchHistory', JSON.stringify(history));
    updateSearchHistory();
}

// ページを開いた時に履歴をセット
updateSearchHistory();

function searchMaterial() {
    const query = document.getElementById('searchInput').value.trim();
    const resultDiv = document.getElementById('searchResult');

    if (query === "") {
        resultDiv.innerHTML = "検索キーワードを入力してください。";
        return;
    }

    // ★ 検索が実行されたら履歴を保存
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