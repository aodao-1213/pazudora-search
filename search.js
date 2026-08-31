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
    // 🏰 ダンジョン検索結果の表示（グレーの枠）
    // ==========================================
    if (dungeonHits.length > 0) {
        html += `<div style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border: 1px solid #dcdde1; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <h3 style="color: #2c3e50; border-bottom: 2px solid #bdc3c7; padding-bottom: 8px; margin-top: 0; margin-bottom: 12px; font-size: 16px;">🏰 ダンジョン・シリーズに一致</h3>
                    <ul class="search-result-list" style="margin: 0; padding-left: 20px;">`;
        
        dungeonHits.forEach(arena => {
            const safeDungeon = arena.name.replace(/'/g, "\\'");
            html += `<li style="margin-bottom: 8px;">
                        <a href="javascript:void(0);" onclick="jumpToDungeon('${safeDungeon}')" style="text-decoration: underline; color: #3498db; font-weight: bold; cursor: pointer; font-size: 15px;">
                            ${arena.series} / ${arena.name}
                        </a>
                     </li>`;
        });
        html += `</ul></div>`;
    }

    // ==========================================
    // 💎 素材検索結果の表示（白の枠）
    // ==========================================
    if (materialHits.length > 0) {
        const matchNames = [...new Set(materialHits.map(r => r.exactName))];
        const targetName = matchNames.length === 1 ? matchNames[0] : input;

        let idDisplay = foundMaterialId ? `No.${foundMaterialId} ` : "";
        const imageFileName = foundMaterialId ? foundMaterialId : (typeof globalIdMap !== 'undefined' && globalIdMap[targetName] ? globalIdMap[targetName] : encodeURIComponent(targetName));

        html += `<div style="padding: 15px; background-color: #fff; border: 1px solid #dcdde1; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <h3 style="color: #2c3e50; border-bottom: 2px solid #bdc3c7; padding-bottom: 8px; margin-top: 0; margin-bottom: 15px; font-size: 16px;">💎 ドロップ素材に一致</h3>
                    
                    <div class="search-result-header" style="margin-bottom: 15px;">
                        <div class="result-image-wrapper">
                            <img src="images/${imageFileName}.png" alt="${targetName}" 
                                 onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                            <span class="fallback-text" style="display:none;">${targetName}</span>
                        </div>
                        <h3 style="margin: 0; font-size: 16px;">${idDisplay}${targetName}</h3>
                    </div>
                    
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #555; font-size: 14px;">📍 ドロップ場所:</p>
                    <ul class="search-result-list" style="margin: 0; padding-left: 20px;">`;

        materialHits.forEach(res => {
            const safeDungeon = res.dungeon.replace(/'/g, "\\'");
            let noteHtml = res.note ? ` <span class="search-note" style="color: #e67e22; font-size: 12px; margin-left: 5px; font-weight: bold;">${res.note}</span>` : '';
            html += `<li style="margin-bottom: 10px;">
                        <a href="javascript:void(0);" class="dungeon-link" onclick="jumpToDungeon('${safeDungeon}')" style="text-decoration: underline; color: #3498db; font-weight: bold; cursor: pointer; font-size: 14px;">
                            ${res.series} / ${res.dungeon}
                        </a> 
                        <span class="search-category" style="color: #27ae60; font-size: 13px; margin-left: 5px; font-weight: bold;">[${res.category}]</span>${noteHtml}
                     </li>`;
        });

        html += `</ul></div>`;
    }

    resultDiv.innerHTML = html;
}