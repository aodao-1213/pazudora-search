function searchMaterial() {
    const query = document.getElementById('searchInput').value.trim();
    const resultDiv = document.getElementById('searchResult');

    if (query === "") {
        resultDiv.innerHTML = "検索キーワードを入力してください。";
        return;
    }

    const foundMap = {};

    dungeonData.forEach(dungeon => {
        dungeon.allRewards.forEach(reward => {
            if (reward.name.includes(query)) {
                if (!foundMap[reward.name]) foundMap[reward.name] = [];
                
                let displayNote = reward.note;
                if (displayNote && !displayNote.match(/^[×xX～~]/)) displayNote = `(${displayNote})`;
                
                // ★ 場所名ではなく、データをそのまま保存する
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
            // 複数落ちる場合は一番上のダンジョンを代表ジャンプ先に
            const firstDungeon = locations[0].dungeonName;

            html += `<div class="item">
                        <!-- ★ 画像と名前をまとめ、クリックでジャンプするように設定 -->
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
            
            // ★ 個別のダンジョンテキストを押してもジャンプ可能に
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