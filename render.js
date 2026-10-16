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
    // 条件列が「進化」の時はドット進化などの素材なので見出しを変える（それ以外は「すべて」「いずれか」などを見出しの後ろに付ける）
    const needLabel = ex.condition === '進化'
        ? '進化に必要なモンスター'
        : `交換に必要なモンスター<span class="exchange-condition">（${ex.condition}）</span>`;

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
                    <div class="exchange-need-label">${needLabel}</div>
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

// ====================================================
// 報酬リスト：[ステージ一覧] → [ダンジョン一覧] → [報酬] の3段階で表示する
// URLは #arena / #arena/ステージ名 / #arena/ステージ名/ダンジョン名
// ====================================================

// 今のURLから、どのステージ・ダンジョンを表示するかを読み取る
function getArenaRoute() {
    const parts = window.location.hash.replace('#', '').split('/');
    const decode = (s) => {
        try { return decodeURIComponent(s); } catch (e) { return s; }
    };
    return {
        series: parts[1] ? decode(parts[1]) : '',
        dungeon: parts[2] ? decode(parts[2]) : ''
    };
}

function arenaHash(series, dungeon) {
    let hash = 'arena';
    if (series) hash += '/' + encodeURIComponent(series);
    if (dungeon) hash += '/' + encodeURIComponent(dungeon);
    return hash;
}

// ステージ名ごとにダンジョンをまとめる（Excelの並び順のまま）
function groupDungeonsBySeries() {
    const grouped = {};
    dungeonData.forEach(d => {
        if (!grouped[d.series]) grouped[d.series] = [];
        grouped[d.series].push(d);
    });
    return grouped;
}

// 背景用イラストの軽量版を入れるフォルダ
// 元の大きい画像は images_1 に置き、web_try2_tools\make_bg_light.bat で images_bg に軽量版（横800pxのjpg）を作る
const BG_IMAGE_DIR = 'images_bg';

// 「背景モンスター」列 → 背景画像 { url, isArt }
// ・素材名と図鑑番号の対応シートにあるモンスター名 → アイコン画像 images/図鑑No.png
// ・それ以外（例：13585_1 / 13585_1.png）→ images_bg フォルダの軽量版 13585_1.jpg
// ・「/」を含む場合はそのままのパス
function dungeonBg(arena) {
    const value = arena && arena.bgMonster;
    if (!value) return { url: '', isArt: false };
    if (globalIdMap[value]) return { url: `images/${globalIdMap[value]}.png`, isArt: false };
    if (value.includes('/')) return { url: value, isArt: true };
    const baseName = value.replace(/\.(png|jpe?g|webp|gif)$/i, '');
    return { url: `${BG_IMAGE_DIR}/${baseName}.jpg`, isArt: true };
}

// 背景画像の指定（class名とstyle属性）。画像がなければ何も付けない
function tileBgAttrs(bg) {
    if (!bg.url) return { cls: '', style: '' };
    const safeUrl = encodeURI(bg.url).replace(/'/g, '%27');
    return {
        cls: bg.isArt ? ' has-bg is-art' : ' has-bg',
        style: ` style='--tile-bg: url("${safeUrl}")'`
    };
}

// 経験値・コインなどの1行テキスト（「経験値 1億 ／ コイン 30億 ／ …」）
function dungeonStatsHtml(arena) {
    if (!arena.remarks || arena.remarks.length === 0) return '';
    const stats = arena.remarks.map(rem => {
        // 「+ポイント +2,970」のように + が重複しないよう、ラベル側に + がある時は値の + を外す
        const value = rem.label.startsWith('+') ? rem.value.replace(/^\+/, '') : rem.value;
        return `<span class="stat-item"><span class="stat-label">${rem.label}</span> <span class="stat-value">${value}</span></span>`;
    });
    return `<div class="dungeon-stats">${stats.join('<span class="stat-sep">／</span>')}</div>`;
}

// ステージ・ダンジョン一覧の1枚分（背景にモンスター画像を敷いたカード）
function arenaTileHtml(href, title, subHtml, bg) {
    const attrs = tileBgAttrs(bg);
    return `<a class="arena-tile${attrs.cls}" href="#${href}"${attrs.style}>
                <span class="tile-bg" aria-hidden="true"></span>
                <span class="tile-body">
                    <span class="tile-title">${title}</span>
                    ${subHtml}
                </span>
                <span class="tile-arrow" aria-hidden="true">➤</span>
            </a>`;
}

// 画面上部のパンくず（トップ › 報酬リスト › ステージ › ダンジョン）と戻るボタンを更新する
function updateArenaHeader(route) {
    const crumbs = [{ label: 'トップ', hash: 'top' }, { label: '報酬リスト', hash: arenaHash() }];
    if (route.series) crumbs.push({ label: route.series, hash: arenaHash(route.series) });
    if (route.dungeon) crumbs.push({ label: route.dungeon, hash: arenaHash(route.series, route.dungeon) });

    const breadcrumb = document.getElementById('arenaBreadcrumb');
    if (breadcrumb) {
        breadcrumb.innerHTML = crumbs.map((c, i) => i === crumbs.length - 1
            ? `<span class="crumb-current" aria-current="page">${c.label}</span>`
            : `<a href="#${c.hash}">${c.label}</a>`
        ).join('<span class="crumb-sep">›</span>');
    }

    const backButton = document.getElementById('arenaBackButton');
    if (backButton) {
        backButton.textContent = route.dungeon ? '← ダンジョン一覧に戻る'
            : route.series ? '← ステージ一覧に戻る'
            : '← トップに戻る';
    }

    const title = document.getElementById('arenaTitle');
    if (title) title.textContent = route.series ? route.series : '闘技場シリーズ 報酬リスト';
}

// 戻るボタン：1つ上の階層へ
function arenaBack() {
    const route = getArenaRoute();
    if (route.dungeon) showScreen(arenaHash(route.series));
    else if (route.series) showScreen(arenaHash());
    else showScreen('top');
}

// URLに合わせて報酬リスト画面を描画する（データ読み込み後と、URLが変わった時に呼ばれる）
function displayArenaList() {
    const listDiv = document.getElementById('arenaList');
    const route = getArenaRoute();
    updateArenaHeader(route);

    if (dungeonData.length === 0) {
        listDiv.innerHTML = `<p class="search-message">データを読み込み中か、データが存在しません。</p>`;
        return;
    }

    const grouped = groupDungeonsBySeries();
    const dungeons = route.series ? grouped[route.series] : null;
    const arena = dungeons && route.dungeon ? dungeons.find(d => d.name === route.dungeon) : null;

    if (route.dungeon && arena) {
        listDiv.innerHTML = dungeonDetailHtml(arena, dungeons);
    } else if (route.series && dungeons) {
        listDiv.innerHTML = dungeonListHtml(dungeons);
    } else {
        listDiv.innerHTML = stageListHtml(grouped);
    }
}

// [1] ステージ一覧
function stageListHtml(grouped) {
    const tiles = Object.entries(grouped).map(([seriesName, dungeons]) => {
        // ステージの背景は、背景モンスターが設定されている最初のダンジョンのものを使う
        const bgArena = dungeons.find(d => d.bgMonster);
        const sub = `<span class="tile-sub">${dungeons.length} ダンジョン</span>`;
        return arenaTileHtml(arenaHash(seriesName), seriesName, sub, dungeonBg(bgArena));
    });
    return `<div class="arena-tile-grid">${tiles.join('')}</div>`;
}

// [2] ダンジョン一覧（1つのステージ内）
function dungeonListHtml(dungeons) {
    const tiles = dungeons.map(arena =>
        arenaTileHtml(arenaHash(arena.series, arena.name), arena.name, dungeonStatsHtml(arena), dungeonBg(arena))
    );
    return `<div class="arena-tile-grid">${tiles.join('')}</div>`;
}

// [3] ダンジョン1つ分の報酬
function dungeonDetailHtml(arena, dungeons) {
    const safeId = encodeURIComponent(arena.name);
    const attrs = tileBgAttrs(dungeonBg(arena));

    let html = `<div class="dungeon-detail" id="dungeon-${safeId}">
                    <div class="dungeon-hero${attrs.cls}"${attrs.style}>
                        <span class="tile-bg" aria-hidden="true"></span>
                        <div class="tile-body">
                            <h3 class="dungeon-name">${arena.name}</h3>
                            ${dungeonStatsHtml(arena)}
                        </div>
                    </div>
                    <div class="dungeon-body">
                        ${dungeonBodyHtml(arena)}
                    </div>
                </div>`;

    // 同じステージ内の前後のダンジョンへ移動できるようにする
    const index = dungeons.indexOf(arena);
    const prev = dungeons[index - 1];
    const next = dungeons[index + 1];
    html += `<nav class="dungeon-pager">
                ${prev ? `<a class="pager-link pager-prev" href="#${arenaHash(prev.series, prev.name)}"><span class="pager-dir">← 前</span><span class="pager-name">${prev.name}</span></a>` : '<span></span>'}
                ${next ? `<a class="pager-link pager-next" href="#${arenaHash(next.series, next.name)}"><span class="pager-dir">次 →</span><span class="pager-name">${next.name}</span></a>` : '<span></span>'}
             </nav>`;
    return html;
}

// ドロップ・交換目安・注意書き
function dungeonBodyHtml(arena) {
    let html = '';

    arena.drops.forEach(dropCategory => {
        if (dropCategory.groups.length === 0) return;
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
        const rates = arena.exchangeRate.split(',').map(r => r.trim()).filter(Boolean);
        html += `<details class="exchange-details">
                    <summary class="exchange-summary">🔄 素材の交換目安を見る</summary>
                    <div class="exchange-content">
                        <ul class="exchange-list">${rates.map(r => `<li>${r}</li>`).join('')}</ul>
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

    return html;
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
    const knownColumns = ['ステージ', 'ステージ名', 'ダンジョン', 'ダンジョン名', '交換可能なレート', 'ボス・部位破壊', 'ボス・乱入・部位破壊', '確定ドロップ', '確率ドロップ', '確定ランダムドロップ', '確率ランダムドロップ', '注意書き', '背景モンスター'];

    data.forEach(row => {
        const series = row['ステージ'] || row['ステージ名'] || 'その他';
        const name = row['ダンジョン'] || row['ダンジョン名'] || '不明';
        const exchangeRate = row['交換可能なレート'] ? String(row['交換可能なレート']).trim() : '';
        const warning = row['注意書き'] ? String(row['注意書き']).trim() : '';
        // ダンジョン一覧のカード背景に使うモンスター名（または画像ファイル名）
        const bgMonster = row['背景モンスター'] ? String(row['背景モンスター']).trim() : '';

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

        result.push({ series, name, remarks, exchangeRate, drops, allRewards, warning, bgMonster });
    });
    return result;
}
