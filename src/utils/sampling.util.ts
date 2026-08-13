import crypto from 'crypto';

/**
 * Deterministic sampling: same user always falls on same side of cut for a given rule.
 * Uses hash(user_id + rule_id) to determine if user should be sampled.
 */
export class SamplingUtil {
  static shouldIncludeUser(userId: string, ruleId: number, samplePercentage: number): boolean {
    if (samplePercentage >= 100) return true;
    if (samplePercentage <= 0) return false;

    // Hash user_id + rule_id to get deterministic value 0-99
    const hash = crypto
      .createHash('md5')
      .update(`${userId}:${ruleId}`)
      .digest('hex');
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const sample = hashValue % 100;

    return sample < samplePercentage;
  }
}

export default SamplingUtil;
