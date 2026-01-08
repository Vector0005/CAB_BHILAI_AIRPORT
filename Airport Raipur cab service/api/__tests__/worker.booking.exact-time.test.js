import fs from 'fs'
import path from 'path'

test('Worker booking payload includes exact_pickup_time and notes', () => {
  const workerPath = path.join(process.cwd(), '..', '..', 'worker.js')
  const src = fs.readFileSync(workerPath, 'utf8')
  expect(src).toEqual(expect.stringContaining("pathname === '/api/bookings'"))
  expect(src).toEqual(expect.stringContaining('exact_pickup_time'))
  expect(src).toEqual(expect.stringContaining('notes'))
})