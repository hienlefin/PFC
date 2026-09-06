import { z } from "zod"

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const taskSchema = z.object({
  task_id: z.string(),
  task_name: z.string(),
  deadline: z.string(),
  category: z.string(),
  priority: z.string(),
  pow: z.string(),
  assignee_id: z.string(),
  points: z.any(),
})

export type Task = z.infer<typeof taskSchema>
