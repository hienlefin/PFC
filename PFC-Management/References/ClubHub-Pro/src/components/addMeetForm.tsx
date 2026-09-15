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

    
    meet_name: z
        .string()
        .min(2, {
            message: "Name must be at least 2 characters.",
        })
        .max(30, {
            message: "Name must not be longer than 30 characters.",
        }),
    description: z.string({
        required_error: "Please give a task description.",
    }),
    date: z.date({
        required_error: "A date is required.",
    }),
    
    priority: z.string({
        required_error: "Please select a priority.",
    }),
   
})

type AccountFormValues = z.infer<typeof accountFormSchema>

// This can come from your database or API.
const defaultValues: Partial<AccountFormValues> = {
    // name: "Your name",
    // dob: new Date("2023-01-23"),
}



const displayFormSchema = z.object({
    items: z.array(z.string()).refine((value) => value.some((item) => item), {
        message: "You have to select at least one item.",
    }),
})



// This can come from your database or API.


type props = {
    email: string,
    // users: any[] 
}

type meetDetails = {
    assigner_id: string,
    assigner_name: string,
    // meet_name: string,
    // description: string,
    department: string,
    // date: Date,
    assigner_image_url: string,
    // priority: string,
}



export function AddMeetForm(params: meetDetails) {
    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        defaultValues,
    })
    const [isFetching, setIsFetching] = useState(false)
    const { toast } = useToast()


    async function onSubmit(data: AccountFormValues) {
        // Toast({
        //   title: "You submitted the following values:",
        //   description: (
        //     <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
        //       <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        //     </pre>
        //   ),
        // })
        // let newEmail = email.email
        // console.log("Function is called")
        // setIsFetching(true)
        // let userData = await fetch("/api/getUserDetails", {
        //     method: "POST",
        //     body: JSON.stringify({
        //         email: newEmail
        //     }),
        //     headers: {
        //         "Content-Type": "application/json",
        //     },
        // })


        // let userDataJson = await userData.json();
        // console.log("User data json is:",userDataJson)
        // let userDataObj = userDataJson as { reg_no: string; name: string; email: string; };
        // setIsFetching(false)
        // let submittedData = JSON.parse(JSON.stringify(data))
        // let task: taskdetails = {
        //     ...submittedData,
        //     assigner_id: userDataObj.reg_no,
        //     assigner_name: userDataObj.name,
           
        // };

        let meet: meetDetails = {
            ...data,
            assigner_id: params.assigner_id,
            assigner_name: params.assigner_name,
            department: params.department,
            assigner_image_url: params.assigner_image_url,
            
        }

        setIsFetching(true)


        console.log("Data from on submit", meet)

        const res = await fetch("/api/scheduleMeet", {
            method: "POST",
            body: JSON.stringify(
                meet
            ),
            headers: {
                "Content-Type": "application/json",
            },
        })
        const json = await res.json()
        console.log("json", json)

        // add a toast and refresh after few seconds
        toast ({
            title: "Meet Scheduled",
            description: "Your meet has been scheduled successfully. Page will refresh soon",
           
        })

        setIsFetching(false)

        setTimeout(function () {
            window.location.reload()
        }, 2000);
        

        console.log("Data sent successfully")
    }





    return (
        <div>
            <h3 className="text-lg font-medium">Schedule a meet</h3>
            <p className="text-sm text-muted-foreground">
                Schedule a meet with your department
            </p>

            <Separator />
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                        control={form.control}
                        name="meet_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Meet Title</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter your meeting title" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Enter your meeting title.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description of the meet</FormLabel>
                                <FormControl>
                                    <Input placeholder="Description" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Enter the description of the meet.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-[240px] pl-3 text-left font-normal  hover:border-blue-300 transition-colors",
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
                                    The date for the meet to happen.
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
                            Scheduling meet
                        </Button>
                    ) : (
                        <Button type="submit">
                            Schedule Meet
                        </Button>
                    )}


                    
                    
                    
                </form>
            </Form>
        </div>
    )
}


