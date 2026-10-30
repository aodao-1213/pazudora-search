// ====================================================
// 管理画面（#admin）：メンテ期間とお知らせをサイト上で編集して、GitHub に直接保存する
//
// ・保存先は GitHub リポジトリの maintenance.json / announcements.json
// ・書き込みには GitHub の「アクセストークン」が必要（このブラウザにだけ保存される）
// ・保存してから公開サイトに反映されるまで 1〜2 分かかる（GitHub Pages の更新待ち）
// ====================================================

const GITHUB_REPO = { owner: 'aodao-1213', repo: 'pazudora-search', branch: 'main' };
const ADMIN_TOKEN_KEY = 'padAdminGithubToken';

// 管理画面で編集中のデータ
const adminState = {
    periods: [],        // [{ start: '2026/10/20 10:00' or '未定', end: ... }]
    announcements: [],  // [{ id, date: '2026/10/20', title, body }]
    editingId: null,    // お知らせを編集中ならその id
    bgFocus: {},        // 背景の表示位置 { 画像ファイル名: { x, y, zoom } }（ステージ・ダンジョン一覧のカード用）
    bgHeroFocus: {},    // 同じ形の報酬画面の上の帯用
    bgTarget: 'card',   // 背景の位置を調整中なのは 'card'（カード）か 'hero'（報酬画面の帯）か
    bgDungeon: '',      // 背景の位置を調整中のダンジョン名
    bgDirty: false,     // 背景の位置に保存していない変更があるか
    loaded: false
};

// ---------- 小さな道具 ----------

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getAdminToken() {
    try { return localStorage.getItem(ADMIN_TOKEN_KEY) || ''; } catch (e) { return ''; }
}

function setAdminToken(token) {
    try {
        if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
        else localStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch (e) { /* 保存できない環境ではこのページを開いている間だけ使う */ }
}

// 日本語を含む文字列を GitHub API 用の base64 にする（とその逆）
function utf8ToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary);
}

function base64ToUtf8(base64) {
    const binary = atob(base64.replace(/\s/g, ''));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

// 「2026/10/20 10:00」⇔ 入力欄（datetime-local）の「2026-10-20T10:00」
function toDateTimeInput(value) {
    if (!value || value === '未定') return '';
    const m = String(value).match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})[ T]?(\d{1,2})?:?(\d{2})?/);
    if (!m) return '';
    const pad = (n) => String(n || 0).padStart(2, '0');
    return `${m[1]}-${pad(m[2])}-${pad(m[3])}T${pad(m[4])}:${pad(m[5])}`;
}

function fromDateTimeInput(value) {
    return value ? value.replace(/-/g, '/').replace('T', ' ') : '';
}

// 「2026/10/20」⇔ 入力欄（date）の「2026-10-20」
function toDateInput(value) {
    const m = String(value || '').match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
    return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : '';
}

function todayDateInput() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 各パネルの下に結果メッセージを出す（type: 'ok' / 'error' / 'info'）
function showAdminMessage(id, text, type = 'info') {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = `admin-message is-${type}`;
    el.hidden = !text;
}

function setAdminBusy(busy) {
    document.querySelectorAll('#sectionAdmin button').forEach(btn => { btn.disabled = busy; });
    if (!busy) refreshUploadButtons();
}

// アップロードの「保存」ボタンは、ファイルを選んでいる時だけ押せるようにする
function refreshUploadButtons() {
    const excelSave = document.getElementById('adminExcelSave');
    if (excelSave) excelSave.disabled = !(typeof excelUpload !== 'undefined' && excelUpload.compiled);
    const bgSave = document.getElementById('adminBgUploadSave');
    if (bgSave) bgSave.disabled = !(typeof bgUploads !== 'undefined' && bgUploads.some(u => !u.error));
    const iconSave = document.getElementById('adminIconUploadSave');
    if (iconSave) iconSave.disabled = !(typeof iconUploads !== 'undefined' && iconUploads.some(u => !u.error && u.id));
    if (typeof imageSelection !== 'undefined') {
        const bgDel = document.getElementById('adminBgDelete');
        if (bgDel) bgDel.disabled = imageSelection.bg.size === 0;
        const iconDel = document.getElementById('adminIconDelete');
        if (iconDel) iconDel.disabled = imageSelection.icon.size === 0;
    }
}

// ---------- GitHub API ----------

async function githubRequest(method, path, body) {
    const token = getAdminToken();
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO.owner}/${GITHUB_REPO.repo}${path}`, {
        method,
        headers: {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
            ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store'
    });
    let data = null;
    try { data = await response.json(); } catch (e) { /* 中身が無いレスポンス */ }
    return { ok: response.ok, status: response.status, data };
}

function githubErrorText(status) {
    if (status === 401) return 'トークンが正しくないか、期限が切れています。新しいトークンを登録してください。';
    if (status === 403) return 'このトークンには書き込み権限がありません。「Contents: Read and write」を付けて作り直してください。';
    if (status === 404) return 'リポジトリが見つからないか、トークンがこのリポジトリを選んでいません。';
    if (status === 409) return '同時に別の更新があったため保存できませんでした。もう一度「保存」を押してください。';
    return `GitHub への保存に失敗しました（エラー ${status}）。少し待ってからもう一度試してください。`;
}

// GitHub 上の JSON ファイルを読む。無ければ data: null
async function readJsonFromGitHub(path) {
    const res = await githubRequest('GET', `/contents/${path}?ref=${GITHUB_REPO.branch}`);
    if (res.status === 404) return { data: null, sha: null };
    if (!res.ok) throw new Error(githubErrorText(res.status));
    return { data: JSON.parse(base64ToUtf8(res.data.content)), sha: res.data.sha };
}

// GitHub 上の JSON ファイルを書き換える（1回の保存 = 1コミット）
async function writeJsonToGitHub(path, data, message) {
    // 直前の版（sha）を取り直してから書き込む
    const current = await githubRequest('GET', `/contents/${path}?ref=${GITHUB_REPO.branch}`);
    if (!current.ok && current.status !== 404) throw new Error(githubErrorText(current.status));

    const res = await githubRequest('PUT', `/contents/${path}`, {
        message,
        content: utf8ToBase64(JSON.stringify(data, null, 2) + '\n'),
        branch: GITHUB_REPO.branch,
        ...(current.ok ? { sha: current.data.sha } : {})
    });
    if (!res.ok) throw new Error(githubErrorText(res.status));
}

// ---------- 画面全体 ----------

// #admin を開いた時に呼ばれる
async function renderAdmin() {
    renderTokenStatus();
    updateAdminVisibility();
    if (!adminState.loaded) await loadAdminData();
    renderMaintenanceEditor();
    renderAnnouncementEditor();
    renderBgEditor();
    renderBgUploadList();
    renderIconUploadList();
    refreshUploadButtons();
    // 登録済みの画像の一覧（GitHub から読む。トークンがある時だけ）
    if (getAdminToken()) {
        await Promise.all([loadImageList('bg'), loadImageList('icon')]);
    } else {
        renderImageList('bg');
        renderImageList('icon');
    }
}

// 編集するデータを読み込む。トークンがあれば GitHub から最新を、無ければ今サイトに出ている内容を使う
async function loadAdminData() {
    const fromSite = () => {
        adminState.periods = maintenanceData.map(m => ({ start: m.startStr, end: m.endStr }));
        adminState.announcements = announcementData.map(n => ({ ...n }));
        adminState.bgFocus = JSON.parse(JSON.stringify(bgFocusData || {}));
        adminState.bgHeroFocus = JSON.parse(JSON.stringify(bgHeroFocusData || {}));
        adminState.bgDirty = false;
    };

    if (!getAdminToken()) {
        fromSite();
        // サイトのデータを読み込み終わる前に開いた時は、読み込み後にもう一度読み直す
        adminState.loaded = (settingsLoaded.maintenance && settingsLoaded.announcements) || dungeonData.length > 0;
        return;
    }

    try {
        const [mainte, notices, backgrounds] = await Promise.all([
            readJsonFromGitHub(SETTINGS_FILES.maintenance),
            readJsonFromGitHub(SETTINGS_FILES.announcements),
            readJsonFromGitHub(SETTINGS_FILES.backgrounds)
        ]);
        fromSite();
        if (mainte.data && Array.isArray(mainte.data.periods)) adminState.periods = mainte.data.periods.map(p => ({ start: p.start, end: p.end }));
        if (notices.data && Array.isArray(notices.data.items)) adminState.announcements = notices.data.items.map(n => ({ ...n }));
        if (backgrounds.data && backgrounds.data.images) adminState.bgFocus = backgrounds.data.images;
        if (backgrounds.data && backgrounds.data.heroImages) adminState.bgHeroFocus = backgrounds.data.heroImages;
        adminState.loaded = true;
    } catch (e) {
        fromSite();
        adminState.loaded = true;
        showAdminMessage('adminTokenMessage', `GitHub から最新の内容を読み込めませんでした：${e.message}`, 'error');
    }
}

// ---------- GitHub 接続（トークン） ----------

function renderTokenStatus() {
    const status = document.getElementById('adminTokenStatus');
    const hasToken = !!getAdminToken();
    if (status) {
        status.textContent = hasToken ? '登録済み（このブラウザに保存されています）' : '未登録（保存ボタンを使うには登録が必要です）';
        status.className = `admin-status ${hasToken ? 'is-ok' : 'is-warn'}`;
    }
}

async function saveAdminToken() {
    const input = document.getElementById('adminTokenInput');
    const token = input.value.trim();
    if (!token) {
        showAdminMessage('adminTokenMessage', 'トークンを貼り付けてから「登録」を押してください。', 'error');
        return;
    }
    setAdminToken(token);
    input.value = '';
    renderTokenStatus();
    await testAdminToken();
    // GitHub 上の最新の内容で編集画面を読み直す
    adminState.loaded = false;
    await renderAdmin();
}

async function testAdminToken() {
    if (!getAdminToken()) {
        showAdminMessage('adminTokenMessage', 'トークンが登録されていません。', 'error');
        return false;
    }
    showAdminMessage('adminTokenMessage', 'GitHub に接続しています…', 'info');
    try {
        const res = await githubRequest('GET', '');
        if (!res.ok) throw new Error(githubErrorText(res.status));
        if (!res.data.permissions || !res.data.permissions.push) throw new Error(githubErrorText(403));
        showAdminMessage('adminTokenMessage', `接続OK：${GITHUB_REPO.owner}/${GITHUB_REPO.repo} に保存できます。`, 'ok');
        return true;
    } catch (e) {
        showAdminMessage('adminTokenMessage', e.message, 'error');
        return false;
    }
}

function removeAdminToken() {
    if (!confirm('このブラウザに保存したトークンを削除しますか？\n（GitHub 側のトークンは消えません）')) return;
    setAdminToken('');
    renderTokenStatus();
    updateAdminVisibility();
    showAdminMessage('adminTokenMessage', 'トークンを削除しました。', 'info');
}

function requireToken(messageId) {
    if (getAdminToken()) return true;
    showAdminMessage(messageId, '先に一番上の「GitHub 接続」でトークンを登録してください。', 'error');
    return false;
}

// ---------- メンテナンス期間 ----------

function renderMaintenanceEditor() {
    const list = document.getElementById('adminPeriodList');
    if (!list) return;

    if (adminState.periods.length === 0) {
        list.innerHTML = `<p class="admin-empty">メンテナンスの予定はありません（サイトは通常どおり表示されます）。</p>`;
    } else {
        list.innerHTML = adminState.periods.map((p, i) => `
            <div class="admin-period" data-index="${i}">
                ${periodFieldHtml('開始', 'start', p.start)}
                ${periodFieldHtml('終了', 'end', p.end)}
                <button type="button" class="admin-btn admin-btn-danger" onclick="removeMaintenancePeriod(${i})">削除</button>
            </div>`).join('');
    }

    // 今の設定だと、今この瞬間メンテ中かどうか
    const status = document.getElementById('adminMaintenanceStatus');
    if (status) {
        const now = Date.now();
        const active = adminState.periods
            .map(p => toMaintenancePeriod(p.start, p.end))
            .find(m => m && now >= m.start && now <= m.end);
        status.textContent = active
            ? '今の設定では：メンテナンス中（一般の人にはメンテ画面が表示されます）'
            : '今の設定では：メンテナンスなし（サイトは通常どおり表示されます）';
        status.className = `admin-status ${active ? 'is-warn' : 'is-ok'}`;
    }
}

function periodFieldHtml(label, field, value) {
    const undecided = !value || value === '未定';
    return `<div class="admin-period-field">
                <span class="admin-label">${label}</span>
                <input type="datetime-local" class="admin-input" data-field="${field}" value="${toDateTimeInput(value)}" ${undecided ? 'disabled' : ''}>
                <label class="admin-check">
                    <input type="checkbox" data-undecided="${field}" ${undecided ? 'checked' : ''} onchange="this.closest('.admin-period-field').querySelector('input[type=datetime-local]').disabled = this.checked">
                    未定
                </label>
            </div>`;
}

// 入力欄の内容を adminState.periods に読み込む。おかしな入力があればエラー文を返す
function collectMaintenancePeriods() {
    const rows = [...document.querySelectorAll('#adminPeriodList .admin-period')];
    const periods = [];
    for (const [i, row] of rows.entries()) {
        const read = (field) => {
            if (row.querySelector(`[data-undecided="${field}"]`).checked) return '未定';
            return fromDateTimeInput(row.querySelector(`[data-field="${field}"]`).value);
        };
        const start = read('start');
        const end = read('end');
        if (!start || !end) return { error: `${i + 1}件目：日時を入力するか「未定」にチェックしてください。` };
        const period = toMaintenancePeriod(start, end);
        if (!period) return { error: `${i + 1}件目：日時の形式が正しくありません。` };
        if (period.start > period.end) return { error: `${i + 1}件目：終了が開始より前になっています。` };
        periods.push({ start, end });
    }
    return { periods };
}

function addMaintenancePeriod() {
    const collected = collectMaintenancePeriods();
    if (!collected.error) adminState.periods = collected.periods;
    // 新しい行は「今から未定」で追加する
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    adminState.periods.push({ start: `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`, end: '未定' });
    renderMaintenanceEditor();
    showAdminMessage('adminMaintenanceMessage', '期間を追加しました。内容を確認して「保存」を押すと反映されます。', 'info');
}

function removeMaintenancePeriod(index) {
    const collected = collectMaintenancePeriods();
    if (!collected.error) adminState.periods = collected.periods;
    adminState.periods.splice(index, 1);
    renderMaintenanceEditor();
    showAdminMessage('adminMaintenanceMessage', '期間を削除しました。「保存」を押すと反映されます。', 'info');
}

async function saveMaintenance() {
    if (!requireToken('adminMaintenanceMessage')) return;
    const collected = collectMaintenancePeriods();
    if (collected.error) {
        showAdminMessage('adminMaintenanceMessage', collected.error, 'error');
        return;
    }

    setAdminBusy(true);
    showAdminMessage('adminMaintenanceMessage', 'GitHub に保存しています…', 'info');
    try {
        await writeJsonToGitHub(SETTINGS_FILES.maintenance, { periods: collected.periods }, 'メンテ期間を更新（管理画面から）');
        adminState.periods = collected.periods;
        maintenanceData = collected.periods.map(p => toMaintenancePeriod(p.start, p.end)).filter(Boolean);
        renderMaintenanceEditor();
        showAdminMessage('adminMaintenanceMessage', '保存しました。公開サイトへの反映には 1〜2 分かかります。', 'ok');
    } catch (e) {
        showAdminMessage('adminMaintenanceMessage', e.message, 'error');
    } finally {
        setAdminBusy(false);
    }
}

// ---------- お知らせ ----------

function renderAnnouncementEditor() {
    const list = document.getElementById('adminNoticeList');
    if (list) {
        const items = sortAnnouncements(adminState.announcements);
        list.innerHTML = items.length === 0
            ? `<li class="admin-empty">お知らせはまだありません。</li>`
            : items.map(n => `
                <li class="admin-notice-item${adminState.editingId === n.id ? ' is-editing' : ''}">
                    <span class="notice-date-badge">${escapeHtml(n.date)}</span>
                    <span class="admin-notice-title">${escapeHtml(n.title)}</span>
                    <span class="admin-notice-actions">
                        <button type="button" class="admin-btn" onclick="editAnnouncement(${n.id})">編集</button>
                        <button type="button" class="admin-btn admin-btn-danger" onclick="deleteAnnouncement(${n.id})">削除</button>
                    </span>
                </li>`).join('');
    }

    // 入力欄（新規 or 編集中）
    const editing = adminState.announcements.find(n => n.id === adminState.editingId);
    document.getElementById('adminNoticeFormTitle').textContent = editing ? 'お知らせを編集' : '新しいお知らせ';
    document.getElementById('adminNoticeDate').value = editing ? toDateInput(editing.date) : (document.getElementById('adminNoticeDate').value || todayDateInput());
    if (editing) {
        document.getElementById('adminNoticeTitle').value = editing.title;
        document.getElementById('adminNoticeBody').value = editing.body;
    }
    document.getElementById('adminNoticeSubmit').textContent = editing ? '更新して保存' : '追加して保存';
    document.getElementById('adminNoticeCancel').hidden = !editing;
}

function clearAnnouncementForm() {
    adminState.editingId = null;
    document.getElementById('adminNoticeDate').value = todayDateInput();
    document.getElementById('adminNoticeTitle').value = '';
    document.getElementById('adminNoticeBody').value = '';
    renderAnnouncementEditor();
}

function editAnnouncement(id) {
    adminState.editingId = id;
    renderAnnouncementEditor();
    showAdminMessage('adminNoticeMessage', '', 'info');
    document.getElementById('adminNoticeForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEditAnnouncement() {
    clearAnnouncementForm();
    showAdminMessage('adminNoticeMessage', '', 'info');
}

// お知らせを GitHub に保存して、サイトの表示も更新する
async function saveAnnouncements(items, doneText) {
    setAdminBusy(true);
    showAdminMessage('adminNoticeMessage', 'GitHub に保存しています…', 'info');
    try {
        const sorted = sortAnnouncements(items);
        await writeJsonToGitHub(SETTINGS_FILES.announcements, { items: sorted }, 'お知らせを更新（管理画面から）');
        adminState.announcements = sorted;
        announcementData = sorted.map(n => ({ ...n }));
        if (typeof displayAnnouncements === 'function') displayAnnouncements();
        clearAnnouncementForm();
        showAdminMessage('adminNoticeMessage', `${doneText}公開サイトへの反映には 1〜2 分かかります。`, 'ok');
    } catch (e) {
        showAdminMessage('adminNoticeMessage', e.message, 'error');
    } finally {
        setAdminBusy(false);
    }
}

async function submitAnnouncement() {
    if (!requireToken('adminNoticeMessage')) return;
    const dateValue = document.getElementById('adminNoticeDate').value;
    const title = document.getElementById('adminNoticeTitle').value.trim();
    const body = document.getElementById('adminNoticeBody').value.trim();
    if (!dateValue || !title) {
        showAdminMessage('adminNoticeMessage', '日付とタイトルを入力してください。', 'error');
        return;
    }
    const date = dateValue.replace(/-/g, '/');

    if (adminState.editingId !== null) {
        const items = adminState.announcements.map(n => n.id === adminState.editingId ? { ...n, date, title, body } : n);
        await saveAnnouncements(items, '更新しました。');
    } else {
        // 番号はこれまでの最大値 + 1（お知らせのURL #notice/番号 に使う）
        const nextId = adminState.announcements.reduce((max, n) => Math.max(max, Number(n.id) || 0), -1) + 1;
        await saveAnnouncements([...adminState.announcements, { id: nextId, date, title, body }], '追加しました。');
    }
}

async function deleteAnnouncement(id) {
    if (!requireToken('adminNoticeMessage')) return;
    const target = adminState.announcements.find(n => n.id === id);
    if (!target || !confirm(`お知らせ「${target.title}」を削除しますか？`)) return;
    await saveAnnouncements(adminState.announcements.filter(n => n.id !== id), '削除しました。');
}

// ---------- 背景の表示位置 ----------
// ダンジョンを選んで、画像の「見せたい場所（顔など）」をクリックすると、そこを中心に切り抜いて表示する。
// ・カード用：ステージ一覧とダンジョン一覧のカード（大きさが同じなので共通）
// ・帯用：報酬画面の上の帯
// カード用と帯用は別々に保存し、片方を変えてももう片方には影響しない。
// どちらも画像ファイルごとの設定なので、同じ画像を使う場所にはまとめて反映される。

// 背景の位置の保存先（帯用か、カード用か）
function bgFocusStore(bg) {
    return bg.forHero ? adminState.bgHeroFocus : adminState.bgFocus;
}

function bgFocusFor(bg) {
    const saved = bgFocusStore(bg)[bg.key];
    const base = bgFocus({ ...bg, key: '__default__' });
    return saved ? { ...base, ...saved } : base;
}

// backgrounds.json の中身（キー順をそろえて、差分を見やすくする）
function backgroundsJson(focus, heroFocus) {
    const sorted = (obj) => {
        const out = {};
        Object.keys(obj).sort().forEach(k => { out[k] = obj[k]; });
        return out;
    };
    return { images: sorted(focus), heroImages: sorted(heroFocus) };
}

// 調整中のダンジョンと、その背景（カード用 or 帯用）
function currentBgTarget() {
    const arena = dungeonData.find(d => d.name === adminState.bgDungeon);
    if (!arena) return null;
    return { arena, bg: adminState.bgTarget === 'hero' ? heroBg(arena) : dungeonBg(arena) };
}

function renderBgEditor() {
    const select = document.getElementById('adminBgSelect');
    if (!select) return;

    const grouped = groupDungeonsBySeries();
    const withBg = Object.values(grouped).flat().filter(d => dungeonBg(d).url);
    if (withBg.length === 0) {
        select.innerHTML = '<option>（背景が設定されたダンジョンがありません）</option>';
        return;
    }
    if (!withBg.some(d => d.name === adminState.bgDungeon)) adminState.bgDungeon = withBg[0].name;

    const store = adminState.bgTarget === 'hero' ? adminState.bgHeroFocus : adminState.bgFocus;
    select.innerHTML = Object.entries(grouped).map(([series, dungeons]) => {
        const options = dungeons.filter(d => dungeonBg(d).url).map(d => {
            const mark = store[dungeonBg(d).key] ? ' ✓' : '';
            return `<option value="${escapeHtml(d.name)}"${d.name === adminState.bgDungeon ? ' selected' : ''}>${escapeHtml(d.name)}${mark}</option>`;
        }).join('');
        return options ? `<optgroup label="${escapeHtml(series)}">${options}</optgroup>` : '';
    }).join('');

    renderBgPicker();
}

// 選んだダンジョンの画像・目印・拡大率・プレビューを描き直す
function renderBgPicker() {
    const target = currentBgTarget();
    if (!target) return;
    const { arena, bg } = target;
    const focus = bgFocusFor(bg);

    const img = document.getElementById('adminBgImage');
    if (img.getAttribute('src') !== encodeURI(bg.url)) img.src = encodeURI(bg.url);
    const marker = document.getElementById('adminBgMarker');
    marker.style.left = `${focus.x}%`;
    marker.style.top = `${focus.y}%`;

    const zoomPercent = Math.round(focus.zoom * 100);
    document.getElementById('adminBgZoom').value = zoomPercent;
    document.getElementById('adminBgZoomValue').textContent = `${zoomPercent}%`;
    document.getElementById('adminBgPosValue').textContent = `横 ${focus.x}% ／ 縦 ${focus.y}%`;

    // 同じ画像を使っている場所（位置は画像ごとなので一緒に変わる）
    const sharedNames = dungeonData.filter(d => d !== arena && dungeonBg(d).key === bg.key).map(d => d.name);
    const usedAsStage = Object.entries(groupDungeonsBySeries())
        .filter(([, ds]) => stageBg(ds).key === bg.key)
        .map(([s]) => s);
    const notes = [];
    const stats = dungeonStatsHtml(arena);
    let preview;
    if (bg.forHero) {
        if (sharedNames.length) notes.push(`ダンジョン「${sharedNames.join('」「')}」の帯`);
        preview = `
            <p class="admin-label">報酬画面の上の帯</p>
            <div class="dungeon-hero${tileBgClass(bg)}">
                ${tileBgHtml(bg, focus)}
                <div class="tile-body"><h3 class="dungeon-name">${escapeHtml(arena.name)}</h3>${stats}</div>
            </div>`;
    } else {
        if (usedAsStage.length) notes.push(`ステージ「${usedAsStage.join('」「')}」のカード`);
        if (sharedNames.length) notes.push(`ダンジョン「${sharedNames.join('」「')}」のカード`);
        const tile = (title, subHtml) => `
            <div class="admin-bg-preview-tile">
                <div class="arena-tile${tileBgClass(bg)}">
                    ${tileBgHtml(bg, focus)}
                    <span class="tile-body"><span class="tile-title">${escapeHtml(title)}</span>${subHtml}</span>
                    <span class="tile-arrow" aria-hidden="true">➤</span>
                </div>
            </div>`;
        const grouped = groupDungeonsBySeries();
        preview = `<p class="admin-label">ダンジョン一覧のカード（スマホの幅）</p>${tile(arena.name, stats)}`
            + usedAsStage.map(s => `<p class="admin-label">ステージ一覧のカード（スマホの幅）</p>${tile(s, `<span class="tile-sub">${grouped[s].length} ダンジョン</span>`)}`).join('');
    }
    const other = bg.forHero ? 'カード' : '報酬画面の帯';
    document.getElementById('adminBgShared').textContent = notes.length
        ? `この画像（${bg.key}）は ${notes.join('、')} でも使われていて、まとめて変わります（${other}は変わりません）。`
        : `画像：${bg.key}（${other}は変わりません）`;

    // プレビュー（実際のカード・帯と同じ見た目で表示）
    document.getElementById('adminBgPreview').innerHTML = preview;
}

// 「カード」「報酬画面の帯」の切り替え
function selectBgTarget(target) {
    adminState.bgTarget = target;
    renderBgEditor();
}

function selectBgDungeon() {
    adminState.bgDungeon = document.getElementById('adminBgSelect').value;
    renderBgPicker();
}

function updateCurrentBgFocus(changes) {
    const target = currentBgTarget();
    if (!target) return;
    const bg = target.bg;
    bgFocusStore(bg)[bg.key] = { ...bgFocusFor(bg), ...changes };
    adminState.bgDirty = true;
    renderBgPicker();
    showAdminMessage('adminBgMessage', 'まだ保存していません。調整が終わったら「保存」を押してください。', 'info');
}

// 画像をクリックした場所を中心にする
function pickBgFocus(event) {
    const img = event.currentTarget;
    const rect = img.getBoundingClientRect();
    const x = Math.round(Math.min(100, Math.max(0, (event.clientX - rect.left) / rect.width * 100)));
    const y = Math.round(Math.min(100, Math.max(0, (event.clientY - rect.top) / rect.height * 100)));
    updateCurrentBgFocus({ x, y });
}

function changeBgZoom() {
    const zoom = Number(document.getElementById('adminBgZoom').value) / 100;
    updateCurrentBgFocus({ zoom });
}

function resetBgFocus() {
    const target = currentBgTarget();
    if (!target) return;
    delete bgFocusStore(target.bg)[target.bg.key];
    adminState.bgDirty = true;
    renderBgEditor();
    showAdminMessage('adminBgMessage', '初期位置に戻しました（まだ保存していません）。', 'info');
}

async function saveBgFocus() {
    if (!requireToken('adminBgMessage')) return;
    setAdminBusy(true);
    showAdminMessage('adminBgMessage', 'GitHub に保存しています…', 'info');
    try {
        const json = backgroundsJson(adminState.bgFocus, adminState.bgHeroFocus);
        await writeJsonToGitHub(SETTINGS_FILES.backgrounds, json, '背景の表示位置を更新（管理画面から）');
        bgFocusData = JSON.parse(JSON.stringify(json.images));
        bgHeroFocusData = JSON.parse(JSON.stringify(json.heroImages));
        adminState.bgDirty = false;
        renderBgEditor();
        showAdminMessage('adminBgMessage', '保存しました。公開サイトへの反映には 1〜2 分かかります。', 'ok');
    } catch (e) {
        showAdminMessage('adminBgMessage', e.message, 'error');
    } finally {
        setAdminBusy(false);
    }
}

// ---------- 複数のファイルを1回の更新（1コミット）でまとめて保存・削除する ----------
// files: [{ path: 'images_bg/xxx.jpg', base64: '...' }]  … 追加・上書き
//        [{ path: 'images_bg/yyy.jpg', delete: true }]   … 削除

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

async function commitFilesToGitHub(files, message) {
    const fail = (res) => { throw new Error(githubErrorText(res.status)); };
    const branch = GITHUB_REPO.branch;

    // 今の最新の状態（コミットとファイル一覧）を取る
    const ref = await githubRequest('GET', `/git/ref/heads/${branch}`);
    if (!ref.ok) fail(ref);
    const parentSha = ref.data.object.sha;
    const parent = await githubRequest('GET', `/git/commits/${parentSha}`);
    if (!parent.ok) fail(parent);

    // ファイルの中身を1つずつ送る（削除するファイルは sha: null で「消す」と指定する）
    const tree = [];
    for (const file of files) {
        if (file.delete) {
            tree.push({ path: file.path, mode: '100644', type: 'blob', sha: null });
            continue;
        }
        const blob = await githubRequest('POST', '/git/blobs', { content: file.base64, encoding: 'base64' });
        if (!blob.ok) fail(blob);
        tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.data.sha });
    }

    // 「前の状態＋今回のファイル」で新しいコミットを作り、main をそこへ進める
    const newTree = await githubRequest('POST', '/git/trees', { base_tree: parent.data.tree.sha, tree });
    if (!newTree.ok) fail(newTree);
    const commit = await githubRequest('POST', '/git/commits', { message, tree: newTree.data.sha, parents: [parentSha] });
    if (!commit.ok) fail(commit);
    const update = await githubRequest('PATCH', `/git/refs/heads/${branch}`, { sha: commit.data.sha });
    if (!update.ok) {
        if (update.status === 422) throw new Error(githubErrorText(409));
        fail(update);
    }
    return commit.data.sha;
}

// ---------- データ（Excel）の更新 ----------
// Excel を選ぶ → 中身をチェックしてまとめを表示 → 「保存」で dangeon.xlsx と data.json をまとめて GitHub に保存

const excelUpload = { file: null, buffer: null, compiled: null };

async function selectExcelFile(input) {
    const file = input.files && input.files[0];
    excelUpload.file = null; excelUpload.buffer = null; excelUpload.compiled = null;
    document.getElementById('adminExcelSave').disabled = true;
    document.getElementById('adminExcelSummary').innerHTML = '';
    if (!file) return;

    showAdminMessage('adminExcelMessage', 'Excel を読み込んでいます…', 'info');
    try {
        await loadScriptOnce(SHEETJS_URL);
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const compiled = compileWorkbook(workbook);
        const report = checkCompiledData(compiled, workbook);
        excelUpload.file = file; excelUpload.buffer = buffer; excelUpload.compiled = compiled;

        document.getElementById('adminExcelSummary').innerHTML = report.html;
        document.getElementById('adminExcelSave').disabled = report.fatal;
        showAdminMessage('adminExcelMessage',
            report.fatal ? 'このファイルは保存できません（上の赤い項目を確認してください）。'
                         : '内容を確認して、よければ「保存」を押してください。',
            report.fatal ? 'error' : 'info');
    } catch (e) {
        showAdminMessage('adminExcelMessage', `Excel を読み込めませんでした：${e.message}`, 'error');
    }
}

// 読み込んだ Excel の中身をチェックして、まとめ（HTML）を作る
function checkCompiledData(compiled, workbook) {
    const items = [];
    const add = (type, text) => items.push(`<li class="is-${type}">${text}</li>`);
    let fatal = false;

    const dungeons = parseExcelData(compiled.dungeons, compiled.idMap);
    const names = dungeons.map(d => d.name);
    const series = [...new Set(dungeons.map(d => d.series))];

    if (dungeons.length === 0 || dungeons.every(d => d.name === '不明')) {
        add('error', '1枚目のシートにダンジョンがありません（「ステージ」「ダンジョン」列を確認してください）。');
        fatal = true;
    } else {
        add('ok', `シート：${workbook.SheetNames.map(escapeHtml).join('、')}`);
        add('ok', `ステージ ${series.length} 件 ／ ダンジョン ${dungeons.length} 件 ／ 交換 ${compiled.exchanges.length} 件 ／ 素材の図鑑No ${Object.keys(compiled.idMap).length} 件`);
        const before = dungeonData.length;
        if (before && before !== dungeons.length) add('info', `ダンジョンの数が ${before} 件 → ${dungeons.length} 件に変わります。`);
    }

    const dupNames = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupNames.length) add('warn', `同じ名前のダンジョンがあります：${[...new Set(dupNames)].map(escapeHtml).join('、')}`);

    const exchangeDungeons = [...new Set(compiled.exchanges.map(r => String(r['ダンジョン'] || '').trim()).filter(Boolean))];
    const unknownEx = exchangeDungeons.filter(n => !names.includes(n));
    if (unknownEx.length) add('warn', `「交換」シートに、1枚目に無いダンジョン名があります：${unknownEx.map(escapeHtml).join('、')}`);

    // 図鑑Noが無い素材名（画像が「？」になる）
    const allNames = new Set();
    dungeons.forEach(d => d.allRewards.forEach(r => allNames.add(r.name)));
    compiled.exchanges.forEach(r => {
        if (r['交換先']) allNames.add(String(r['交換先']).trim());
        parseCategory(r['必要モンスター'], false).forEach(g => allNames.add(g.items[0]));
    });
    const noId = [...allNames].filter(n => n && !compiled.idMap[n]);
    if (noId.length) add('warn', `図鑑No が未登録の名前（画像が「？」になります）：${noId.slice(0, 15).map(escapeHtml).join('、')}${noId.length > 15 ? ` ほか ${noId.length - 15} 件` : ''}`);

    // 背景モンスター列が空のダンジョン
    const noBg = dungeons.filter(d => !d.bgMonster).map(d => d.name);
    if (noBg.length) add('info', `背景モンスターが空欄のダンジョン：${noBg.slice(0, 10).map(escapeHtml).join('、')}${noBg.length > 10 ? ` ほか ${noBg.length - 10} 件` : ''}`);

    if (!fatal && items.filter(i => i.includes('is-warn')).length === 0) add('ok', '気になる点は見つかりませんでした。');
    return { fatal, html: `<ul class="admin-check-list">${items.join('')}</ul>` };
}

async function saveExcelFile() {
    if (!requireToken('adminExcelMessage')) return;
    if (!excelUpload.compiled) {
        showAdminMessage('adminExcelMessage', '先に Excel ファイルを選んでください。', 'error');
        return;
    }
    setAdminBusy(true);
    showAdminMessage('adminExcelMessage', 'GitHub に保存しています…', 'info');
    try {
        const compiled = { ...excelUpload.compiled, generatedAt: new Date().toISOString() };
        await commitFilesToGitHub([
            { path: 'dangeon.xlsx', base64: arrayBufferToBase64(excelUpload.buffer) },
            { path: DATA_FILE, base64: utf8ToBase64(JSON.stringify(compiled)) }
        ], 'データ（Excel）を更新（管理画面から）');

        // このページの表示もすぐ新しいデータに切り替える
        applyCompiledData(compiled);
        if (typeof displayDataUpdated === 'function') displayDataUpdated();
        if (typeof displayNoteExample === 'function') displayNoteExample();
        renderBgEditor();
        renderBgUploadList();
        renderImageList('bg');
        renderImageList('icon');
        renderMissingIcons();

        excelUpload.file = null; excelUpload.buffer = null; excelUpload.compiled = null;
        document.getElementById('adminExcelInput').value = '';
        document.getElementById('adminExcelSave').disabled = true;
        showAdminMessage('adminExcelMessage', '保存しました。公開サイトへの反映には 1〜2 分かかります。', 'ok');
    } catch (e) {
        showAdminMessage('adminExcelMessage', e.message, 'error');
    } finally {
        setAdminBusy(false);
    }
}

// ---------- 背景画像の追加 ----------
// 選んだ画像をブラウザの中で軽量化（横1280px・400KB以内のJPEG。ドット絵は拡大）して images_bg に保存する。
// 元の大きい画像はアップロードしない（パソコンに残るだけ）

const BG_UPLOAD = { width: 1280, maxKB: 400, startQuality: 0.88, minQuality: 0.6 };
let bgUploads = [];   // [{ file, key, blob, width, height, quality, isPixelArt, previewUrl }]

function canvasToBlob(canvas, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
}

async function convertBgImage(file) {
    const img = await createImageBitmap(file);
    const isPixelArt = img.width < 200;
    let width, height;
    if (isPixelArt) {
        // ドット絵：ぼやけないよう、整数倍で横480px以上に拡大
        const scale = Math.ceil(480 / img.width);
        width = img.width * scale; height = img.height * scale;
    } else {
        width = Math.min(BG_UPLOAD.width, img.width);
        height = Math.round(img.height * width / img.width);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    // 透過部分がある画像でも黒くならないよう、サイトの紫で塗っておく
    ctx.fillStyle = '#1a1240';
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = !isPixelArt;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    img.close();

    // 400KB に収まるまで画質を少しずつ下げる（ドット絵は輪郭がにじまないよう高画質のまま）
    let quality = isPixelArt ? 0.95 : BG_UPLOAD.startQuality;
    let blob = await canvasToBlob(canvas, quality);
    while (!isPixelArt && blob.size / 1024 > BG_UPLOAD.maxKB && quality > BG_UPLOAD.minQuality) {
        quality = Math.round((quality - 0.05) * 100) / 100;
        blob = await canvasToBlob(canvas, quality);
    }
    return { blob, width, height, quality, isPixelArt };
}

// ファイル名 → 保存名（拡張子を外し、使えない文字を _ に）。Excel の「背景モンスター」列に書く名前になる
function bgKeyFromFileName(name) {
    return name.replace(/\.[^.]+$/, '').trim().replace(/[\\/:*?"<>|\s]+/g, '_');
}

async function selectBgFiles(input) {
    const files = [...(input.files || [])];
    bgUploads.forEach(u => URL.revokeObjectURL(u.previewUrl));
    bgUploads = [];
    renderBgUploadList();
    if (files.length === 0) return;

    showAdminMessage('adminBgUploadMessage', `${files.length} 枚を軽量化しています…`, 'info');
    for (const file of files) {
        try {
            const converted = await convertBgImage(file);
            bgUploads.push({ file, key: bgKeyFromFileName(file.name), ...converted, previewUrl: URL.createObjectURL(converted.blob) });
        } catch (e) {
            bgUploads.push({ file, key: bgKeyFromFileName(file.name), error: e.message || '画像を読み込めませんでした' });
        }
        renderBgUploadList();
    }
    const ok = bgUploads.filter(u => !u.error).length;
    showAdminMessage('adminBgUploadMessage', ok ? `${ok} 枚の準備ができました。名前と使われ方を確認して「保存」を押してください。` : '保存できる画像がありません。', ok ? 'info' : 'error');
}

function renderBgUploadList() {
    const list = document.getElementById('adminBgUploadList');
    if (!list) return;
    const usedKeys = new Set(dungeonData.map(d => dungeonBg(d).key));
    list.innerHTML = bgUploads.map(u => {
        if (u.error) return `<li class="admin-upload-item is-error"><strong>${escapeHtml(u.file.name)}</strong>：${escapeHtml(u.error)}</li>`;
        const usedBy = dungeonData.filter(d => dungeonBg(d).key === u.key).map(d => d.name);
        const usage = usedBy.length
            ? `使われる場所：${usedBy.map(escapeHtml).join('、')}`
            : `Excel の「背景モンスター」列にはまだ使われていません（使う時は <code>${escapeHtml(u.key)}</code> と書いてください）`;
        return `<li class="admin-upload-item">
                    <img src="${u.previewUrl}" alt="" class="admin-upload-thumb">
                    <div class="admin-upload-info">
                        <strong>${escapeHtml(u.key)}</strong>
                        <span>${u.width}×${u.height}・${Math.round(u.blob.size / 1024)}KB（元 ${Math.round(u.file.size / 1024)}KB）${u.isPixelArt ? '・ドット絵として拡大' : ''}${usedKeys.has(u.key) ? '・<em>同じ名前の画像を上書きします</em>' : ''}</span>
                        <span class="admin-upload-usage">${usage}</span>
                    </div>
                </li>`;
    }).join('');
    const saveBtn = document.getElementById('adminBgUploadSave');
    if (saveBtn) saveBtn.disabled = !bgUploads.some(u => !u.error);
}

async function saveBgUploads() {
    if (!requireToken('adminBgUploadMessage')) return;
    const ready = bgUploads.filter(u => !u.error);
    if (ready.length === 0) {
        showAdminMessage('adminBgUploadMessage', '先に画像を選んでください。', 'error');
        return;
    }
    setAdminBusy(true);
    showAdminMessage('adminBgUploadMessage', `GitHub に ${ready.length} 枚保存しています…`, 'info');
    try {
        const files = [];
        for (const u of ready) {
            files.push({ path: `${BG_IMAGE_DIR}/${u.key}.jpg`, base64: arrayBufferToBase64(await u.blob.arrayBuffer()) });
        }
        await commitFilesToGitHub(files, `背景画像を追加（管理画面から）：${ready.map(u => u.key).join(', ')}`);
        bgUploads.forEach(u => URL.revokeObjectURL(u.previewUrl));
        bgUploads = [];
        document.getElementById('adminBgUploadInput').value = '';
        renderBgUploadList();
        await loadImageList('bg', true);
        showAdminMessage('adminBgUploadMessage', `${ready.length} 枚保存しました。公開サイトへの反映には 1〜2 分かかります。`, 'ok');
    } catch (e) {
        showAdminMessage('adminBgUploadMessage', e.message, 'error');
    } finally {
        setAdminBusy(false);
    }
}

// ---------- 登録済みの画像の一覧と削除（背景画像・素材アイコン共通） ----------

const IMAGE_KINDS = {
    bg:   { dir: BG_IMAGE_DIR, ext: '.jpg', label: '背景画像', listId: 'adminBgFiles',   msgId: 'adminBgFilesMessage',   deleteId: 'adminBgDelete',   showAllId: 'adminBgShowAll',   filterId: null },
    icon: { dir: 'images',     ext: '.png', label: '素材アイコン', listId: 'adminIconFiles', msgId: 'adminIconFilesMessage', deleteId: 'adminIconDelete', showAllId: 'adminIconShowAll', filterId: 'adminIconFilter' }
};
// サイトの部品として使っている画像（削除できないようにする）
const PROTECTED_IMAGES = /^(question|howto_\d+)\.png$/;

const adminImages = { bg: null, icon: null };   // GitHub 上のファイル一覧 [{ name, sha, size }]
const imageSelection = { bg: new Set(), icon: new Set() };

// GitHub 上の画像フォルダの一覧を読む
async function loadImageList(kind, force = false) {
    const conf = IMAGE_KINDS[kind];
    if (!getAdminToken()) return;
    if (adminImages[kind] && !force) { renderImageList(kind); return; }
    showAdminMessage(conf.msgId, '一覧を読み込んでいます…', 'info');
    const res = await githubRequest('GET', `/contents/${conf.dir}?ref=${GITHUB_REPO.branch}`);
    if (!res.ok && res.status !== 404) {
        showAdminMessage(conf.msgId, githubErrorText(res.status), 'error');
        return;
    }
    adminImages[kind] = (Array.isArray(res.data) ? res.data : [])
        .filter(f => f.type === 'file' && /\.(png|jpe?g|webp|gif)$/i.test(f.name))
        .map(f => ({ name: f.name, sha: f.sha, size: f.size }));
    imageSelection[kind].clear();
    showAdminMessage(conf.msgId, '', 'info');
    renderImageList(kind);
    if (kind === 'icon') renderMissingIcons();
}

// 画像がどこで使われているか（使われていなければ空の配列）
function imageUsage(kind, fileName) {
    const key = fileName.replace(/\.\w+$/, '');
    if (kind === 'bg') {
        return dungeonData.filter(d => dungeonBg(d).key === key).map(d => d.name);
    }
    // 素材アイコン：この図鑑Noを持つ素材名のうち、報酬・交換で使われているもの
    const used = usedMaterialNames();
    return Object.keys(globalIdMap).filter(name => String(globalIdMap[name]) === key && used.has(name));
}

// 報酬リスト・交換で使われている素材名（モンスター名）すべて
function usedMaterialNames() {
    const names = new Set();
    dungeonData.forEach(d => {
        d.allRewards.forEach(r => names.add(r.name));
        (d.exchanges || []).forEach(ex => {
            names.add(ex.target);
            ex.materials.forEach(m => names.add(m.name));
        });
    });
    return names;
}

function renderImageList(kind) {
    const conf = IMAGE_KINDS[kind];
    const list = document.getElementById(conf.listId);
    if (!list) return;
    const files = adminImages[kind];
    if (!files) {
        list.innerHTML = `<p class="admin-empty">（トークンを登録すると一覧が表示されます）</p>`;
        return;
    }
    const showAll = document.getElementById(conf.showAllId)?.checked;
    const filter = conf.filterId ? (document.getElementById(conf.filterId)?.value || '').trim() : '';

    const rows = files
        .filter(f => !PROTECTED_IMAGES.test(f.name))
        .map(f => {
            const usage = imageUsage(kind, f.name);
            const names = kind === 'icon' ? Object.keys(globalIdMap).filter(n => String(globalIdMap[n]) === f.name.replace(/\.\w+$/, '')) : [];
            return { ...f, usage, names };
        })
        .filter(f => showAll || f.usage.length === 0 || imageSelection[kind].has(f.name))
        .filter(f => !filter || f.name.includes(filter) || f.names.some(n => n.includes(filter)) || f.usage.some(n => n.includes(filter)));

    const unusedCount = files.filter(f => !PROTECTED_IMAGES.test(f.name) && imageUsage(kind, f.name).length === 0).length;
    const head = `<p class="admin-file-count">全 ${files.filter(f => !PROTECTED_IMAGES.test(f.name)).length} 件 ／ 使われていない ${unusedCount} 件${showAll ? '' : '（使われていないものだけ表示中）'}</p>`;

    if (rows.length === 0) {
        list.innerHTML = head + `<p class="admin-empty">${showAll || filter ? '該当する画像はありません。' : '使われていない画像はありません。'}</p>`;
    } else {
        list.innerHTML = head + `<div class="admin-file-grid is-${kind}">` + rows.map(f => {
            const checked = imageSelection[kind].has(f.name);
            const usageText = f.usage.length
                ? `使用中：${f.usage.slice(0, 3).map(escapeHtml).join('、')}${f.usage.length > 3 ? ` ほか${f.usage.length - 3}` : ''}`
                : (kind === 'icon' && f.names.length ? `未使用（Excel では「${escapeHtml(f.names[0])}」）` : '未使用');
            return `<label class="admin-file-card${checked ? ' is-checked' : ''}${f.usage.length ? '' : ' is-unused'}">
                        <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleImageSelection('${kind}', '${escapeHtml(f.name).replace(/'/g, '&#39;')}', this.checked)">
                        <img src="${conf.dir}/${encodeURIComponent(f.name)}?v=${f.sha.slice(0, 7)}" alt="" loading="lazy">
                        <span class="admin-file-name">${escapeHtml(f.name.replace(/\.\w+$/, ''))}${kind === 'icon' && f.names.length ? `<small>${escapeHtml(f.names[0])}</small>` : ''}</span>
                        <span class="admin-file-meta">${Math.round(f.size / 1024)}KB ・ ${usageText}</span>
                    </label>`;
        }).join('') + `</div>`;
    }
    const delBtn = document.getElementById(conf.deleteId);
    if (delBtn) {
        delBtn.disabled = imageSelection[kind].size === 0;
        delBtn.textContent = imageSelection[kind].size ? `選んだ ${imageSelection[kind].size} 件を削除` : '選んだ画像を削除';
    }
}

function toggleImageSelection(kind, name, checked) {
    if (checked) imageSelection[kind].add(name); else imageSelection[kind].delete(name);
    renderImageList(kind);
}

async function deleteSelectedImages(kind) {
    const conf = IMAGE_KINDS[kind];
    if (!requireToken(conf.msgId)) return;
    const names = [...imageSelection[kind]].filter(n => !PROTECTED_IMAGES.test(n));
    if (names.length === 0) return;

    const inUse = names.filter(n => imageUsage(kind, n).length > 0);
    const warn = inUse.length
        ? `\n\nうち ${inUse.length} 件は使用中です（${kind === 'bg' ? '背景が表示されなくなります' : '画像が「？」になります'}）：\n${inUse.map(n => n.replace(/\.\w+$/, '')).join('、')}`
        : '';
    if (!confirm(`${conf.label}を ${names.length} 件削除します。よろしいですか？${warn}\n\n（GitHub の履歴には残るので、必要なら後から戻せます）`)) return;

    setAdminBusy(true);
    showAdminMessage(conf.msgId, 'GitHub から削除しています…', 'info');
    try {
        const files = names.map(n => ({ path: `${conf.dir}/${n}`, delete: true }));
        // 背景画像を消す時は、その画像の「表示位置」の設定（カード用・帯用）も backgrounds.json から消す
        let newBackgrounds = null;
        if (kind === 'bg') {
            const keys = names.map(n => n.replace(/\.\w+$/, ''));
            if (keys.some(k => adminState.bgFocus[k] || adminState.bgHeroFocus[k])) {
                const focus = { ...adminState.bgFocus };
                const heroFocus = { ...adminState.bgHeroFocus };
                keys.forEach(k => { delete focus[k]; delete heroFocus[k]; });
                newBackgrounds = backgroundsJson(focus, heroFocus);
                files.push({ path: SETTINGS_FILES.backgrounds, base64: utf8ToBase64(JSON.stringify(newBackgrounds, null, 2) + '\n') });
            }
        }
        await commitFilesToGitHub(files, `${conf.label}を削除（管理画面から）：${names.map(n => n.replace(/\.\w+$/, '')).join(', ')}`);
        if (newBackgrounds) {
            adminState.bgFocus = newBackgrounds.images;
            adminState.bgHeroFocus = newBackgrounds.heroImages;
            bgFocusData = JSON.parse(JSON.stringify(newBackgrounds.images));
            bgHeroFocusData = JSON.parse(JSON.stringify(newBackgrounds.heroImages));
            renderBgEditor();
        }
        adminImages[kind] = adminImages[kind].filter(f => !names.includes(f.name));
        imageSelection[kind].clear();
        renderImageList(kind);
        if (kind === 'icon') renderMissingIcons();
        showAdminMessage(conf.msgId, `${names.length} 件削除しました。公開サイトへの反映には 1〜2 分かかります。`, 'ok');
    } catch (e) {
        showAdminMessage(conf.msgId, e.message, 'error');
    } finally {
        setAdminBusy(false);
        renderImageList(kind);
    }
}

// ---------- 素材アイコンの追加 ----------
// ・「画像が無い素材」の一覧から、それぞれ画像を選ぶ
// ・まとめて選ぶ（ファイル名が図鑑No か素材名なら自動で割り当て。わからなければ素材名を入力して指定）
// 大きい画像は横100pxに縮小して PNG で保存（透明部分はそのまま）

const ICON_MAX = 100;
let iconUploads = [];   // [{ id, file, blob, width, height, previewUrl, label, error }]

async function processIconImage(file) {
    const img = await createImageBitmap(file);
    let width = img.width, height = img.height;
    // 100px 以下の PNG はそのまま使う（作り直すと画質が落ちる・容量が増えることがあるため）
    if (width <= ICON_MAX && height <= ICON_MAX && file.type === 'image/png') {
        img.close();
        return { blob: file, width, height };
    }
    const scale = Math.min(1, ICON_MAX / Math.max(width, height));
    width = Math.round(width * scale); height = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    img.close();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    return { blob, width, height };
}

// ファイル名 → 図鑑No（「11556.png」→11556、「素材名.png」→ Excel の図鑑No）
function iconIdFromFileName(name) {
    const base = name.replace(/\.[^.]+$/, '').trim();
    if (/^\d+$/.test(base)) return base;
    return globalIdMap[base] ? String(globalIdMap[base]) : '';
}

function iconLabel(id) {
    if (!id) return '';
    const names = Object.keys(globalIdMap).filter(n => String(globalIdMap[n]) === String(id));
    return names[0] || '（Excel に未登録の図鑑No）';
}

async function addIconFiles(files, forcedId = '') {
    for (const file of files) {
        const id = forcedId || iconIdFromFileName(file.name);
        try {
            const processed = await processIconImage(file);
            iconUploads = iconUploads.filter(u => !(id && u.id === id));   // 同じ図鑑Noは新しい方だけ
            iconUploads.push({ id, file, ...processed, previewUrl: URL.createObjectURL(processed.blob), label: iconLabel(id) });
        } catch (e) {
            iconUploads.push({ id, file, error: '画像を読み込めませんでした' });
        }
    }
    renderIconUploadList();
}

async function selectIconFiles(input) {
    await addIconFiles([...(input.files || [])]);
    input.value = '';
}

// 「画像が無い素材」の行から1枚選んだ時
async function pickMissingIcon(input, id) {
    const file = input.files && input.files[0];
    if (file) await addIconFiles([file], id);
    input.value = '';
}

function setIconUploadName(index, value) {
    const u = iconUploads[index];
    if (!u) return;
    const v = value.trim();
    u.id = /^\d+$/.test(v) ? v : (globalIdMap[v] ? String(globalIdMap[v]) : '');
    u.label = iconLabel(u.id);
    renderIconUploadList();
}

function removeIconUpload(index) {
    const u = iconUploads[index];
    if (u && u.previewUrl) URL.revokeObjectURL(u.previewUrl);
    iconUploads.splice(index, 1);
    renderIconUploadList();
}

function renderIconUploadList() {
    const list = document.getElementById('adminIconUploadList');
    if (!list) return;
    const existing = new Set((adminImages.icon || []).map(f => f.name.replace(/\.\w+$/, '')));
    list.innerHTML = iconUploads.map((u, i) => {
        if (u.error) {
            return `<li class="admin-upload-item is-error"><strong>${escapeHtml(u.file.name)}</strong>：${escapeHtml(u.error)}
                        <button type="button" class="admin-btn admin-btn-small" onclick="removeIconUpload(${i})">外す</button></li>`;
        }
        const idPart = u.id
            ? `<strong>No.${escapeHtml(u.id)}</strong> ${escapeHtml(u.label)}${existing.has(u.id) ? '・<em>今の画像を上書きします</em>' : ''}`
            : `<span class="admin-need-id">どの素材の画像か指定してください：</span>
               <input type="text" class="admin-input admin-input-small" list="adminMaterialNames" placeholder="素材名 または 図鑑No" onchange="setIconUploadName(${i}, this.value)">`;
        return `<li class="admin-upload-item${u.id ? '' : ' is-pending'}">
                    <img src="${u.previewUrl}" alt="" class="admin-icon-thumb">
                    <div class="admin-upload-info">
                        <span>${idPart}</span>
                        <span class="admin-upload-usage">${escapeHtml(u.file.name)} → ${u.width}×${u.height}・${Math.round(u.blob.size / 1024)}KB</span>
                    </div>
                    <button type="button" class="admin-btn admin-btn-small" onclick="removeIconUpload(${i})">外す</button>
                </li>`;
    }).join('');

    // 素材名の入力候補
    const datalist = document.getElementById('adminMaterialNames');
    if (datalist && !datalist.dataset.filled && Object.keys(globalIdMap).length) {
        datalist.innerHTML = Object.keys(globalIdMap).sort().map(n => `<option value="${escapeHtml(n)}">`).join('');
        datalist.dataset.filled = '1';
    }
    const saveBtn = document.getElementById('adminIconUploadSave');
    const ready = iconUploads.filter(u => !u.error && u.id).length;
    if (saveBtn) {
        saveBtn.disabled = ready === 0;
        saveBtn.textContent = ready ? `${ready} 件を保存` : '保存';
    }
}

// 報酬リスト・交換で使われているのに、画像が無い素材（図鑑No 未登録も含む）
function renderMissingIcons() {
    const list = document.getElementById('adminIconMissing');
    if (!list) return;
    if (!adminImages.icon) { list.innerHTML = ''; return; }
    const existing = new Set(adminImages.icon.map(f => f.name.replace(/\.\w+$/, '')));
    const pending = new Set(iconUploads.filter(u => u.id).map(u => u.id));
    const seen = new Set();
    const missing = [];
    [...usedMaterialNames()].sort().forEach(name => {
        const id = globalIdMap[name] ? String(globalIdMap[name]) : '';
        if (id && (existing.has(id) || seen.has(id))) return;
        if (id) seen.add(id);
        missing.push({ name, id });
    });

    if (missing.length === 0) {
        list.innerHTML = `<li class="admin-empty">画像が無い素材はありません 🎉</li>`;
        return;
    }
    list.innerHTML = missing.map(m => m.id
        ? `<li class="admin-missing-item${pending.has(m.id) ? ' is-ready' : ''}">
               <span><strong>No.${escapeHtml(m.id)}</strong> ${escapeHtml(m.name)}${pending.has(m.id) ? '（追加待ち）' : ''}</span>
               <label class="admin-btn admin-btn-small">画像を選ぶ<input type="file" accept="image/*" hidden onchange="pickMissingIcon(this, '${escapeHtml(m.id)}')"></label>
           </li>`
        : `<li class="admin-missing-item is-noid">
               <span>${escapeHtml(m.name)}</span>
               <span class="admin-upload-usage">図鑑No が Excel に未登録（先に Excel の「素材名と図鑑番号の対応」に登録してください）</span>
           </li>`).join('');
}

async function saveIconUploads() {
    if (!requireToken('adminIconUploadMessage')) return;
    const ready = iconUploads.filter(u => !u.error && u.id);
    if (ready.length === 0) return;
    setAdminBusy(true);
    showAdminMessage('adminIconUploadMessage', `GitHub に ${ready.length} 件保存しています…`, 'info');
    try {
        const files = [];
        for (const u of ready) {
            files.push({ path: `images/${u.id}.png`, base64: arrayBufferToBase64(await u.blob.arrayBuffer()) });
        }
        await commitFilesToGitHub(files, `素材アイコンを追加（管理画面から）：${ready.map(u => u.id).join(', ')}`);
        ready.forEach(u => URL.revokeObjectURL(u.previewUrl));
        iconUploads = iconUploads.filter(u => !ready.includes(u));
        renderIconUploadList();
        await loadImageList('icon', true);
        showAdminMessage('adminIconUploadMessage', `${ready.length} 件保存しました。公開サイトへの反映には 1〜2 分かかります。`, 'ok');
    } catch (e) {
        showAdminMessage('adminIconUploadMessage', e.message, 'error');
    } finally {
        setAdminBusy(false);
        renderIconUploadList();
    }
}

// 「管理」ボタンと編集欄は、トークンを登録したブラウザ（＝管理者の端末）でだけ表示する。
// ?admin=… はチェックしてもらう人にも共有しているので、それだけでは管理画面を出さない。
function updateAdminVisibility() {
    const hasToken = !!getAdminToken();
    document.getElementById('adminLinkBtn')?.classList.toggle('hidden', !hasToken);
    document.querySelectorAll('.admin-editor').forEach(el => { el.hidden = !hasToken; });
    const locked = document.getElementById('adminLockedNote');
    if (locked) locked.hidden = hasToken;
}

window.addEventListener('DOMContentLoaded', updateAdminVisibility);
