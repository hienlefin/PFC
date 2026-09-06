"use client"

// so the user after completing the task, he/she will fill up the form
// and when the form is submitted, the data(assignee_id(from the user session), task_id, completedDate) will be sent to the database,
// database updates the isCompleted and completed date params for the task if all the conditions are met

// now the admin will review the task, if satisfied he/she enters the task_id alone and we update the isVerified params
// in future we can integrate this part of code with leaderboard

import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon, CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
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


const categories = [
    { label: "Club Works", value: "en" },
    { label: "Misc", value: "fr" },
    { label: "Both", value: "de" },
] as const

const priorities = [
    { label: "High", value: "hi" },
    { label: "Low", value: "lo" },
]

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



const items = [
    {
        id: "recents",
        label: "Recents",
    },
    {
        id: "home",
        label: "Home",
    },
    {
        id: "applications",
        label: "Applications",
    },
    {
        id: "desktop",
        label: "Desktop",
    },
    {
        id: "downloads",
        label: "Downloads",
    },
    {
        id: "documents",
        label: "Documents",
    },
] as const

const displayFormSchema = z.object({
    items: z.array(z.string()).refine((value) => value.some((item) => item), {
        message: "You have to select at least one item.",
    }),
})



// This can come from your database or API.


type props = {
    email: string
}

type submitTaskDetails = {
    task_id: string,
    assigner_id: string,
    
}



export function ApproveTaskForm(email: props) {
    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        defaultValues,
    })
    const [isFetching, setIsFetching] = useState(false)

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
        let newEmail = email.email
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
        let userDataObj = userDataJson as { id: string; name: string; email: string; };
        setIsFetching(false)
        let submittedData = JSON.parse(JSON.stringify(data))
        let task: submitTaskDetails = {
            ...submittedData,
            assigner_id: userDataObj.id,

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

        console.log("Data sent successfully")
    }




    return (
        <div>
            <h3 className="text-lg font-medium">Approve Tasks</h3>
            <p className="text-sm text-muted-foreground">
                Approve the completed tasks
            </p>

            <Separator />
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                        control={form.control}
                        name="task_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Task ID</FormLabel>
                                <FormControl>
                                    <Input placeholder="Task ID, Must be unique" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Enter the task ID for the task.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    

                    <Suspense fallback={<div>Loading...</div>}>
                        <Button type="submit">Submit Task</Button>
                    </Suspense>
                </form>
            </Form>
        </div>
    )
}


