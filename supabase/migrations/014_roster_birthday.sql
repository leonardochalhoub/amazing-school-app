-- V2.5: Roster student birthday — enables teacher birthday reminders.

ALTER TABLE roster_students
  ADD COLUMN IF NOT EXISTS birthday DATE;

-- Partial index on the (month, day) derived value so we can efficiently query
-- "birthdays within the next N days" regardless of year.
CREATE INDEX IF NOT EXISTS idx_roster_students_birthday_month_day
  ON roster_students (extract(month FROM birthday), extract(day FROM birthday))
  WHERE birthday IS NOT NULL;
