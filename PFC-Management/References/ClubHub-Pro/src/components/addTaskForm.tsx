"use client"

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
import { useToast } from "@/components/ui/use-toast"

import { Suspense, use, useState } from "react"
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

const task_names = [
    { label: "Pull Request", value: "pull request", points: 10 },
    { label: "Blog Medium", value: "blog medium", points: 15 },
    { label: "Blog", value: "blog", points: 20 },
    { label: "SM Posting", value: "sm posting", points: 7 },
    { label: "Weekly Work", value: "weekly work", points: 5 },
    { label: "Idea", value: "idea", points: 3 },
    { label: "Brouchure", value: "brouchure", points: 10 },
    { label: "News", value: "news", points: 5 },
    { label: "Demos", value: "demos", points: 20 },
    { label: "OC Volunteer", value: "oc volunteer", points: 30 },
    { label: "OC Assigned", value: "oc assigned", points: 20 },
    { label: "OC Manager", value: "oc manager", points: 20 },
    { label: "Marketing", value: "marketing", points: 2 },
    { label: "Mini Project", value: "mini project", points: 100 },
    { label: "Complete Project", value: "complete project", points: 200 },
    { label: "Promotion Medium", value: "promotion medium", points: 25 },
    { label: "Promotion Large", value: "promotion large", points: 50 },
    { label: "Discord", value: "discord" },
]

const accountFormSchema = z.object({


    task_name: z.string({
        required_error: "Please select a Task Name.",
    }),
    task_description: z.string({
        required_error: "Please give a task description.",
    }),
    deadline: z.date({
        required_error: "A date is required.",
    }),
    category: z.string({
        required_error: "Please select a category.",
    }),
    priority: z.string({
        required_error: "Please select a priority.",
    }),
    assignee_id: z.string({
        required_error: "Please enter the registration number of assignee.",
    }),
    points: z.string({
        required_error: "Please enter potential points.",
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
    email: string,
    users: any[]
}

type taskdetails = {
    task_id: string,
    task_name: string,
    deadline: Date,
    category: string,
    priority: string,
    assignee_id: string,
    points: string,
    assigner_id: string,
    assigner_name: string
}



export function AddTaskForm(email: props) {



    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        defaultValues,
    })
    const [isFetching, setIsFetching] = useState(false)
    const { toast } = useToast()
    console.log("Email is:", email.users)

    const assignees = email.users


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
        console.log("User data json is:", userDataJson)
        let userDataObj = userDataJson as { reg_no: string; name: string; email: string; };
        setIsFetching(false)
        let submittedData = JSON.parse(JSON.stringify(data))
        let task: taskdetails = {
            ...submittedData,
            assigner_id: userDataObj.reg_no,
            assigner_name: userDataObj.name,

        };


        console.log("Data from on submit", task)

        const res = await fetch("/api/assignTask", {
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
        // add toast that the data is sent successfully and refresh the page after few secs
        setIsFetching(false)
        toast({
            title: "Task Added Successfully!",
            description: "Page will refresh soon",
        })
        // refresh after few secs
        setTimeout(() => {
            window.location.reload()
        }, 3000)


        console.log("Data sent successfully")
    }

    function handlePoints(task_name: any) {
        console.log("Task name is:", task_name)
        let points = task_names.find((task) => task.value === task_name.value)?.points
        console.log("Points selected based on task name is:", points)
        return points as number
    }





    return (
        <div>
            <h3 className="text-lg font-medium">Assign Tasks</h3>
            <p className="text-sm text-muted-foreground">
                Assign tasks to users
            </p>
            <br />

            <Separator />
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {/* <FormField
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
                    /> */}
                    {/* <FormField
                        control={form.control}
                        name="task_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Task Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Task Name" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Enter the task name to be assigned.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    /> */}

                    <FormField
                        control={form.control}
                        name="task_name"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Task Name</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "w-[200px] justify-between  hover:border-blue-300 transition-colors",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value
                                                    ? task_names.find(
                                                        (task_name) => task_name.value === field.value
                                                    )?.label
                                                    : "Select Task Name"}
                                                <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search language..." />
                                            <CommandEmpty>No Tasks found.</CommandEmpty>
                                            <CommandGroup>
                                                {task_names.map((task_name) => (
                                                    <CommandItem
                                                        value={task_name.label}
                                                        key={task_name.value}
                                                        onSelect={() => {
                                                            form.setValue("task_name", task_name.value);
                                                            form.setValue("points", handlePoints(task_name).toString())
                                                        }}
                                                    >
                                                        <CheckIcon
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                task_name.value === field.value
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        {task_name.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    This is the name of the task which will be used to assign the user.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>

                        )}
                    />

                    <FormField
                        control={form.control}
                        name="points"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Points</FormLabel>
                                <FormControl>
                                    <Input placeholder="Points" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Enter the points to be assigned.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />


                    <FormField
                        control={form.control}
                        name="task_description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Task Description</FormLabel>
                                <FormControl>
                                    <Input placeholder="Task Description" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Enter the task description.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="deadline"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Deadline</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-[240px] pl-3 text-left font-normal hover:border-blue-300 transition-colors",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date < new Date() || date < new Date("1900-01-01")
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    The deadline you select will be assigned to user.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Category</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "w-[200px] justify-between  hover:border-blue-300 transition-colors",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value
                                                    ? categories.find(
                                                        (category) => category.value === field.value
                                                    )?.label
                                                    : "Select category"}
                                                <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search language..." />
                                            <CommandEmpty>No category found.</CommandEmpty>
                                            <CommandGroup>
                                                {categories.map((category) => (
                                                    <CommandItem
                                                        value={category.label}
                                                        key={category.value}
                                                        onSelect={() => {
                                                            form.setValue("category", category.value)
                                                        }}
                                                    >
                                                        <CheckIcon
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                category.value === field.value
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        {category.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    This is the category that will be used to assign the user.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>

                        )}
                    />
                    <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Priority</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "w-[200px] justify-between  hover:border-blue-300 transition-colors",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value
                                                    ? priorities.find(
                                                        (priority) => priority.value === field.value
                                                    )?.label
                                                    : "Select priority"}
                                                <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search priority..." />
                                            <CommandEmpty>No priority found.</CommandEmpty>
                                            <CommandGroup>
                                                {priorities.map((priority) => (
                                                    <CommandItem
                                                        value={priority.label}
                                                        key={priority.value}
                                                        onSelect={() => {
                                                            form.setValue("priority", priority.value)
                                                        }}
                                                    >
                                                        <CheckIcon
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                priority.value === field.value
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        {priority.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    This is the priority that will be used to assign the user.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>

                        )}
                    />
                    {/* <FormField
                        control={form.control}
                        name="assignee_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Assignee_id</FormLabel>
                                <FormControl>
                                    <Input placeholder="Registration Number..." {...field} />
                                </FormControl>
                                <FormDescription>
                                    Enter the registration number of assignee to be assigned.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    /> */}

                    <FormField
                        control={form.control}
                        name="assignee_id"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Name of the person to be assigned</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "w-[200px] justify-between  hover:border-blue-300 transition-colors",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value
                                                    ? assignees.find(
                                                        (assignee) => assignee.value === field.value
                                                    )?.label
                                                    : "Select assignee"}
                                                <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search priority..." />
                                            <CommandEmpty>No assignee found.</CommandEmpty>
                                            <CommandGroup>
                                                {assignees.map((assignee) => (
                                                    <CommandItem
                                                        value={assignee.label}
                                                        key={assignee.value}
                                                        onSelect={() => {
                                                            form.setValue("assignee_id", assignee.value)
                                                        }}
                                                    >
                                                        <CheckIcon
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                assignee.value === field.value
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            )}
                                                        />
                                                        {assignee.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    Select an assignee to assign the task.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>

                        )}
                    />




                    {/* if isFetching is true then there should be a spinner */}
                    {isFetching ? (
                        <Button type="submit" disabled>
                            <svg
                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24">
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            Adding Task
                        </Button>
                    ) : (
                        <Button type="submit">
                            Add Task
                        </Button>
                    )}

                </form>
            </Form>
        </div>
    )
}


