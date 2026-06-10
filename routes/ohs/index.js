import { Router } from 'express'
import incidentsRouter from './incidents.js'
import risksRouter from './risks.js'
import equipmentRouter from './equipment.js'
import inspectionsRouter from './inspections.js'
import mapRouter from './map.js'
import filesRouter from './files.js'
import appointmentsRouter from './appointments.js'

// OHS index router — mounts every OHS domain sub-router at the same base so
// the registered endpoint paths are identical to the pre-split single file.
export default function ohsRouter(readData, writeData, upload, uploadsDir) {
  const router = Router()

  router.use(incidentsRouter(readData, writeData, upload, uploadsDir))
  router.use(risksRouter(readData, writeData, upload, uploadsDir))
  router.use(equipmentRouter(readData, writeData, upload, uploadsDir))
  router.use(inspectionsRouter(readData, writeData, upload, uploadsDir))
  router.use(mapRouter(readData, writeData, upload, uploadsDir))
  router.use(filesRouter(readData, writeData, upload, uploadsDir))
  router.use(appointmentsRouter(readData, writeData, upload, uploadsDir))

  return router
}
