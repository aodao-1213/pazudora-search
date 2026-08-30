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
    const safeTargetName = encodeURIComponent(targetName);

    // ★ 修正: onerror を追加して画像エラー時に question.png を表示する
    let html = `<div class="search-result-header">
                    <div class="result-image-wrapper">
                        <img src="images/${safeTargetName}.png" alt="${targetName}" 
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
        html += `<li>
                    <span class="dungeon-link" onclick="jumpToDungeon('${safeDungeon}')">
                        ${res.series} / ${res.dungeon}
                    </span> 
                    <span class="search-category">[${res.category}]</span>${noteHtml}
                 </li>`;
    });

    html += `</ul>`;
    resultDiv.innerHTML = html;
}