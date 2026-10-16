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
    if (!adminState.loaded) await loadAdminData();
    renderMaintenanceEditor();
    renderAnnouncementEditor();
}

// 編集するデータを読み込む。トークンがあれば GitHub から最新を、無ければ今サイトに出ている内容を使う
async function loadAdminData() {
    const fromSite = () => {
        adminState.periods = maintenanceData.map(m => ({ start: m.startStr, end: m.endStr }));
        adminState.announcements = announcementData.map(n => ({ ...n }));
    };

    if (!getAdminToken()) {
        fromSite();
        // サイトのデータを読み込み終わる前に開いた時は、読み込み後にもう一度読み直す
        adminState.loaded = (settingsLoaded.maintenance && settingsLoaded.announcements) || dungeonData.length > 0;
        return;
    }

    try {
        const [mainte, notices] = await Promise.all([
            readJsonFromGitHub(SETTINGS_FILES.maintenance),
            readJsonFromGitHub(SETTINGS_FILES.announcements)
        ]);
        fromSite();
        if (mainte.data && Array.isArray(mainte.data.periods)) adminState.periods = mainte.data.periods.map(p => ({ start: p.start, end: p.end }));
        if (notices.data && Array.isArray(notices.data.items)) adminState.announcements = notices.data.items.map(n => ({ ...n }));
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

// ?admin=… で開いた時だけ、トップに「管理」ボタンを出す
window.addEventListener('DOMContentLoaded', () => {
    if (typeof isAdminMode === 'function' && isAdminMode()) {
        document.getElementById('adminLinkBtn')?.classList.remove('hidden');
    }
});
