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
            
            let titleExtra = "";
            
            // 1. 陰/陽 アイコン（一番前）
            if (arena.yinYang) {
                if (arena.yinYang.includes('陰')) {
                    titleExtra += `<img src="images/陰加護.png" alt="陰" class="yinyang-icon">`;
                } else if (arena.yinYang.includes('陽')) {
                    titleExtra += `<img src="images/陽加護.png" alt="陽" class="yinyang-icon">`;
                }
            }
            
            // 2. 超重力・超高度
            if (arena.gravity) titleExtra += `<span class="dungeon-condition">【超重力 ${arena.gravity}】</span>`;
            if (arena.altitude) titleExtra += `<span class="dungeon-condition">【超高度 ${arena.altitude}】</span>`;
            
            // 3. その他の効果（ツールチップ対応）
            if (arena.effectName) {
                if (arena.effectDetail) {
                    titleExtra += `<span class="dungeon-condition condition-tooltip-container" tabindex="0">
                                       ${arena.effectName}
                                       <span class="custom-tooltip">${arena.effectDetail}</span>
                                   </span>`;
                } else {
                    titleExtra += `<span class="dungeon-condition">${arena.effectName}</span>`;
                }
            }
            
            html += `<div class="item" id="dungeon-${safeId}">
                        <div class="item-title">
                            ${arena.name}${titleExtra} 
                            <span class="stamina-badge" style="margin-left: 8px;">スタミナ: ${arena.stamina}</span> 
                            ${battleHtml}
                        </div>`;
            
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