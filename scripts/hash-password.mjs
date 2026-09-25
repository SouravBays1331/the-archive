#!/usr/bin/env node
// Generates a bcrypt hash for a password (spec §07: credentials stored hashed, never in repo).
// Usage: npm run hash -- mypassword
//
// NOTE: dotenv expands `$` inside .env files, so the printed hash encodes `$` as `~`.
// Paste the printed line into ARCHIVE_USERS exactly as shown.
import bcrypt from 'bcryptjs';

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: npm run hash -- <password>');
  process.exit(1);
}
const hash = bcrypt.hashSync(arg, 10).replace(/\$/g, '~');
console.log('');
console.log('Add this to .env.local (or your hosting env):');
console.log(`ARCHIVE_USERS=<username>:${hash},guest`);
console.log('');
