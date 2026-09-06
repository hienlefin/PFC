import { z } from "zod"

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const taskSchema = z.object({
  task_id: z.string(),
  task_name: z.string(),
  deadline: z.string(),
  category: z.string(),
  priority: z.string(),
  assigner_id: z.string(),
  assigner_name: z.string(),
  assigner_image_url: z.string(),
  task_description: z.string()
})

export type Task = z.infer<typeof taskSchema>
