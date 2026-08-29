function showScreen(screenName) {
    document.getElementById('sectionTop').classList.add('hidden');
    document.getElementById('sectionSearch').classList.add('hidden');
    document.getElementById('sectionArena').classList.add('hidden');
    if (screenName === 'top') document.getElementById('sectionTop').classList.remove('hidden');
    else if (screenName === 'search') document.getElementById('sectionSearch').classList.remove('hidden');
    else if (screenName === 'arena') document.getElementById('sectionArena').classList.remove('hidden');
}

function jumpToDungeon(dungeonName) {
    showScreen('arena');
    setTimeout(() => {
        const safeId = encodeURIComponent(dungeonName);
        const target = document.getElementById(`dungeon-${safeId}`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            target.classList.remove('flash-highlight');
            setTimeout(() => {
                target.classList.add('flash-highlight');
            }, 10);

            setTimeout(() => {
                target.classList.remove('flash-highlight');
            }, 4000);
        }
    }, 50);
}

function jumpToSearch(itemName) {
    showScreen('search');
    document.getElementById('searchInput').value = itemName;
    if (typeof searchMaterial === 'function') {
        searchMaterial();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleBadgeClick(event, itemName) {
    const canHover = window.matchMedia('(hover: hover)').matches;
    
    if (!canHover) {
        const badge = event.currentTarget;
        if (badge.dataset.tapped !== "true") {
            badge.dataset.tapped = "true";
            setTimeout(() => { badge.dataset.tapped = "false"; }, 3000);
            return; 
        }
    }
    jumpToSearch(itemName);
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
            const safeId = encodeURIComponent(arena.name);
            const battleHtml = arena.battles ? `<span class="stamina-badge">バトル: ${arena.battles}</span>` : '';
            
            html += `<div class="item" id="dungeon-${safeId}">
                        <div class="item-title">${arena.name} <span class="stamina-badge">スタミナ: ${arena.stamina}</span> ${battleHtml}</div>`;
            
            if (arena.remarks && arena.remarks.length > 0) {
                html += `<div class="dungeon-remarks">`;
                arena.remarks.forEach(rem => {
                    html += `<div class="remark-item">
                                <span class="remark-label">${rem.label}</span>
                                <span class="remark-value">${rem.value}</span>
                             </div>`;
                });
                html += `</div>`;
            }

            arena.drops.forEach(dropCategory => {
                if (dropCategory.groups.length > 0) {
                    html += `<div class="drop-category">
                                <h4>${dropCategory.category}</h4>
                                <div class="category-groups">`;
                    
                    dropCategory.groups.forEach(group => {
                        html += `<div class="drop-group">`;
                        
                        group.items.forEach(itemName => {
                            const safeName = encodeURIComponent(itemName);
                            const safeJSName = itemName.replace(/'/g, "\\'");
                            
                            html += `<div class="material-badge" tabindex="0" onclick="handleBadgeClick(event, '${safeJSName}')">
                                        <img src="images/${safeName}.png" alt="${itemName}" 
                                             onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                                        <span class="fallback-text" style="display:none;">${itemName}</span>
                                        <span class="custom-tooltip">${itemName}</span>
                                     </div>`;
                        });

                        if (group.note) {
                            let displayNote = group.note;
                            if (!displayNote.match(/^[×xX～~]/)) displayNote = `(${displayNote})`;
                            html += `<div class="group-note">${displayNote}</div>`;
                        }
                        
                        html += `</div>`;
                    });
                    
                    html += `</div>`; 
                    
                    // ★ 交換レートを「折りたたみ形式」に変更
                    if (dropCategory.category === 'ボス・部位破壊' && arena.exchangeRate) {
                        const rates = arena.exchangeRate.split(',');
                        html += `<details class="exchange-details">
                                    <summary class="exchange-summary">🔄 部位破壊素材の交換目安を見る</summary>
                                    <div class="exchange-content">
                                        <ul class="exchange-list">`;
                        rates.forEach(r => {
                            if (r.trim()) html += `<li>${r.trim()}</li>`;
                        });
                        html += `       </ul>
                                    </div>
                                 </details>`;
                    }

                    html += `</div>`; 
                }
            });
            
            if (arena.warning) {
                const warningHtml = arena.warning.replace(/\n/g, '<br>');
                html += `<div class="dungeon-warning">${warningHtml}</div>`;
            }

            html += `</div>`;
        });
        html += `</div>`;
    }
    listDiv.innerHTML = html;
}