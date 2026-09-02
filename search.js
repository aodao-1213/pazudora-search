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
    let exactMatchId = ""; // ★ 追加: 完全一致した素材のIDを記録する

    dungeonData.forEach(arena => {
        if (arena.name.includes(input) || arena.series.includes(input)) {
            dungeonHits.push(arena);
        }

        arena.allRewards.forEach(reward => {
            if (reward.name.includes(input)) {
                // ★ 修正: 検索ワードと完全に同じ名前なら、そのIDを最優先でキープする
                if (reward.name === input && reward.id) {
                    exactMatchId = reward.id;
                }
                // それ以外（部分一致）のIDも予備としてキープしておく
                if (reward.id && !foundMaterialId) {
                    foundMaterialId = reward.id;
                }
                
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
        const matchNames = [...new Set(materialHits.map(r => r.exactName))];
        
        // ★ 修正: 完全一致する名前があれば、それを代表の名前（ターゲット名）にする
        let targetName = input;
        if (matchNames.includes(input)) {
            targetName = input;
        } else if (matchNames.length === 1) {
            targetName = matchNames[0];
        }

        // ★ 修正: 完全一致のIDがあればそれを使い、無ければ予備のIDを使う
        const finalId = exactMatchId || foundMaterialId;
        
        let idDisplay = finalId ? `No.${finalId} ` : "";
        const imageFileName = finalId ? finalId : (typeof globalIdMap !== 'undefined' && globalIdMap[targetName] ? globalIdMap[targetName] : encodeURIComponent(targetName));

        html += `<div>
                    <h4 style="color: #2c3e50; border-bottom: 2px solid #bdc3c7; padding-bottom: 8px; margin-top: 0; margin-bottom: 15px; font-size: 16px;">💎 ドロップ素材</h4>
                    
                    <div class="search-result-header" style="margin-bottom: 15px;">
                        <div class="result-image-wrapper">
                            <img src="images/${imageFileName}.png" alt="${targetName}" 
                                 onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                            <span class="fallback-text" style="display:none;">${targetName}</span>
                        </div>
                        <h4 style="margin: 0; font-size: 16px; font-weight: bold;">${idDisplay}${targetName}</h4>
                    </div>
                    
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #555; font-size: 14px;">📍 ドロップ場所:</p>
                    <ul class="search-result-list" style="margin: 0; padding-left: 20px;">`;

        materialHits.forEach(res => {
            const safeDungeon = res.dungeon.replace(/'/g, "\\'");
            let noteHtml = res.note ? ` <span class="search-note" style="color: #e67e22; font-size: 12px; margin-left: 5px; font-weight: bold;">${res.note}</span>` : '';
            
            // ★ 追加: 複数の名前がヒットしている場合（部分一致含む）、どの素材か分かるように補足する
            let extraNameHtml = "";
            if (matchNames.length > 1) {
                extraNameHtml = ` <span style="font-size: 12px; color: #7f8c8d; margin-left: 5px;">(${res.exactName})</span>`;
            }

            html += `<li style="margin-bottom: 10px;">
                        <a href="javascript:void(0);" class="dungeon-link" onclick="jumpToDungeon('${safeDungeon}')" style="text-decoration: underline; color: #3498db; font-weight: bold; cursor: pointer; font-size: 14px;">
                            ${res.series} / ${res.dungeon}
                        </a> 
                        <span class="search-category" style="color: #27ae60; font-size: 13px; margin-left: 5px; font-weight: bold;">[${res.category}]</span>${noteHtml}${extraNameHtml}
                     </li>`;
        });

        html += `</ul></div>`;
    }

    resultDiv.innerHTML = html;
}