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

  pow: z.string().nonempty({ message: "Please enter the Proof of work" }),


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

type submitTaskDetails = {
  task_id: string,
  assignee_id: string,
  pow: string,

}


export function SubmitTaskPop(props: props) {

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues,
  })
  const [isFetching, setIsFetching] = useState(false)
  const { toast } = useToast()

  // submitted data will have task_id and completedDate values
  async function onSubmit(data: AccountFormValues) {
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
    let task: submitTaskDetails = {
      task_id: props.id,
      assignee_id: userDataObj.reg_no,
      // get tht input value pow from the user
      pow: data.pow




    };


    console.log("Data from on submit", task)

    const res = await fetch("/api/submitTask", {
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
    // toast the user that it got submitted and refresh the page
    toast({
      title: "Task submitted!",
      description: "Refreshing the page in few seconds",
    })

    setTimeout(function () { window.location.reload() }, 3000);


    console.log("HEHEHEHE, done bro")
  }



  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="outline">Submit Task</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[425px] ">
        {/* <DialogHeader>
          <DialogTitle>Submit task</DialogTitle>
          <DialogDescription>
            If completed, please submit your task.
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
              Submit Task


            </Button>
          </Suspense>
        </DialogFooter> */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="pow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proof Of Work</FormLabel>
                  <FormControl>
                    <Input placeholder="Proof Of Work" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter any proof you have for the completion.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button onClick={()=>onSubmit}>
              {isFetching ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.logo className="mr-2 h-4 w-4" />
              )}{" "}
              Submit Task


            </Button>
          </form>
        </Form>




      </DialogContent>
    </Dialog>
  )
}
