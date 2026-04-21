-- V7.3: live-class duration tracking.
--
-- Until now the Schedule-class flow stored only event_date +
-- event_time (start). To count live classes as study hours, we
-- need to know when the class ended too. End_time is nullable so
-- legacy rows + classes the teacher hasn't closed out yet keep
-- working.
--
-- duration_minutes is a generated column for fast aggregation —
-- (end_time - event_time) in minutes when both times are present
-- AND the class is Done. Anything else stays NULL so SUMs ignore
-- planned/cancelled rows automatically.

alter table public.student_history
  add column if not exists end_time time;

alter table public.student_history
  add column if not exists duration_minutes integer
    generated always as (
      case
        when status = 'Done'
         and event_time is not null
         and end_time is not null
        then greatest(
          0,
          (extract(epoch from (end_time - event_time)) / 60)::integer
        )
        else null
      end
    ) stored;

create index if not exists student_history_duration_idx
  on public.student_history (event_date)
  where duration_minutes is not null;
