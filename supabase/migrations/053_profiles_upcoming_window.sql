-- V7.1: per-user upcoming-class popup window.
--
-- Each teacher / student gets to pick how many days ahead the
-- corner popup should look for upcoming classes. Default 5 days;
-- 0 disables the popup entirely. Cap at 30 so nobody accidentally
-- configures a month-long wall of reminders.

alter table public.profiles
  add column if not exists upcoming_class_window_days integer
    not null default 5
    check (upcoming_class_window_days between 0 and 30);
