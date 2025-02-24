import { createHash } from 'crypto';

function generateMd5(key: string): string {
  return createHash('md5').update(key).digest('hex');
}

export { generateMd5 };
