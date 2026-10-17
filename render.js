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

// お知らせを開く（URLを #notice/番号 にして、直接開いたり再読み込みしても表示できるようにする）
function showNoticeDetail(id) {
    showScreen(`notice/${id}`);
}

// URLの番号に合わせてお知らせの中身を表示する（URLが変わった時と、データ読み込み後に呼ばれる）
function renderNoticeDetail() {
    const titleEl = document.getElementById('noticeTitle');
    const dateEl = document.getElementById('noticeDate');
    const bodyEl = document.getElementById('noticeBody');

    const idText = window.location.hash.replace('#', '').split('/')[1];
    const notice = announcementData.find(n => String(n.id) === idText);

    if (notice) {
        titleEl.textContent = notice.title;
        dateEl.textContent = notice.date;
        bodyEl.innerHTML = notice.body.replace(/\n/g, '<br>');
        setPageTitle(notice.title);
    } else if (announcementData.length === 0 && dungeonData.length === 0) {
        // まだExcelを読み込み中
        titleEl.textContent = '読み込み中…';
        dateEl.textContent = '';
        bodyEl.innerHTML = '';
    } else {
        titleEl.textContent = 'お知らせが見つかりませんでした';
        dateEl.textContent = '';
        bodyEl.innerHTML = '削除されたか、URLが間違っている可能性があります。<br><a href="#noticeList">お知らせ一覧を見る</a>';
        setPageTitle('お知らせ');
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
    if (!value) return { url: '', isArt: false, key: '' };
    let url, isArt;
    if (globalIdMap[value]) { url = `images/${globalIdMap[value]}.png`; isArt = false; }
    else if (value.includes('/')) { url = value; isArt = true; }
    else { url = `${BG_IMAGE_DIR}/${value.replace(/\.(png|jpe?g|webp|gif)$/i, '')}.jpg`; isArt = true; }
    // 表示位置の設定（backgrounds.json）は画像ファイル名（拡張子なし）で引く
    const key = url.split('/').pop().replace(/\.\w+$/, '');
    return { url, isArt, key };
}

// 画像ごとの「見せたい場所」{ x, y, zoom }（x, y は画像の中の位置を %、zoom は拡大率）
// backgrounds.json に無い画像は「横中央・上から40%」、アイコン画像は外枠が見えないよう少し拡大
function bgFocus(bg) {
    const saved = (bgFocusData && bgFocusData[bg.key]) || {};
    return {
        x: Number.isFinite(saved.x) ? saved.x : 50,
        y: Number.isFinite(saved.y) ? saved.y : 40,
        zoom: Number.isFinite(saved.zoom) ? saved.zoom : (bg.isArt ? 1 : 1.3)
    };
}

// カードの背景画像（右側に敷いて、左の文字側に向かって消えていく）。画像がなければ何も出さない
function tileBgHtml(bg, focusOverride) {
    if (!bg.url) return '';
    const f = focusOverride || bgFocus(bg); // focusOverride は管理画面のプレビュー用
    // 横長のカードでは画像の縦およそ6割が見える。「見せたい場所」がカードの真ん中あたりに来るよう、
    // 切り抜く位置（object-position の縦）をずらす。端の方の場所でも必ず枠の中に入るよう 0〜100% に収める
    const posY = Math.round(Math.min(100, Math.max(0, (f.y - 30) / 40 * 100)));
    const style = `object-position:${f.x}% ${posY}%;transform-origin:${f.x}% ${f.y}%;transform:scale(${f.zoom})`;
    return `<span class="tile-bg" aria-hidden="true"><img class="tile-bg-img" src="${encodeURI(bg.url)}" alt="" loading="lazy" decoding="async" style="${style}"></span>`;
}

function tileBgClass(bg) {
    if (!bg.url) return '';
    return bg.isArt ? ' has-bg is-art' : ' has-bg';
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

// 「追加日」からこの日数のあいだは「NEW」を付ける
const NEW_DAYS = 14;

function isNewDungeon(arena) {
    return !!arena.addedAt && Date.now() - arena.addedAt < NEW_DAYS * 86400000;
}

function newBadgeHtml(show) {
    return show ? '<span class="new-badge">NEW</span>' : '';
}

// ステージ・ダンジョン一覧の1枚分（背景にモンスター画像を敷いたカード）
function arenaTileHtml(href, title, subHtml, bg, isNew = false) {
    return `<a class="arena-tile${tileBgClass(bg)}" href="#${href}">
                ${tileBgHtml(bg)}
                <span class="tile-body">
                    <span class="tile-title">${newBadgeHtml(isNew)}${title}</span>
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
        // 戻り先（表示中の画面の1つ上）。ボタンの文字と必ず一致させる
        backButton.dataset.target = route.dungeon ? arenaHash(route.series)
            : route.series ? arenaHash()
            : 'top';
    }

    const title = document.getElementById('arenaTitle');
    if (title) title.textContent = route.series ? route.series : '闘技場シリーズ 報酬リスト';
}

// 戻るボタン：1つ上の階層へ
function arenaBack() {
    const backButton = document.getElementById('arenaBackButton');
    showScreen((backButton && backButton.dataset.target) || 'top');
}

// URLに合わせて報酬リスト画面を描画する（データ読み込み後と、URLが変わった時に呼ばれる）
function displayArenaList() {
    const listDiv = document.getElementById('arenaList');
    const route = getArenaRoute();

    if (dungeonData.length === 0) {
        updateArenaHeader({ series: '', dungeon: '' });
        setPageTitle('報酬リスト');
        listDiv.innerHTML = `<p class="search-message">データを読み込み中か、データが存在しません。</p>`;
        return;
    }

    const grouped = groupDungeonsBySeries();
    const dungeons = route.series ? grouped[route.series] : null;
    const arena = dungeons && route.dungeon ? dungeons.find(d => d.name === route.dungeon) : null;

    // Excel側でステージ名・ダンジョン名が変わると、古いブックマークのURLが存在しない名前になる。
    // その時は「見つかりませんでした」と出して、1つ上の一覧を表示する
    const notFoundHtml = (name) => `<div class="arena-not-found">「${name}」は見つかりませんでした。名前が変わったか、削除された可能性があります。下の一覧から選び直してください。</div>`;

    if (route.dungeon && arena) {
        updateArenaHeader(route);
        setPageTitle(`${arena.name}（${arena.series}）の報酬`);
        listDiv.innerHTML = dungeonDetailHtml(arena, dungeons);
    } else if (route.series && dungeons) {
        updateArenaHeader({ series: route.series, dungeon: '' });
        setPageTitle(`${route.series}のダンジョン一覧`);
        listDiv.innerHTML = (route.dungeon ? notFoundHtml(route.dungeon) : '') + dungeonListHtml(dungeons);
    } else {
        updateArenaHeader({ series: '', dungeon: '' });
        setPageTitle('報酬リスト');
        listDiv.innerHTML = (route.series ? notFoundHtml(route.series) : '') + stageListHtml(grouped);
    }
}

// [1] ステージ一覧
function stageListHtml(grouped) {
    const tiles = Object.entries(grouped).map(([seriesName, dungeons]) => {
        // ステージの背景は、背景モンスターが設定されている最初のダンジョンのものを使う
        const bgArena = dungeons.find(d => d.bgMonster);
        const sub = `<span class="tile-sub">${dungeons.length} ダンジョン</span>`;
        // 中に新しいダンジョンが1つでもあれば、ステージにも NEW を付ける
        return arenaTileHtml(arenaHash(seriesName), seriesName, sub, dungeonBg(bgArena), dungeons.some(isNewDungeon));
    });
    return `<div class="arena-tile-grid">${tiles.join('')}</div>`;
}

// [2] ダンジョン一覧（1つのステージ内）
function dungeonListHtml(dungeons) {
    const tiles = dungeons.map(arena =>
        arenaTileHtml(arenaHash(arena.series, arena.name), arena.name, dungeonStatsHtml(arena), dungeonBg(arena), isNewDungeon(arena))
    );
    return `<div class="arena-tile-grid">${tiles.join('')}</div>`;
}

// [3] ダンジョン1つ分の報酬
function dungeonDetailHtml(arena, dungeons) {
    const safeId = encodeURIComponent(arena.name);
    const bg = dungeonBg(arena);

    let html = `<div class="dungeon-detail" id="dungeon-${safeId}">
                    <div class="dungeon-hero${tileBgClass(bg)}">
                        ${tileBgHtml(bg)}
                        <div class="tile-body">
                            <h3 class="dungeon-name">${newBadgeHtml(isNewDungeon(arena))}${arena.name}</h3>
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

    // このダンジョンのページを共有する
    html += `<div class="share-bar">
                <span class="share-label">このページを共有</span>
                <button type="button" class="share-btn" onclick="copyShareUrl(this)">🔗 URLをコピー</button>
                <button type="button" class="share-btn share-btn-x" onclick="shareToX()">𝕏 でポスト</button>
             </div>`;
    return html;
}

// 共有用のURL（今の画面）。?admin=… などは付けない（テスター用のURLが広まらないように）
function shareUrl() {
    return `${location.origin}${location.pathname}${location.hash}`;
}

async function copyShareUrl(button) {
    const url = shareUrl();
    let ok = false;
    try {
        await navigator.clipboard.writeText(url);
        ok = true;
    } catch (e) {
        // 古いブラウザなど clipboard が使えない時の予備
        const area = document.createElement('textarea');
        area.value = url;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
        area.remove();
    }
    const label = button.textContent;
    button.textContent = ok ? '✓ コピーしました' : 'コピーできませんでした';
    button.classList.toggle('is-done', ok);
    setTimeout(() => {
        button.textContent = label;
        button.classList.remove('is-done');
    }, 2000);
}

function shareToX() {
    const text = document.title;
    const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl())}`;
    window.open(intent, '_blank', 'noopener,noreferrer');
}

// 補足（「(ボス本体)」「×3」など）の表示用。※ の前で改行する
function formatGroupNote(note) {
    let displayNote = note;
    if (!displayNote.match(/^[×xX～~]/)) displayNote = `(${displayNote})`;
    return displayNote.replace(/※/g, '<br>※').replace(/\(<br>※/g, '(※').replace(/^<br>※/g, '※');
}

// ランダムドロップ1グループ分：どのアイコンが同じグループかわかるよう細い枠で囲む（余白は最小限）。
// 個数「×7」は従来どおりアイコンの後ろに置く
function randomGroupHtml(group) {
    const note = group.note ? `<div class="group-note">${formatGroupNote(group.note)}</div>` : '';
    return `<div class="random-group">${group.items.map(name => materialBadgeHtml(name)).join('')}${note}</div>`;
}

// ドロップ欄（ボス・確定・確率・ランダム）。報酬画面と、注意書き画面の例で共通
function dropCategoriesHtml(drops) {
    let html = '';
    drops.forEach(dropCategory => {
        if (dropCategory.groups.length === 0) return;
        const isRandom = dropCategory.category.includes('ランダム');
        html += `<div class="drop-category">
                    <h4>${dropCategory.category}</h4>
                    <div class="category-groups${isRandom ? ' is-random' : ''}">`;

        dropCategory.groups.forEach(group => {
            if (isRandom) {
                html += randomGroupHtml(group);
                return;
            }
            html += `<div class="drop-group">`;
            group.items.forEach(itemName => {
                html += materialBadgeHtml(itemName);
            });
            if (group.note) html += `<div class="group-note">${formatGroupNote(group.note)}</div>`;
            html += `</div>`;
        });

        html += `</div></div>`;
    });
    return html;
}

// ドロップ・交換目安・注意書き
function dungeonBodyHtml(arena) {
    let html = dropCategoriesHtml(arena.drops);

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

    const html = `<h4 class="note-example-title">【例】大樹の霊王のドロップ</h4>` + dropCategoriesHtml(targetDungeon.drops);
    container.innerHTML = html;
}
