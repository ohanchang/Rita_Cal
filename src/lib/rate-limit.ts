const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function isRateLimited(ip: string, limit: number = 5, windowMs: number = 60000): boolean {
  if (!ip) return false;
  
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  // Clean up occasionally to prevent memory leak
  if (rateLimitMap.size > 1000) {
    const cutoff = now;
    for (const [key, val] of rateLimitMap.entries()) {
      if (val.resetTime < cutoff) rateLimitMap.delete(key);
    }
  }

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  if (record.count >= limit) {
    return true;
  }
  
  record.count += 1;
  return false;
}
