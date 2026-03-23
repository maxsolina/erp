import { rmSync, existsSync } from 'fs'
import { join } from 'path'

const nextDir = join('/vercel/share/v0-project', '.next')

if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true })
  console.log('.next cache cleared successfully')
} else {
  console.log('.next directory not found, nothing to clear')
}
