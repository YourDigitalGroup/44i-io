-- DOES NOT TOUCH THE SUBMISSION PATH (one UPDATE on old orders). Run right AFTER the form patch (form-step2.patch) is merged and live. Orders placed between the Step 2 SQL and that merge
-- have no email_sent_at, because the old form does not write it; this marks them sent, as the first backfill did. Claude fills in the exact merge time below before handing it over;
-- orders placed after that moment are NOT touched (their email status is real).
update public.orders set email_sent_at = created_at where email_sent_at is null and created_at < 'MERGE_TIME_HERE'::timestamptz;
