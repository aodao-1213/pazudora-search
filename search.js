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

    let hasExactMaterialMatch = false;
    dungeonData.forEach(arena => {
        arena.allRewards.forEach(reward => {
            if (reward.name === input) {
                hasExactMaterialMatch = true;
            }
        });
    });

    const dungeonHits = [];
    const materialHits = [];

    dungeonData.forEach(arena => {
        if (arena.name.includes(input) || arena.series.includes(input)) {
            dungeonHits.push(arena);
        }

        arena.allRewards.forEach(reward => {
            const isMatch = hasExactMaterialMatch ? (reward.name === input) : reward.name.includes(input);
            
            if (isMatch) {
                materialHits.push({
                    series: arena.series,
                    dungeon: arena.name,
                    category: reward.category,
                    note: reward.note,
                    exactName: reward.name,
                    id: reward.id
                });
            }
        });
    });

    if (dungeonHits.length === 0 && materialHits.length === 0) {
        resultDiv.innerHTML = `<p>「${input}」に一致するダンジョンや素材は見つかりませんでした。</p>`;
        return;
    }

    let html = `<h3 style="margin-top: 0; margin-bottom: 25px; font-size: 18px; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px;">🔍 検索結果</h3>`;

    if (dungeonHits.length > 0) {
        html += `<div style="margin-bottom: 30px;">
                    <h4 style="color: #2c3e50; border-bottom: 2px solid #bdc3c7; padding-bottom: 8px; margin-top: 0; margin-bottom: 15px; font-size: 16px;">🏰 ダンジョン</h4>
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

    if (materialHits.length > 0) {
        html += `<div>
                    <h4 style="color: #2c3e50; border-bottom: 2px solid #bdc3c7; padding-bottom: 8px; margin-top: 0; margin-bottom: 15px; font-size: 16px;">💎 ドロップ素材</h4>`;

        // 素材の種類ごとにグループ化して整理する
        const groupedMaterials = {};
        materialHits.forEach(res => {
            if (!groupedMaterials[res.exactName]) {
                groupedMaterials[res.exactName] = {
                    id: res.id || (typeof globalIdMap !== 'undefined' && globalIdMap[res.exactName] ? globalIdMap[res.exactName] : ""),
                    hits: []
                };
            }
            groupedMaterials[res.exactName].hits.push(res);
        });

        for (const [matName, matData] of Object.entries(groupedMaterials)) {
            let idDisplay = matData.id ? `No.${matData.id} ` : "";
            const imageFileName = matData.id ? matData.id : encodeURIComponent(matName);

            html += `<div style="margin-bottom: 25px;">
                        <div class="search-result-header" style="margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
                            <div class="result-image-wrapper" style="width: 45px; height: 45px; flex-shrink: 0;">
                                <img src="images/${imageFileName}.png" alt="${matName}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); background-color: #fff;"
                                     onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                                <span class="fallback-text" style="display:none; font-size: 10px; color: #e74c3c; font-weight: bold; text-align: center; word-wrap: break-word; line-height: 1.2;">${matName}</span>
                            </div>
                            <h5 style="margin: 0; font-size: 15px; font-weight: bold; color: #2c3e50;">${idDisplay}${matName}</h5>
                        </div>
                        <ul class="search-result-list" style="margin: 0; padding-left: 20px;">`;

            matData.hits.forEach(res => {
                const safeDungeon = res.dungeon.replace(/'/g, "\\'");
                let noteHtml = res.note ? ` <span class="search-note" style="color: #e67e22; font-size: 12px; margin-left: 5px; font-weight: bold;">${res.note}</span>` : '';
                
                html += `<li style="margin-bottom: 10px;">
                            <a href="javascript:void(0);" class="dungeon-link" onclick="jumpToDungeon('${safeDungeon}')" style="text-decoration: underline; color: #3498db; font-weight: bold; cursor: pointer; font-size: 14px;">
                                ${res.series} / ${res.dungeon}
                            </a> 
                            <span class="search-category" style="color: #27ae60; font-size: 13px; margin-left: 5px; font-weight: bold;">[${res.category}]</span>${noteHtml}
                         </li>`;
            });

            html += `   </ul>
                     </div>`;
        }

        html += `</div>`;
    }

    resultDiv.innerHTML = html;
}