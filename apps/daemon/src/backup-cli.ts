// node apps/daemon/src/backup-cli.ts <backup file>
// Opens a backup on its own and checks it. Exit code 0 means it is a usable JunOS database, 1 means it is not.
import { verifyBackup } from './backup.ts'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node apps/daemon/src/backup-cli.ts <backup file>')
  process.exit(2)
}
const result = verifyBackup(file)
if (result.ok) console.log(`OK: ${file} passed its checks.`)
else {
  console.error(`NOT A GOOD BACKUP: ${file}`)
  for (const p of result.problems) console.error(`- ${p}`)
}
process.exit(result.ok ? 0 : 1)
