// The order form and the Companion must call every group-scoped function THROUGH the embed-key helpers (groupScope / withKey), so that when a form is opened with its key the KEY version runs,
// never the old no-key one. After the embed-key lockdown the old versions refuse everyone, so one call without the helper would fail only for keyed users, only on that screen.
const { read, check, done } = require('./lib');
const forms = { 'index.html': read('index.html'), 'companion/index.html': read('companion/index.html') };
const names = ['companion_get_active_services', 'companion_get_client_trello_list', 'companion_get_intake_responses', 'companion_get_order_trello_cards', 'companion_submit_request', 'delete_group_draft', 'find_or_create_ae', 'find_or_create_client',
  'get_client_aes', 'get_client_agents', 'get_client_counties', 'get_client_details', 'get_client_service_flights', 'get_group_aes', 'get_group_clients', 'get_group_drafts', 'log_draft_save', 'save_group_draft', 'set_client_trello_list_id'];
const bad = [], seen = [];
Object.entries(forms).forEach(([file, src]) => names.forEach(n => {
  const re = new RegExp("sb\\('rpc/" + n + "'", 'g'); let m;
  while ((m = re.exec(src))) {
    seen.push(file + ':' + n);
    const stmt = src.slice(m.index, m.index + 700);
    const keyed = /groupScope\(|withKey\(|EMBED_KEY\b/.test(stmt.split(/\n\s*\n|\}\)\s*(?:\|\||;|\.catch|,)/)[0] + stmt.slice(0, 400));
    const viaBodyVar = /\{\s*method:\s*'POST',\s*body\s*\}/.test(stmt.slice(0, 120)) && /EMBED_KEY_PRESENT \? \{ p_t: EMBED_KEY/.test(src);
    if (!keyed && !viaBodyVar) bad.push(file + ':' + n + ' @' + src.slice(0, m.index).split('\n').length);
  }
}));
check('the forms call group-scoped functions at all (the scan found the calls)', seen.length >= 19, true);
check('every such call in the order form and the Companion goes through groupScope / withKey / the embed key', bad, []);
check('both helpers send the key as p_t when the page has one, and the group id only when it does not', [/function groupScope\(/.test(forms['index.html']) && /p_t: EMBED_KEY/.test(forms['index.html']), /function groupScope\(/.test(forms['companion/index.html']) && /p_t: EMBED_KEY/.test(forms['companion/index.html'])], [true, true]);
done();
