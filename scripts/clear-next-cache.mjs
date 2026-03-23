import { rmSync, existsSync } from 'fs'
import { join } from 'path'

const nextDir = join(process.cwd(), '.next')
if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true })
  console.log('.next eliminado correctamente')
} else {
  console.log('.next no existe, nada que limpiar')
}
