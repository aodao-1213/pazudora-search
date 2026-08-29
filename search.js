function searchMaterial() {
    const query = document.getElementById('searchInput').value.trim();
    const resultDiv = document.getElementById('searchResult');

    if (query === "") {
        resultDiv.innerHTML = "検索キーワードを入力してください。";
        return;
    }

    if (typeof saveSearchHistory === 'function') {
        saveSearchHistory(query);
    }
    
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