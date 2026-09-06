
import { Metadata } from "next"
import Image from "next/image"
import { z } from "zod"

import { columns } from "./components/columns"
import { DataTable } from "./components/data-table"
import { UserNav } from "./components/user-nav"
import { taskSchema } from "./data/schema"

export const metadata: Metadata = {
  title: "Tasks",
  description: "A task and issue tracker build using Tanstack Table.",
}

type props = {
  task_id: string,
  task_name: string,
  deadline: string,
  category: string,
  priority: string,
  assigner_id: string,
}
// Simulate a database read for tasks.
function getTasks(data: any[]) {
  // let data = [
  //   {
  //     "task_id": "TASK-8782",
  //     "task_name": "You can't compress the program without quantifying the open-source SSD pixel!",
  //     "deadline": "2003",
  //     "category": "club",
  //     "priority": "lo",
  //     "assigner_id":"chnrv"
  //   },

  // ]
  console.log("Table data is:", data)



  return z.array(taskSchema).parse(data)
}


type Props = {
  tasks: any[];
  email: string;
};

// we will display the following:
// task_id, priority, category, task_name, deadline, points
export const AssignedTaskTableUser: React.FC<Props> = (Tasks, email) => {
  if (Tasks != undefined && Tasks != null) {
    const tasks = getTasks(Tasks.tasks as any[])
  
    console.log("email is:", Tasks.email)
    return (
      <>
        {/* <div className="md:hidden">
          <Image
            src="/examples/tasks-light.png"
            width={1280}
            height={998}
            alt="Playground"
            className="block dark:hidden"
          />
          <Image
            src="/examples/tasks-dark.png"
            width={1280}
            height={998}
            alt="Playground"
            className="hidden dark:block"
          />
        </div> */}
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
          <div className="flex items-center justify-between space-y-2">
            <div>
              
              <p className="text-muted-foreground">
                Here is your assigned tasks
              </p>
            </div>
            
          </div>
          <DataTable data={tasks as any} columns={columns} email={Tasks.email}  />
        </div>
      </>
    )
  }
  else{
    return (
      <p>Loading</p>
    )
  }
}
