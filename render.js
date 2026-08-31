const ITEMS_PER_PAGE = 20;

function displayAnnouncements() {
    const listUl = document.getElementById('announcementList');
    if (!listUl) return;

    if (announcementData.length === 0) {
        listUl.innerHTML = "<li class='notice-item'>現在お知らせはありません。</li>";
        return;
    }

    const topNotices = announcementData.slice(0, 5);
    let html = "";
    topNotices.forEach(notice => {
        html += `<li class="notice-item" onclick="showNoticeDetail(${notice.id})">
                    <span class="notice-date-badge">${notice.date}</span>
                    <span class="notice-title-link">${notice.title}</span>
                 </li>`;
    });
    listUl.innerHTML = html;
}

function showNoticeList(page = 1) {
    const listUl = document.getElementById('fullAnnouncementList');
    const paginationArea = document.getElementById('paginationArea');
    if (!listUl) return;

    const totalPages = Math.ceil(announcementData.length / ITEMS_PER_PAGE) || 1; 
    const startIdx = (page - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const currentData = announcementData.slice(startIdx, endIdx);

    let html = "";
    if (currentData.length === 0) {
        html = "<li class='notice-item'>お知らせがありません。</li>";
    } else {
        currentData.forEach(notice => {
            html += `<li class="notice-item" onclick="showNoticeDetail(${notice.id})">
                        <span class="notice-date-badge">${notice.date}</span>
                        <span class="notice-title-link">${notice.title}</span>
                     </li>`;
        });
    }
    listUl.innerHTML = html;

    let pageHtml = `<div class="page-info-text">${page} ページ目 / 全 ${totalPages} ページ</div>
                    <div class="pagination-buttons">`;
    
    if (page > 1) {
        pageHtml += `<button class="page-btn" onclick="showNoticeList(${page - 1})">前へ</button>`;
    }
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === page) {
            pageHtml += `<button class="page-btn active">${i}</button>`;
        } else {
            pageHtml += `<button class="page-btn" onclick="showNoticeList(${i})">${i}</button>`;
        }
    }
    
    if (page < totalPages) {
        pageHtml += `<button class="page-btn" onclick="showNoticeList(${page + 1})">次へ</button>`;
    }
    
    pageHtml += `</div>`;
    paginationArea.innerHTML = pageHtml;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showNoticeDetail(id) {
    const notice = announcementData.find(n => n.id === id);
    if (notice) {
        document.getElementById('noticeTitle').textContent = notice.title;
        document.getElementById('noticeDate').textContent = notice.date;
        const formattedBody = notice.body.replace(/\n/g, '<br>');
        document.getElementById('noticeBody').innerHTML = formattedBody;
        
        showScreen('notice');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
            
            let titleExtra = "";
            if (arena.yinYang) {
                if (arena.yinYang.includes('陰')) {
                    titleExtra += `<img src="images/陰加護.png" alt="陰" class="yinyang-icon">`;
                } else if (arena.yinYang.includes('陽')) {
                    titleExtra += `<img src="images/陽加護.png" alt="陽" class="yinyang-icon">`;
                }
            }
            if (arena.gravity) titleExtra += `<span class="dungeon-condition">【超重力 ${arena.gravity}】</span>`;
            if (arena.altitude) titleExtra += `<span class="dungeon-condition">【超高度 ${arena.altitude}】</span>`;
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
                            <span class="dungeon-name">${arena.name}</span>
                            ${titleExtra} 
                            <span class="stamina-badge">スタミナ: ${arena.stamina}</span> 
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
                            const safeJSName = itemName.replace(/'/g, "\\'");
                            const imageFileName = globalIdMap[itemName] ? globalIdMap[itemName] : encodeURIComponent(itemName);
                            
                            html += `<div class="material-badge" tabindex="0" onclick="handleBadgeClick(event, '${safeJSName}')">
                                        <img src="images/${imageFileName}.png" alt="${itemName}" 
                                             onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                                        <span class="fallback-text" style="display:none;">${itemName}</span>
                                        <span class="custom-tooltip">${itemName}</span>
                                     </div>`;
                        });

                        if (group.note) {
                            let displayNote = group.note;
                            if (!displayNote.match(/^[×xX～~]/)) displayNote = `(${displayNote})`;
                            
                            // ★ 修正: 「※」を見つけたら改行に置換（先頭の「(」の直後は改行しない）
                            displayNote = displayNote.replace(/※/g, '<br>※').replace(/\(<br>※/g, '(※').replace(/^<br>※/g, '※');
                            
                            html += `<div class="group-note">${displayNote}</div>`;
                        }
                        
                        html += `</div>`;
                    });
                    
                    html += `</div>`; 
                    
                    if ((dropCategory.category === 'ボス・部位破壊' || dropCategory.category === 'ボス・乱入・部位破壊') && arena.exchangeRate) {
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

function displayNoteExample() {
    const container = document.getElementById('noteExampleDrop');
    if (!container) return;

    const targetDungeon = dungeonData.find(d => d.name === '大樹の霊王');
    if (!targetDungeon) {
        container.innerHTML = "<p style='color: #e74c3c; font-weight: bold;'>大樹の霊王のデータが見つかりません。</p>";
        return;
    }

    let html = `<h4 style="margin: 0 0 10px 0; color: #e74c3c; border-bottom: 1px dashed #bdc3c7; padding-bottom: 5px;">【例】大樹の霊王のドロップ</h4>`;
    
    targetDungeon.drops.forEach(dropCategory => {
        if (dropCategory.groups.length > 0) {
            html += `<div class="drop-category" style="margin-top: 5px; padding-top: 5px;">
                        <h4>${dropCategory.category}</h4>
                        <div class="category-groups">`;
            
            dropCategory.groups.forEach(group => {
                html += `<div class="drop-group">`;
                
                group.items.forEach(itemName => {
                    const safeJSName = itemName.replace(/'/g, "\\'");
                    const imageFileName = globalIdMap[itemName] ? globalIdMap[itemName] : encodeURIComponent(itemName);
                    
                    html += `<div class="material-badge" tabindex="0" onclick="handleBadgeClick(event, '${safeJSName}')">
                                <img src="images/${imageFileName}.png" alt="${itemName}" 
                                     onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                                <span class="fallback-text" style="display:none;">${itemName}</span>
                                <span class="custom-tooltip">${itemName}</span>
                             </div>`;
                });

                if (group.note) {
                    let displayNote = group.note;
                    if (!displayNote.match(/^[×xX～~]/)) displayNote = `(${displayNote})`;
                    
                    // ★ 修正: 注意書きサンプル部分も同様に改行処理を追加
                    displayNote = displayNote.replace(/※/g, '<br>※').replace(/\(<br>※/g, '(※').replace(/^<br>※/g, '※');
                    
                    html += `<div class="group-note">${displayNote}</div>`;
                }
                
                html += `</div>`;
            });
            
            html += `</div></div>`; 
        }
    });
    container.innerHTML = html;
}