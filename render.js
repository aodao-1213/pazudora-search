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

    let html = `
        <details class="toc-details">
            <summary class="toc-summary">📑 ダンジョン目次</summary>
            <div class="toc-content">
                <ul class="toc-list">
    `;
    for (const seriesName of Object.keys(groupedData)) {
        const safeSeriesId = encodeURIComponent(seriesName);
        html += `<li><a href="javascript:void(0);" onclick="jumpToSeries('${safeSeriesId}')">${seriesName}</a></li>`;
    }
    html += `
                </ul>
            </div>
        </details>
    `;

    for (const [seriesName, dungeons] of Object.entries(groupedData)) {
        const safeSeriesId = encodeURIComponent(seriesName);
        html += `<div class="series-group" id="series-${safeSeriesId}"><h3>${seriesName}</h3>`;
        
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
                            displayNote = displayNote.replace(/※/g, '<br>※').replace(/\(<br>※/g, '(※').replace(/^<br>※/g, '※');
                            html += `<div class="group-note">${displayNote}</div>`;
                        }
                        
                        html += `</div>`;
                    });
                    
                    html += `</div></div>`; 
                }
            });
            
            if (arena.exchangeRate) {
                const rates = arena.exchangeRate.split(',');
                html += `<details class="exchange-details" style="margin-top: 15px;">
                            <summary class="exchange-summary">🔄 素材の交換目安を見る</summary>
                            <div class="exchange-content">
                                <ul class="exchange-list">`;
                rates.forEach(r => {
                    if (r.trim()) html += `<li>${r.trim()}</li>`;
                });
                html += `       </ul>
                            </div>
                         </details>`;
            }
            
            if (arena.warning) {
                let formattedWarning = arena.warning.replace(/([^\n(（>])\s*(※\d+)/g, '$1\n$2');
                let lines = formattedWarning.split(/\n/);
                
                let warningHtml = '';
                let currentNote = '';
                
                lines.forEach(line => {
                    line = line.trim();
                    if (!line) return;
                    
                    if (line.match(/^※/)) {
                        if (currentNote) warningHtml += `<div class="warning-item">${currentNote}</div>`;
                        currentNote = line;
                    } else {
                        if (currentNote) {
                            currentNote += `<br>${line}`;
                        } else {
                            warningHtml += `<div class="warning-item" style="padding-left: 0; text-indent: 0;">${line}</div>`;
                        }
                    }
                });
                if (currentNote) warningHtml += `<div class="warning-item">${currentNote}</div>`;
                
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

// -------------------------------------------------------------
// 【前回の修正漏れ対応部分】 parseExcelData内の処理を更新
// -------------------------------------------------------------
function parseCategory(text, isRandom) {
    if (!text) return [];
    let items = text.toString().split(',');
    let groups = [];
    let currentGroup = { items: [], note: "" };

    for (let item of items) {
        item = item.trim();
        if (!item) continue;
        
        let match = item.match(/^(.*?)(?:\((.*)\))?$/);
        let name = match[1].trim();
        let note = match[2] ? match[2].trim() : "";

        if (isRandom) {
            currentGroup.items.push(name);
            if (note) {
                currentGroup.note = note;
                groups.push(currentGroup);
                currentGroup = { items: [], note: "" };
            }
        } else {
            groups.push({ items: [name], note: note });
        }
    }
    if (isRandom && currentGroup.items.length > 0) {
        groups.push(currentGroup);
    }
    return groups;
}

function parseExcelData(data, idMap) {
    const result = [];
    const knownColumns = ['ステージ', 'ステージ名', 'ダンジョン', 'ダンジョン名', 'スタミナ', 'バトル', 'バトル数', '交換可能なレート', 'ボス・部位破壊', 'ボス・乱入・部位破壊', '確定ドロップ', '確率ドロップ', '確定ランダムドロップ', '確率ランダムドロップ', '注意書き', '陽/陰', '超重力', '超高度', 'その他の効果'];

    data.forEach(row => {
        const series = row['ステージ'] || row['ステージ名'] || 'その他';
        const name = row['ダンジョン'] || row['ダンジョン名'] || '不明';
        const stamina = row['スタミナ'] || '';
        const battles = row['バトル'] || row['バトル数'] || '';
        const exchangeRate = row['交換可能なレート'] ? String(row['交換可能なレート']).trim() : '';
        const warning = row['注意書き'] ? String(row['注意書き']).trim() : '';

        const yinYang = row['陽/陰'] ? String(row['陽/陰']).trim() : '';
        let gravity = row['超重力'] ? String(row['超重力']).trim() : '';
        let altitude = row['超高度'] ? String(row['超高度']).trim() : '';
        
        if (gravity.match(/^\d+\/\d+$/)) gravity = gravity.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        if (altitude.match(/^\d+\/\d+$/)) altitude = altitude.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        const rawOtherEffects = row['その他の効果'] ? String(row['その他の効果']).trim() : '';
        let effectName = '';
        let effectDetail = '';
        if (rawOtherEffects) {
            const match = rawOtherEffects.match(/^(【.*?】)(?:[,、]\s*(.*))?$/);
            if (match) {
                effectName = match[1];
                effectDetail = match[2] || '';
            } else {
                effectName = rawOtherEffects;
            }
        }

        const remarks = [];
        for (const key in row) {
            if (!knownColumns.includes(key)) {
                let val = String(row[key]).trim();
                if (!val) continue;

                val = val.replace(/,/g, ''); 
                val = val.replace(/\d+/g, match => Number(match).toLocaleString());

                if (key.includes('ポイント') || key.includes('プラス限界突破')) {
                    if (!val.startsWith('+')) val = '+' + val;
                }
                
                let displayLabel = key;
                if (key === 'ポイント') displayLabel = '+ポイント';
                if (key === 'プラス限界突破') displayLabel = '+限界突破';
                
                remarks.push({ label: displayLabel, value: val });
            }
        }

        const bossCategoryName = row['ボス・乱入・部位破壊'] ? 'ボス・乱入・部位破壊' : 'ボス・部位破壊';
        const bossCategoryData = row['ボス・乱入・部位破壊'] || row['ボス・部位破壊'];

        const drops = [
            // ★ 今回の修正箇所：bossCategoryData を解析する際、第2引数を true にしてグループ化を適用
            { category: bossCategoryName, groups: parseCategory(bossCategoryData, true) },
            { category: "確定ドロップ", groups: parseCategory(row['確定ドロップ'], false) },
            { category: "確率ドロップ", groups: parseCategory(row['確率ドロップ'], false) },
            { category: "確定ランダムドロップ", groups: parseCategory(row['確定ランダムドロップ'], true) },
            { category: "確率ランダムドロップ", groups: parseCategory(row['確率ランダムドロップ'], true) }
        ];

        const allRewards = [];
        drops.forEach(d => {
            d.groups.forEach(g => {
                g.items.forEach(item => {
                    allRewards.push({ 
                        name: item, 
                        category: d.category, 
                        note: g.note,
                        id: idMap[item] || "" 
                    });
                });
            });
        });

        result.push({ series, name, stamina, battles, remarks, exchangeRate, drops, allRewards, warning, yinYang, gravity, altitude, effectName, effectDetail });
    });
    return result;
}