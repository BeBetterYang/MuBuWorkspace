import { spawn } from 'node:child_process'

const children = [
  spawn(process.execPath, ['server/index.mjs'], { stdio: 'inherit', env: { ...process.env, SIWEI_API_PORT: '5190' } }),
  // Launch Vite through Node directly. Spawning a `.cmd` shim can fail with
  // `EINVAL` on newer Node.js versions on Windows.
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0', '--port', '5185', '--strictPort'], { stdio: 'inherit' }),
]

const stop = () => {
  children.forEach((child) => child.kill())
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
process.on('exit', stop)

Promise.race(children.map((child) => new Promise((resolve) => child.on('exit', resolve))))
  .finally(() => {
    stop()
    process.exit()
  })
