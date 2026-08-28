// --- 画面の切り替え処理 ---
function showScreen(screenName) {
    document.getElementById('sectionTop').classList.add('hidden');
    document.getElementById('sectionSearch').classList.add('hidden');
    document.getElementById('sectionArena').classList.add('hidden');

    if (screenName === 'top') {
        document.getElementById('sectionTop').classList.remove('hidden');
    } else if (screenName === 'search') {
        document.getElementById('sectionSearch').classList.remove('hidden');
    } else if (screenName === 'arena') {
        document.getElementById('sectionArena').classList.remove('hidden');
    }
}

// --- 報酬リスト表示処理 ---
function displayArenaList() {
    const listDiv = document.getElementById('arenaList');
    if (dungeonData.length === 0) {
        listDiv.innerHTML = "データを読み込み中か、データが存在しません。";
        return;
    }

    const groupedData = {};
    dungeonData.forEach(d => {
        if (!groupedData[d.series]) groupedData[d.series] = [];
        groupedData[d.series].push(d);
    });

    let html = "";
    for (const [seriesName, dungeons] of Object.entries(groupedData)) {
        html += `<div class="series-group"><h3>${seriesName}</h3>`;
        
        dungeons.forEach(arena => {
            let materialsHtml = '<div class="materials-container">';
            arena.rewards.forEach(reward => {
                // ★エラー時に question.png を表示し、下のテキストを表示させる
                materialsHtml += `
                    <div class="material-badge" title="${reward}">
                        <img src="images/${reward}.png" alt="${reward}" 
                             onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                        <span class="fallback-text" style="display:none;">${reward}</span>
                    </div>`;
            });
            materialsHtml += '</div>';

            html += `<div class="item">
                        <div class="item-title">${arena.name} <span class="stamina-badge">スタミナ: ${arena.stamina}</span></div>
                        ${materialsHtml}
                     </div>`;
        });
        html += `</div>`;
    }

    listDiv.innerHTML = html;
}