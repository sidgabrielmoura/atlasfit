-- Preserve historical cancelled bookings. Abort on active duplicates; reconcile explicitly before deployment.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "GymClassBooking" WHERE status IN ('CONFIRMED','ATTENDED','NO_SHOW') GROUP BY "sessionId", "studentMemberId" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'GYM_BOOKING_ACTIVE_DUPLICATES: reconcile historical active bookings before applying this migration';
  END IF;
  IF EXISTS (SELECT 1 FROM "GymClassWaitlist" WHERE status IN ('WAITING','OFFERED') GROUP BY "sessionId", "studentMemberId" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'GYM_WAITLIST_ACTIVE_DUPLICATES: reconcile historical entries before applying this migration';
  END IF;
END $$;
CREATE UNIQUE INDEX "GymClassBooking_active_student_session_key" ON "GymClassBooking" ("sessionId", "studentMemberId") WHERE status IN ('CONFIRMED','ATTENDED','NO_SHOW');
CREATE UNIQUE INDEX "GymClassWaitlist_active_student_session_key" ON "GymClassWaitlist" ("sessionId", "studentMemberId") WHERE status IN ('WAITING','OFFERED');
