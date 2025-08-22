-- Reset test data for API testing
-- This script resets subscriptions back to active and cleans up cancellations

-- Reset all subscriptions back to active status
UPDATE subscriptions 
SET status = 'active', updated_at = NOW()
WHERE status IN ('pending_cancellation', 'cancelled');

-- Clean up all cancellations (for testing purposes)
DELETE FROM found_job_cancellations;
DELETE FROM cancellations;

-- Verify the reset
SELECT 
  u.email,
  s.status,
  s.monthly_price
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id
ORDER BY u.email;
