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
                
                const noteHtml = displayNote ? `<span class="search-note">${displayNote}</span>` : '';
                const locationStr = `${dungeon.series} / ${dungeon.name} <span class="search-category">[${reward.category}]</span> ${noteHtml}`;
                
                if (!foundMap[reward.name].includes(locationStr)) {
                    foundMap[reward.name].push(locationStr);
                }
            }
        });
    });

    const itemNames = Object.keys(foundMap);
    if (itemNames.length > 0) {
        let html = "";
        itemNames.forEach(name => {
            const safeName = encodeURIComponent(name);
            html += `<div class="item">
                        <div class="item-title">
                            <div class="material-badge" title="${name}">
                                <img src="images/${safeName}.png" alt="${name}" 
                                     onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                                <span class="fallback-text" style="display:none;">${name}</span>
                            </div>
                        </div>
                        <div style="margin-top: 8px;">📍 ドロップ場所:<br> ${foundMap[name].join('<br> ')}</div>
                     </div>`;
        });
        resultDiv.innerHTML = html;
    } else {
        resultDiv.innerHTML = "該当する素材は見つかりませんでした。";
    }
}