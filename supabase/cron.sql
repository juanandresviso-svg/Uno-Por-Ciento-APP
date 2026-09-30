-- Uno por Ciento · Cron de recordatorios
-- Vercel Hobby solo permite crons diarios, así que Supabase llama a la app cada 5 minutos.
-- 1) Reemplaza TU-APP y TU_CRON_SECRET (el mismo valor de CRON_SECRET en Vercel).
-- 2) Pega en Supabase → SQL Editor → Run. Se ejecuta una sola vez.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('uno-por-ciento-tick')
where exists (select 1 from cron.job where jobname = 'uno-por-ciento-tick');

select cron.schedule(
  'uno-por-ciento-tick',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://TU-APP.vercel.app/api/cron/tick',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer TU_CRON_SECRET'),
    body    := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);

-- Para revisar que corre:
-- select * from cron.job_run_details order by start_time desc limit 10;
-- select status_code, content from net._http_response order by created desc limit 5;
