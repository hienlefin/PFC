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

  completedDate: z.date({
    required_error: "A date is required.",
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
  email: string,
  pow: string
  task_name: string
  assignee_id: string
}

type submitTaskDetails = {
  task_id: string,
  assigner_id: string,
  task_name: string,
  assignee_id: string,

}


export function ApproveTaskPop(props: props) {

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues,
  })


  let { toast } = useToast()

  const [isFetching, setIsFetching] = useState(false)

  // submitted data will have task_id and completedDate values
  async function onSubmit() {

    let newEmail = props.email
    console.log("Function is called")
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
    // let submittedData = JSON.parse(JSON.stringify(data))
    let task: submitTaskDetails = {
      // ...submittedData,
      task_id: props.id,
      assigner_id: userDataObj.reg_no,
      task_name: props.task_name,
      assignee_id: props.assignee_id 
    };


    console.log("Data from on submit", task)

    const res = await fetch("/api/approveTask", {
      method: "POST",
      body: JSON.stringify(
        task
      ),
      headers: {
        "Content-Type": "application/json",
      },
    })
    const json = await res.json()
    console.log("json", json)
    setIsFetching(false)

    // show a toast and refresh the page
    toast({
      title: "Task approved!",
      description: "Refreshing the page in few seconds",
    })

    console.log("Data sent successfully")

    // refresh
    setTimeout(() => {
      window.location.reload()
    }, 3000)

  }






  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="outline">Approve Task</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[425px] ">
        <DialogHeader>
          <DialogTitle>Approve task</DialogTitle>
          <DialogDescription>
            If you confirm that the task is completed, approve it.
            Proof Of Work: {props.pow}
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
              Approve Task


            </Button>
          </Suspense>
        </DialogFooter>


      </DialogContent>
    </Dialog>
  )
}
