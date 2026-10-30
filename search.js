// ====================================================
// 素材・ダンジョン検索
// ・ダンジョン名／ステージ名と、素材名（ドロップ・交換）から探す
// ・素材の結果はカテゴリ（ボス・確定・確率・ランダム・交換）で絞り込める
// ・素材の種類が多い時は、素材ごとに折りたたんで表示する
// ====================================================

// 素材の種類がこれより多い時は、最初は折りたたんでおく
const SEARCH_OPEN_LIMIT = 5;

// 絞り込みのカテゴリ（チップ）
const SEARCH_FILTERS = [
    { key: 'all',      label: 'すべて' },
    { key: 'boss',     label: 'ボス・部位',  test: c => c.includes('ボス') },
    { key: 'fixed',    label: '確定',        test: c => c === '確定ドロップ' },
    { key: 'chance',   label: '確率',        test: c => c === '確率ドロップ' },
    { key: 'random',   label: 'ランダム',    test: c => c.includes('ランダム') },
    { key: 'exchange', label: '交換',        test: c => c.includes('交換') || c.includes('進化') }
];

// 直近の検索結果（絞り込みを切り替えた時に描き直すために覚えておく）
const lastSearch = { input: '', dungeonHits: [], materialHits: [], filter: 'all' };

// 全ダンジョンの「素材名 → どこで手に入る／使うか」の一覧
function collectSearchEntries() {
    const entries = [];
    dungeonData.forEach(arena => {
        const upcoming = isUpcomingDungeon(arena);
        arena.allRewards.forEach(reward => {
            entries.push({ name: reward.name, series: arena.series, dungeon: arena.name, upcoming, category: reward.category, note: reward.note, id: reward.id, isExchange: false });
        });
        (arena.exchanges || []).forEach(ex => {
            const isEvolve = ex.condition === '進化';
            entries.push({ name: ex.target, series: arena.series, dungeon: arena.name, upcoming, category: isEvolve ? '進化で入手' : '交換で入手', note: ex.rate, isExchange: true });
            ex.materials.forEach(m => {
                // 同じ素材を複数の交換で使うことがあるので、何の交換（進化）に使うかも出す
                entries.push({ name: m.name, series: arena.series, dungeon: arena.name, upcoming, category: isEvolve ? '進化に使う' : '交換に使う', note: m.count, forTarget: ex.target, isExchange: true });
            });
        });
    });
    return entries;
}

function searchMaterial() {
    const input = document.getElementById('searchInput').value.trim();
    const resultDiv = document.getElementById('searchResult');

    const historyArea = document.getElementById('searchHistoryArea');
    if (historyArea) historyArea.style.display = 'none';

    if (!input) {
        resultDiv.innerHTML = "<p class='search-message is-error'>キーワードを入力してください。</p>";
        return;
    }

    const entries = collectSearchEntries();
    // 素材名が完全に一致するものがあれば、それだけに絞る（「希石」で全部出てしまわないように）
    const hasExactMatch = entries.some(e => e.name === input);
    const materialHits = entries.filter(e => hasExactMatch ? e.name === input : e.name.includes(input));
    const dungeonHits = dungeonData.filter(arena => arena.name.includes(input) || arena.series.includes(input));

    // 何も見つからなかった場合はここで終了（履歴には保存しない）
    if (dungeonHits.length === 0 && materialHits.length === 0) {
        resultDiv.innerHTML = `<p class="search-message">「${input}」に一致するダンジョンや素材は見つかりませんでした。</p>`;
        return;
    }

    // 検索結果が1件以上あった場合のみ履歴に保存する
    saveSearchHistory(input);

    Object.assign(lastSearch, { input, dungeonHits, materialHits, filter: 'all' });
    renderSearchResults();
}

// 絞り込みのチップを押した時
function setSearchFilter(key) {
    lastSearch.filter = key;
    renderSearchResults();
}

function renderSearchResults() {
    const resultDiv = document.getElementById('searchResult');
    const { dungeonHits, materialHits, filter } = lastSearch;
    const materialNames = [...new Set(materialHits.map(h => h.name))];

    // 件数のまとめ
    const summary = [];
    if (dungeonHits.length) summary.push(`🏰 ダンジョン ${dungeonHits.length}件`);
    if (materialHits.length) summary.push(`💎 素材 ${materialNames.length}種類（${materialHits.length}件）`);
    let html = `<h3 class="search-heading">🔍 検索結果</h3>
                <p class="search-summary">${summary.join('<span class="search-summary-sep">／</span>')}</p>`;

    // 絞り込みのチップ（結果が無いカテゴリは出さない）
    if (materialHits.length) {
        const chips = SEARCH_FILTERS.map(f => {
            const count = f.key === 'all' ? materialHits.length : materialHits.filter(h => f.test(h.category)).length;
            if (count === 0) return '';
            return `<button type="button" class="search-chip${filter === f.key ? ' is-active' : ''}" onclick="setSearchFilter('${f.key}')">${f.label}<span class="search-chip-count">${count}</span></button>`;
        }).join('');
        html += `<div class="search-chips" role="group" aria-label="カテゴリで絞り込み">${chips}</div>`;
    }

    // ダンジョン（「すべて」の時だけ）
    if (dungeonHits.length > 0 && filter === 'all') {
        html += `<div class="search-section">
                    <h4 class="search-section-title">🏰 ダンジョン</h4>
                    <ul class="search-result-list">`;
        dungeonHits.forEach(arena => {
            const safeDungeon = arena.name.replace(/'/g, "\\'");
            html += `<li>
                        <a href="javascript:void(0);" class="search-link" onclick="jumpToDungeon('${safeDungeon}')">
                            <span class="search-link-main"><span class="search-link-series">${arena.series} /</span> ${arena.name}</span>${isUpcomingDungeon(arena) ? UPCOMING_BADGE_HTML : ''}
                        </a>
                     </li>`;
        });
        html += `</ul></div>`;
    }

    // 素材（カテゴリで絞り込み → 素材名ごとにまとめる）
    const activeFilter = SEARCH_FILTERS.find(f => f.key === filter);
    const hits = filter === 'all' ? materialHits : materialHits.filter(h => activeFilter.test(h.category));
    if (hits.length > 0) {
        const grouped = {};
        hits.forEach(h => {
            if (!grouped[h.name]) {
                grouped[h.name] = { id: h.id || (globalIdMap[h.name] || ''), hits: [] };
            }
            grouped[h.name].hits.push(h);
        });
        const names = Object.keys(grouped);
        const openAll = names.length <= SEARCH_OPEN_LIMIT;

        html += `<div class="search-section">
                    <h4 class="search-section-title">💎 素材${openAll ? '' : '<span class="search-section-hint">（名前を押すと一覧が開きます）</span>'}</h4>`;

        names.forEach(matName => {
            const mat = grouped[matName];
            const idDisplay = mat.id ? `<span class="search-result-id">No.${mat.id}</span>` : '';
            const imageFileName = mat.id ? mat.id : encodeURIComponent(matName);
            html += `<details class="search-material"${openAll ? ' open' : ''}>
                        <summary class="search-result-header">
                            <div class="result-image-wrapper">
                                <img src="images/${imageFileName}.png" alt="${matName}" loading="lazy"
                                     onerror="this.onerror=null; this.src='images/question.png'; this.nextElementSibling.style.display='block';">
                                <span class="fallback-text" style="display:none;">${matName}</span>
                            </div>
                            <h5 class="search-result-name">${idDisplay}${matName}</h5>
                            <span class="search-hit-count">${mat.hits.length}件</span>
                        </summary>
                        <ul class="search-result-list">`;

            mat.hits.forEach(res => {
                const safeDungeon = res.dungeon.replace(/'/g, "\\'");
                const noteHtml = res.note ? `<span class="search-note">${res.note}</span>` : '';
                const forHtml = res.forTarget ? `<span class="search-for-target">→ ${res.forTarget}</span>` : '';
                // 交換の結果から開いた時は、そのダンジョンの「素材の交換目安」も開く
                const jumpOpts = res.isExchange ? ', { openExchange: true }' : '';
                html += `<li>
                            <a href="javascript:void(0);" class="search-link dungeon-link" onclick="jumpToDungeon('${safeDungeon}'${jumpOpts})">
                                <span class="search-link-main"><span class="search-link-series">${res.series} /</span> ${res.dungeon}</span>${res.upcoming ? UPCOMING_BADGE_HTML : ''}
                                <span class="search-category${res.isExchange ? ' is-exchange' : ''}">${res.category}</span>${noteHtml}${forHtml}
                            </a>
                         </li>`;
            });

            html += `   </ul>
                     </details>`;
        });
        html += `</div>`;
    }

    resultDiv.innerHTML = html;
}
