-- TOUCHES THE SUBMISSION PATH (draft saving). SECTION 3 of the lockdown: the old functions the Fourge Playbook may still use. Run ONLY after the Playbook is confirmed to
-- use embed keys (or the service-role key, which keeps working). Rollback: the SECTION 3 part of tests/fixtures/lockdown-rollback.sql.
revoke execute on function public.save_group_draft(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.get_group_roster(uuid) from public, anon, authenticated;
revoke execute on function public.get_group_clients(uuid) from public, anon, authenticated;
revoke execute on function public.get_group_aes(uuid) from public, anon, authenticated;
