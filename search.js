function searchMaterial() {
    const input = document.getElementById('searchInput').value.trim();
    const resultDiv = document.getElementById('searchResult');
    
    const historyArea = document.getElementById('searchHistoryArea');
    if (historyArea) historyArea.style.display = 'none';
    
    if (!input) {
        resultDiv.innerHTML = "<p class='search-message is-error'>キーワードを入力してください。</p>";
        return;
    }

    // ※ここにあった saveSearchHistory(input); を下に移動しました

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

    // 何も見つからなかった場合はここで処理が終了し、履歴には保存されません
    if (dungeonHits.length === 0 && materialHits.length === 0) {
        resultDiv.innerHTML = `<p class="search-message">「${input}」に一致するダンジョンや素材は見つかりませんでした。</p>`;
        return;
    }

    // ★ 修正: 検索結果が1件以上あった場合のみ履歴に保存する
    saveSearchHistory(input);

    let html = `<h3 class="search-heading">🔍 検索結果</h3>`;

    if (dungeonHits.length > 0) {
        html += `<div class="search-section">
                    <h4 class="search-section-title">🏰 ダンジョン</h4>
                    <ul class="search-result-list">`;

        dungeonHits.forEach(arena => {
            const safeDungeon = arena.name.replace(/'/g, "\\'");
            html += `<li>
                        <a href="javascript:void(0);" class="search-link" onclick="jumpToDungeon('${safeDungeon}')">
                            <span class="search-link-main"><span class="search-link-series">${arena.series} /</span> ${arena.name}</span>
                        </a>
                     </li>`;
        });
        html += `</ul></div>`;
    }

    if (materialHits.length > 0) {
        html += `<div class="search-section">
                    <h4 class="search-section-title">💎 ドロップ素材</h4>`;

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
            let idDisplay = matData.id ? `<span class="search-result-id">No.${matData.id}</span>` : "";
            const imageFileName = matData.id ? matData.id : encodeURIComponent(matName);

            html += `<div class="search-material">
                        <div class="search-result-header">
                            <div class="result-image-wrapper">
                                <img src="images/${imageFileName}.png" alt="${matName}"
                                     onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                                <span class="fallback-text" style="display:none;">${matName}</span>
                            </div>
                            <h5 class="search-result-name">${idDisplay}${matName}</h5>
                        </div>
                        <ul class="search-result-list">`;

            matData.hits.forEach(res => {
                const safeDungeon = res.dungeon.replace(/'/g, "\\'");
                let noteHtml = res.note ? `<span class="search-note">${res.note}</span>` : '';

                html += `<li>
                            <a href="javascript:void(0);" class="search-link dungeon-link" onclick="jumpToDungeon('${safeDungeon}')">
                                <span class="search-link-main"><span class="search-link-series">${res.series} /</span> ${res.dungeon}</span>
                                <span class="search-category">${res.category}</span>${noteHtml}
                            </a>
                         </li>`;
            });

            html += `   </ul>
                     </div>`;
        }

        html += `</div>`;
    }

    resultDiv.innerHTML = html;
}