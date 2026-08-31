function searchMaterial() {
    const input = document.getElementById('searchInput').value.trim();
    const resultDiv = document.getElementById('searchResult');
    
    const historyArea = document.getElementById('searchHistoryArea');
    if (historyArea) historyArea.style.display = 'none';
    
    if (!input) {
        resultDiv.innerHTML = "<p style='color: #e74c3c;'>素材名を入力してください。</p>";
        return;
    }

    saveSearchHistory(input);

    const results = [];
    let foundId = "";

    dungeonData.forEach(arena => {
        arena.allRewards.forEach(reward => {
            if (reward.name.includes(input)) {
                if (reward.id && !foundId) foundId = reward.id;
                
                results.push({
                    series: arena.series,
                    dungeon: arena.name,
                    category: reward.category,
                    note: reward.note,
                    exactName: reward.name
                });
            }
        });
    });

    if (results.length === 0) {
        resultDiv.innerHTML = `<p>「${input}」がドロップする闘技場は見つかりませんでした。</p>`;
        return;
    }

    const matchNames = [...new Set(results.map(r => r.exactName))];
    const targetName = matchNames.length === 1 ? matchNames[0] : input;

    let idDisplay = foundId ? `No.${foundId} ` : "";
    
    const imageFileName = foundId ? foundId : (typeof globalIdMap !== 'undefined' && globalIdMap[targetName] ? globalIdMap[targetName] : encodeURIComponent(targetName));

    let html = `<div class="search-result-header">
                    <div class="result-image-wrapper">
                        <img src="images/${imageFileName}.png" alt="${targetName}" 
                             onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                        <span class="fallback-text" style="display:none;">${targetName}</span>
                    </div>
                    <h3>${idDisplay}${targetName}</h3>
                </div>
                <p style="margin: 10px 0 5px 0; font-weight: bold; color: #555;">📍 ドロップ場所:</p>
                <ul class="search-result-list">`;

    results.forEach(res => {
        const safeDungeon = res.dungeon.replace(/'/g, "\\'");
        let noteHtml = res.note ? ` <span class="search-note">${res.note}</span>` : '';
        
        // ★修正: スマホでも確実にタップできるように <a> タグに戻し、下線を明示的に追加
        html += `<li style="margin-bottom: 8px;">
                    <a href="javascript:void(0);" class="dungeon-link" onclick="jumpToDungeon('${safeDungeon}')" style="text-decoration: underline; color: #3498db; font-weight: bold; cursor: pointer;">
                        ${res.series} / ${res.dungeon}
                    </a> 
                    <span class="search-category" style="color: #27ae60; font-size: 13px; margin-left: 5px;">[${res.category}]</span>${noteHtml}
                 </li>`;
    });

    html += `</ul>`;
    resultDiv.innerHTML = html;
}