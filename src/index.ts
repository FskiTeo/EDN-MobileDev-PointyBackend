import { requireAuth } from "./middlewares/authMiddleware";
import coursesRouter from "./routes/cousesRoute";
import teachersRouter from "./routes/teachersRoute";

const express = require('express')
const app = express()
const port = 3000

app.use(express.json())

app.use(requireAuth);

app.use('/courses', coursesRouter)
app.use('/teachers', teachersRouter)

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})