import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormEvent } from "react"


import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon, CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { cn } from "@/lib/utils"

import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@radix-ui/react-checkbox"
import { Separator } from "@radix-ui/react-dropdown-menu"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Toast } from "@/components/ui/toast"
import { Suspense, useState } from "react"
// import circular json
// import CircularJSON from 'circular-json'
// import * as util from 'util' // has no default export
import { parse, stringify, toJSON, fromJSON } from 'flatted';
import { Icons } from "./Icon"
import { useToast } from "@/components/ui/use-toast"



const accountFormSchema = z.object({

  task_id: z.string({
    required_error: "Please give a task_id.",
  }),


})


type AccountFormValues = z.infer<typeof accountFormSchema>

// This can come from your database or API.
const defaultValues: Partial<AccountFormValues> = {
  // name: "Your name",
  // dob: new Date("2023-01-23"),
}

type props = {
  id: string,
  email: string
}

type deleteTaskDetails = {
  task_id: string,
    assignee_id: string,


}


export function DeleteTaskPop(props: props) {

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues,
  })
  const [isFetching, setIsFetching] = useState(false)
  const { toast } = useToast()

  // submitted data will have task_id and completedDate values
  async function onSubmit() {
    // Toast({
    //   title: "You submitted the following values:",
    //   description: (
    //     <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
    //       <code className="text-white">{JSON.stringify(data, null, 2)}</code>
    //     </pre>
    //   ),
    // })
    let newEmail = props.email
    console.log("Function is called", newEmail)
    setIsFetching(true)
    let userData = await fetch("/api/getUserDetails", {
      method: "POST",
      body: JSON.stringify({
        email: newEmail
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })


    let userDataJson = await userData.json();
    let userDataObj = userDataJson as { reg_no: string; name: string; email: string; };
    console.log(userDataJson)
    // let submittedData = JSON.parse(JSON.stringify(data))
    let task: deleteTaskDetails = {
      task_id: props.id,
      assignee_id: userDataObj.reg_no,
      

    };


    console.log("Data from on submit", task)

    const res = await fetch("/api/deleteTask", {
      method: "POST",
      body: JSON.stringify(
        task,
        
      ),
      headers: {
        "Content-Type": "application/json",
      },
    })
    const json = await res.json()
    console.log("json", json)

    setIsFetching(false)
    // toast the user that it got submitted and refresh the page
    toast({
      title: "Task deleted!",
      description: "Refreshing the page in few seconds",
    })

    setTimeout(function () { window.location.reload() }, 3000);
    

    console.log("HEHEHEHE, done bro")
  }



  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="outline">Delete</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[425px] ">
        <DialogHeader>
          <DialogTitle>Delete task</DialogTitle>
          <DialogDescription>
            Please delete task, if required.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>

          <Suspense fallback={<div>Loading...</div>}>
            <Button onClick={onSubmit}>
              {isFetching ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.logo className="mr-2 h-4 w-4" />
              )}{" "}
              Delete Task

            
            </Button>
          </Suspense>
        </DialogFooter>


      </DialogContent>
    </Dialog>
  )
}
