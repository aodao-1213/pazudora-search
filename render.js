const ITEMS_PER_PAGE = 20;

// 素材アイコン1つ分のHTML（タップで検索・吹き出しで名前表示）。countText があればアイコン右下に「×50」のように重ねる
function materialBadgeHtml(itemName, countText = '') {
    const safeJSName = itemName.replace(/'/g, "\\'");
    const imageFileName = globalIdMap[itemName] ? globalIdMap[itemName] : encodeURIComponent(itemName);
    const countHtml = countText ? `<span class="badge-count">${countText}</span>` : '';

    return `<div class="material-badge" tabindex="0" onclick="handleBadgeClick(event, '${safeJSName}')">
                <img src="images/${imageFileName}.png" alt="${itemName}"
                     onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                <span class="fallback-text" style="display:none;">${itemName}</span>
                ${countHtml}
                <span class="custom-tooltip">${itemName}</span>
            </div>`;
}

// 交換先1体分のカード（ゲームの交換画面風：交換先 → 交換に必要なモンスター×数）
function exchangeCardHtml(ex) {
    const rateHtml = ex.rate ? `<span class="exchange-rate">${ex.rate}</span>` : '';
    const rateNoteHtml = ex.rateNote ? `<p class="exchange-rate-note">${ex.rateNote}</p>` : '';
    const materialsHtml = ex.materials.map(m => materialBadgeHtml(m.name, m.count)).join('');

    return `<div class="exchange-card">
                <div class="exchange-head">
                    ${materialBadgeHtml(ex.target)}
                    <div class="exchange-head-text">
                        <div class="exchange-target-name">${ex.target}</div>
                        ${rateHtml}
                    </div>
                </div>
                ${rateNoteHtml}
                <div class="exchange-need">
                    <div class="exchange-need-label">交換に必要なモンスター<span class="exchange-condition">（${ex.condition}）</span></div>
                    <div class="exchange-materials">${materialsHtml}</div>
                </div>
            </div>`;
}

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
        html += `<div class="series-group" id="series-${safeSeriesId}"><h3>${seriesName}</h3><div class="series-body">`;

        dungeons.forEach(arena => {
            const safeId = encodeURIComponent(arena.name);
            // アイコンが多いダンジョンは、PCの2列表示でも1行まるごと使う
            const isWide = arena.allRewards.length > 16;

            html += `<div class="item${isWide ? ' item-wide' : ''}" id="dungeon-${safeId}">
                        <div class="item-title">
                            <span class="dungeon-name">${arena.name}</span>
                        </div>`;

            // 経験値・コインなどは「経験値 1億 ／ コイン 30億 ／ …」の1行テキストにまとめる
            if (arena.remarks && arena.remarks.length > 0) {
                const stats = arena.remarks.map(rem => {
                    // 「+ポイント +2,970」のように + が重複しないよう、ラベル側に + がある時は値の + を外す
                    const value = rem.label.startsWith('+') ? rem.value.replace(/^\+/, '') : rem.value;
                    return `<span class="stat-item"><span class="stat-label">${rem.label}</span> <span class="stat-value">${value}</span></span>`;
                });
                html += `<div class="dungeon-stats">${stats.join('<span class="stat-sep">／</span>')}</div>`;
            }

            arena.drops.forEach(dropCategory => {
                if (dropCategory.groups.length > 0) {
                    html += `<div class="drop-category">
                                <h4>${dropCategory.category}</h4>
                                <div class="category-groups">`;
                    
                    dropCategory.groups.forEach(group => {
                        html += `<div class="drop-group">`;
                        
                        group.items.forEach(itemName => {
                            html += materialBadgeHtml(itemName);
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
            
            if (arena.exchanges && arena.exchanges.length > 0) {
                // 「交換」シートにデータがあるダンジョンは、ゲームの交換画面のような表示にする
                html += `<details class="exchange-details">
                            <summary class="exchange-summary">🔄 素材の交換目安を見る</summary>
                            <div class="exchange-content exchange-cards">
                                ${arena.exchanges.map(exchangeCardHtml).join('')}
                            </div>
                         </details>`;
            } else if (arena.exchangeRate) {
                // まだ「交換」シートに移していないダンジョンは、従来の「交換可能なレート」列を文字で表示
                const rates = arena.exchangeRate.split(',');
                html += `<details class="exchange-details">
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
        html += `</div></div>`;
    }
    listDiv.innerHTML = html;
}

function displayNoteExample() {
    const container = document.getElementById('noteExampleDrop');
    if (!container) return;

    const targetDungeon = dungeonData.find(d => d.name === '大樹の霊王');
    if (!targetDungeon) {
        container.innerHTML = "<p class='search-message is-error'>大樹の霊王のデータが見つかりません。</p>";
        return;
    }

    let html = `<h4 class="note-example-title">【例】大樹の霊王のドロップ</h4>`;

    targetDungeon.drops.forEach(dropCategory => {
        if (dropCategory.groups.length > 0) {
            html += `<div class="drop-category">
                        <h4>${dropCategory.category}</h4>
                        <div class="category-groups">`;
            
            dropCategory.groups.forEach(group => {
                html += `<div class="drop-group">`;
                
                group.items.forEach(itemName => {
                    html += materialBadgeHtml(itemName);
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
    const knownColumns = ['ステージ', 'ステージ名', 'ダンジョン', 'ダンジョン名', '交換可能なレート', 'ボス・部位破壊', 'ボス・乱入・部位破壊', '確定ドロップ', '確率ドロップ', '確定ランダムドロップ', '確率ランダムドロップ', '注意書き'];

    data.forEach(row => {
        const series = row['ステージ'] || row['ステージ名'] || 'その他';
        const name = row['ダンジョン'] || row['ダンジョン名'] || '不明';
        const exchangeRate = row['交換可能なレート'] ? String(row['交換可能なレート']).trim() : '';
        const warning = row['注意書き'] ? String(row['注意書き']).trim() : '';

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

        result.push({ series, name, remarks, exchangeRate, drops, allRewards, warning });
    });
    return result;
}
