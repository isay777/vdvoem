import { describe, expect, it } from 'vitest';
import { inviteCodeSchema, isVersionConflict, nextRetryDelay, neutralNotificationBody, otpCodeSchema } from '../src';

describe('shared contracts', () => {
  it('validates OTP and invitation codes', () => {
    expect(otpCodeSchema.safeParse('123456').success).toBe(true);
    expect(otpCodeSchema.safeParse('12345').success).toBe(false);
    expect(inviteCodeSchema.parse('ab2cd3')).toBe('AB2CD3');
  });

  it('detects optimistic locking conflicts', () => {
    expect(isVersionConflict(2, 3)).toBe(true);
    expect(isVersionConflict(3, 3)).toBe(false);
    expect(isVersionConflict(null, 3)).toBe(false);
  });

  it('caps retry backoff and keeps notification text private', () => {
    expect(nextRetryDelay(10)).toBe(60_000);
    expect(neutralNotificationBody()).not.toContain('задач');
  });
});
