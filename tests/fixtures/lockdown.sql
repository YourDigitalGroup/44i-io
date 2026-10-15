-- TOUCHES THE SUBMISSION PATH (the order form's and Companion's reads of the group). Embed-key lockdown. Run the sections ONE AT A TIME, in order, after hours.
-- Rollback for every section: tests/fixtures/lockdown-rollback.sql (plain re-grants / re-create policy; nothing is dropped, nothing is rebuilt).
-- Before running: lockdown-prerequisites.sql is run, its matching Admin/Strategist code is merged, and a form with a key works. After EACH section: reload a keyed form.

-- ===== SECTION 1: take public access away from the OLD (no-key) versions of the form functions =====
-- The key-based versions (same names, first argument p_t) are not touched. Functions are revoked, not dropped: the owner and the service role keep access.
revoke execute on function public.companion_get_active_services(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.companion_get_client_trello_list(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.companion_get_intake_responses(uuid, uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.companion_get_order_trello_cards(uuid, uuid, uuid[]) from public, anon, authenticated;
revoke execute on function public.companion_submit_request(uuid, uuid, uuid, text, text, jsonb, text, text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.delete_group_draft(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.find_or_create_ae(jsonb) from public, anon, authenticated;
revoke execute on function public.find_or_create_client(jsonb) from public, anon, authenticated;
revoke execute on function public.get_client_aes(uuid) from public, anon, authenticated;
revoke execute on function public.get_client_agents(uuid) from public, anon, authenticated;
revoke execute on function public.get_client_counties(uuid) from public, anon, authenticated;
revoke execute on function public.get_client_details(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.get_client_service_flights(uuid) from public, anon, authenticated;
revoke execute on function public.get_group_drafts(uuid) from public, anon, authenticated;
revoke execute on function public.log_draft_save(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.set_client_trello_list_id(uuid, text) from public, anon, authenticated;
revoke execute on function public.get_client_names(uuid[]) from public, anon, authenticated;

-- ===== SECTION 2: remove the public read of the group table and of the always-BCC list =====
-- (the forms read both through the key-based functions; Admin reads them through admin_get_groups / admin_get_notification_settings)
drop policy if exists groups_public_read on public.groups;
drop policy if exists notification_settings_public_read on public.notification_settings;
