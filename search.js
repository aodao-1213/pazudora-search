function searchMaterial() {
    const input = document.getElementById('searchInput').value.trim();
    const resultDiv = document.getElementById('searchResult');
    
    const historyArea = document.getElementById('searchHistoryArea');
    if (historyArea) historyArea.style.display = 'none';
    
    if (!input) {
        resultDiv.innerHTML = "<p style='color: #e74c3c; font-weight: bold;'>キーワードを入力してください。</p>";
        return;
    }

    saveSearchHistory(input);

    const dungeonHits = [];
    const materialHits = [];
    let foundMaterialId = "";

    dungeonData.forEach(arena => {
        // 1. ダンジョン名・シリーズ名に一致するかチェック
        if (arena.name.includes(input) || arena.series.includes(input)) {
            dungeonHits.push(arena);
        }

        // 2. 素材名に一致するかチェック
        arena.allRewards.forEach(reward => {
            if (reward.name.includes(input)) {
                if (reward.id && !foundMaterialId) foundMaterialId = reward.id;
                
                materialHits.push({
                    series: arena.series,
                    dungeon: arena.name,
                    category: reward.category,
                    note: reward.note,
                    exactName: reward.name
                });
            }
        });
    });

    if (dungeonHits.length === 0 && materialHits.length === 0) {
        resultDiv.innerHTML = `<p>「${input}」に一致するダンジョンや素材は見つかりませんでした。</p>`;
        return;
    }

    let html = "";

    // ==========================================
    // 🏰 ダンジョン検索結果の表示
    // ==========================================
    if (dungeonHits.length > 0) {
        html += `<h3 style="color: #2c3e50; border-bottom: 2px solid #bdc3c7; padding-bottom: 5px; margin-top: 0; font-size: 16px;">🏰 ダンジョン・シリーズ</h3>
                 <ul class="search-result-list" style="margin-bottom: 25px;">`;
        
        dungeonHits.forEach(arena => {
            const safeDungeon = arena.name.replace(/'/g, "\\'");
            html += `<li style="margin-bottom: 8px;">
                        <a href="javascript:void(0);" onclick="jumpToDungeon('${safeDungeon}')" style="text-decoration: underline; color: #3498db; font-weight: bold; cursor: pointer; font-size: 15px;">
                            ${arena.series} / ${arena.name}
                        </a>
                     </li>`;
        });
        html += `</ul>`;
    }

    // ==========================================
    // 💎 素材検索結果の表示
    // ==========================================
    if (materialHits.length > 0) {
        const matchNames = [...new Set(materialHits.map(r => r.exactName))];
        const targetName = matchNames.length === 1 ? matchNames[0] : input;

        let idDisplay = foundMaterialId ? `No.${foundMaterialId} ` : "";
        const imageFileName = foundMaterialId ? foundMaterialId : (typeof globalIdMap !== 'undefined' && globalIdMap[targetName] ? globalIdMap[targetName] : encodeURIComponent(targetName));

        html += `<div class="search-result-header">
                    <div class="result-image-wrapper">
                        <img src="images/${imageFileName}.png" alt="${targetName}" 
                             onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                        <span class="fallback-text" style="display:none;">${targetName}</span>
                    </div>
                    <h3>${idDisplay}${targetName}</h3>
                </div>
                <p style="margin: 10px 0 5px 0; font-weight: bold; color: #555;">📍 ドロップ場所:</p>
                <ul class="search-result-list">`;

        materialHits.forEach(res => {
            const safeDungeon = res.dungeon.replace(/'/g, "\\'");
            let noteHtml = res.note ? ` <span class="search-note">${res.note}</span>` : '';
            html += `<li style="margin-bottom: 8px;">
                        <a href="javascript:void(0);" class="dungeon-link" onclick="jumpToDungeon('${safeDungeon}')" style="text-decoration: underline; color: #3498db; font-weight: bold; cursor: pointer;">
                            ${res.series} / ${res.dungeon}
                        </a> 
                        <span class="search-category" style="color: #27ae60; font-size: 13px; margin-left: 5px;">[${res.category}]</span>${noteHtml}
                     </li>`;
        });

        html += `</ul>`;
    }

    resultDiv.innerHTML = html;
}