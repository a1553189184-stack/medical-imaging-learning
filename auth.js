/* Global account shell for the static site. Auth is deliberately unavailable
 * until a site owner supplies a real Supabase project in auth-config.js. */
(async function () {
  'use strict';
  const config = window.IMAGE_LAB_AUTH_CONFIG || {};
  const url = typeof config.supabaseUrl === 'string' ? config.supabaseUrl.trim() : '';
  const key = typeof config.supabasePublishableKey === 'string' ? config.supabasePublishableKey.trim() : '';
  const githubEnabled = config.githubProviderEnabled === true;
  const enabled = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && key.length > 20;
  const $ = function (selector) { return document.querySelector(selector); };
  const $$ = function (selector) { return Array.from(document.querySelectorAll(selector)); };
  const dialog = $('#authDialog');
  const message = $('#authMessage');
  const email = $('#authEmail');
  const userLabel = $('#authUserLabel');
  const badge = $('#authStatusBadge');
  const syncButton = $('#authSync');
  const restoreButton = $('#authRestore');
  const githubButton = $('#authGitHub');
  const authDivider = $('.auth-divider');
  let client = null;
  let currentUser = null;

  function setMessage(text, kind) {
    if (!message) return;
    message.textContent = text || '';
    message.dataset.kind = kind || '';
  }
  function displayName(user) {
    if (!user) return '';
    const meta = user.user_metadata || {};
    return String(meta.full_name || meta.name || user.email || '已登录用户');
  }
  function setUi(user) {
    currentUser = user || null;
    const name = displayName(currentUser);
    $$('.auth-open').forEach(function (button) {
      button.hidden = Boolean(currentUser);
    });
    $$('.auth-account').forEach(function (button) {
      button.hidden = !currentUser;
      button.textContent = name ? ('◉ ' + name) : '我的账户';
    });
    if (userLabel) userLabel.textContent = name || (enabled ? '访客模式' : '本机访客模式');
    if (badge) badge.textContent = currentUser ? '已登录 · 云端账户' : (enabled ? '访客模式 · 可登录' : '访客模式 · 本机保存');
    if (syncButton) syncButton.hidden = !currentUser || !config.cloudBackupEnabled;
    if (restoreButton) restoreButton.hidden = !currentUser || !config.cloudBackupEnabled;
    if (githubButton) githubButton.hidden = !githubEnabled;
    if (authDivider) authDivider.hidden = !githubEnabled;
    const signOutButton = $('#authSignOut');
    if (signOutButton) signOutButton.hidden = !currentUser;
    if (currentUser && dialog && dialog.open) setMessage('已登录为 ' + name + '。');
    window.dispatchEvent(new CustomEvent('imagelab:authchange', { detail: { user: currentUser, enabled: enabled } }));
  }
  function showDialog() {
    if (!dialog) return;
    if (!enabled) setMessage('账户服务尚未配置。站点可继续以访客模式使用；管理员请按 AUTH_SETUP.md 配置 Supabase。', 'info');
    else if (currentUser) setMessage('已登录为 ' + displayName(currentUser) + '。', 'success');
    else setMessage('使用邮箱登录链接，或使用 GitHub 安全授权。本站不保存密码。', 'info');
    if (typeof dialog.showModal === 'function') dialog.showModal();
  }
  function closeDialog() { if (dialog && dialog.open) dialog.close(); }
  function cleanRedirectUrl() {
    const target = new URL(location.href);
    target.hash = '';
    target.searchParams.delete('code');
    target.searchParams.delete('error');
    target.searchParams.delete('error_code');
    target.searchParams.delete('error_description');
    return target.toString();
  }
  function snapshot() {
    const values = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && (k.indexOf('yys-honest-') === 0 || k === 'yys-training-v2')) values[k] = localStorage.getItem(k);
    }
    return { version: 1, exportedAt: new Date().toISOString(), values: values };
  }
  async function syncNow() {
    if (!currentUser || !config.cloudBackupEnabled) return;
    setMessage('正在加密连接并保存学习记录…', 'info');
    const payload = snapshot();
    const result = await client.from('learning_backups').upsert({
      user_id: currentUser.id,
      payload: payload,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (result.error) throw result.error;
    setMessage('学习记录已同步到你的账户。自由文本笔记也会一并保存，请勿记录患者身份信息。', 'success');
  }
  async function restoreNow() {
    if (!currentUser || !config.cloudBackupEnabled) return;
    if (!window.confirm('恢复云端备份会覆盖本机同名学习记录。确定继续吗？')) return;
    setMessage('正在读取云端备份…', 'info');
    const result = await client.from('learning_backups').select('payload').eq('user_id', currentUser.id).maybeSingle();
    if (result.error) throw result.error;
    const values = result.data && result.data.payload && result.data.payload.values;
    if (!values || typeof values !== 'object') { setMessage('你的账户中尚无可恢复的学习记录。', 'info'); return; }
    Object.keys(values).forEach(function (k) {
      if (k.indexOf('yys-honest-') === 0 || k === 'yys-training-v2') localStorage.setItem(k, values[k]);
    });
    setMessage('已恢复云端学习记录；页面将刷新以载入它。', 'success');
    window.setTimeout(function () { location.reload(); }, 900);
  }
  async function sendMagicLink() {
    if (!enabled || !client) { showDialog(); return; }
    const address = String(email && email.value || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) { setMessage('请输入有效邮箱地址。', 'error'); return; }
    setMessage('正在发送登录链接…', 'info');
    const result = await client.auth.signInWithOtp({ email: address, options: { emailRedirectTo: cleanRedirectUrl() } });
    if (result.error) throw result.error;
    setMessage('登录链接已发送，请在邮箱中打开；链接会回到当前页面。', 'success');
  }
  async function signInGitHub() {
    if (!enabled || !client) { showDialog(); return; }
    setMessage('正在跳转到 GitHub 安全授权…', 'info');
    const result = await client.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: cleanRedirectUrl() } });
    if (result.error) throw result.error;
  }
  async function signOut() {
    if (!client) return;
    const result = await client.auth.signOut();
    if (result.error) throw result.error;
    setUi(null);
    setMessage('已退出。你的本机学习记录未被删除。', 'success');
  }
  $$('.auth-open').forEach(function (button) { button.addEventListener('click', showDialog); });
  $$('.auth-account').forEach(function (button) { button.addEventListener('click', showDialog); });
  $('#closeAuth') && $('#closeAuth').addEventListener('click', closeDialog);
  $('#authMagicLink') && $('#authMagicLink').addEventListener('click', function () { sendMagicLink().catch(function (error) { setMessage(error.message || '无法发送登录链接。', 'error'); }); });
  githubButton && githubButton.addEventListener('click', function () { signInGitHub().catch(function (error) { setMessage(error.message || '无法开始 GitHub 登录。', 'error'); }); });
  $('#authSignOut') && $('#authSignOut').addEventListener('click', function () { signOut().catch(function (error) { setMessage(error.message || '退出失败。', 'error'); }); });
  syncButton && syncButton.addEventListener('click', function () { syncNow().catch(function (error) { setMessage(error.message || '同步失败。请检查云端数据表与权限策略。', 'error'); }); });
  restoreButton && restoreButton.addEventListener('click', function () { restoreNow().catch(function (error) { setMessage(error.message || '恢复失败。请检查云端数据表与权限策略。', 'error'); }); });
  window.ImageLabAuth = { enabled: enabled, open: showDialog, syncNow: syncNow, restoreNow: restoreNow, getUser: function () { return currentUser; } };
  if (!enabled) { setUi(null); return; }
  try {
    const module = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
    client = module.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    const session = await client.auth.getSession();
    setUi(session.data.session && session.data.session.user);
    client.auth.onAuthStateChange(function (_event, nextSession) { setUi(nextSession && nextSession.user); });
  } catch (error) {
    setUi(null);
    console.error('Image Lab Auth initialization failed', error);
  }
}());
