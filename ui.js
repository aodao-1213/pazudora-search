function showScreen(screenName) {
    document.getElementById('sectionTop').classList.add('hidden');
    document.getElementById('sectionSearch').classList.add('hidden');
    document.getElementById('sectionArena').classList.add('hidden');
    if (screenName === 'top') document.getElementById('sectionTop').classList.remove('hidden');
    else if (screenName === 'search') document.getElementById('sectionSearch').classList.remove('hidden');
    else if (screenName === 'arena') document.getElementById('sectionArena').classList.remove('hidden');
}

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
            html += `<div class="item">
                        <div class="item-title">${arena.name} <span class="stamina-badge">スタミナ: ${arena.stamina}</span></div>`;
            
            arena.drops.forEach(dropCategory => {
                if (dropCategory.groups.length > 0) {
                    html += `<div class="drop-category">
                                <h4>${dropCategory.category}</h4>
                                <div class="category-groups">`;
                    
                    dropCategory.groups.forEach(group => {
                        html += `<div class="drop-group">`;
                        
                        group.items.forEach(itemName => {
                            const safeName = encodeURIComponent(itemName);
                            html += `<div class="material-badge" title="${itemName}">
                                        <img src="images/${safeName}.png" alt="${itemName}" 
                                             onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                                        <span class="fallback-text" style="display:none;">${itemName}</span>
                                     </div>`;
                        });

                        if (group.note) {
                            // 備考が「×」で始まらない場合はカッコ()をつける
                            let displayNote = group.note;
                            if (!displayNote.match(/^[×xX～~]/)) displayNote = `(${displayNote})`;
                            html += `<div class="group-note">${displayNote}</div>`;
                        }
                        
                        html += `</div>`; // end drop-group
                    });
                    html += `</div></div>`;
                }
            });
            html += `</div>`;
        });
        html += `</div>`;
    }
    listDiv.innerHTML = html;
}