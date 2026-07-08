import crypto from 'crypto';

/**
 * Validates a CPX Research server-to-server postback signature.
 * 
 * IMPORTANT: CPX Research documentation is guarded behind the publisher dashboard.
 * Standard industry practice is MD5(transactionId + secret), but the exact string 
 * concatenation order (e.g. trans_id-subId-secret vs secret-trans_id) varies.
 * 
 * TODO: Verify this hash logic against the specific parameters in the CPX Publisher Dashboard.
 * Do NOT ship this hash validation blindly to production without confirming the parameter order!
 */
export function validateCPXSignature(query: Record<string, any>, secret: string): boolean {
  const { trans_id, hash } = query;
  
  if (!trans_id || !hash) return false;

  // Assumed logic: md5(trans_id + secret)
  // MUST BE VERIFIED IN CPX PUBLISHER DASHBOARD
  const expectedHash = crypto.createHash('md5').update(`${trans_id}${secret}`).digest('hex');
  
  return hash.toLowerCase() === expectedHash.toLowerCase();
}
