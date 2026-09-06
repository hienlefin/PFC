
"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon, CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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

import { connectMongoDB } from "@/lib/mongodb"
// import { User } from "lucide-react"

const departments = [
    { label: "Developmemt", value: "dev" },
    { label: "Content", value: "con" },
    { label: "Technical", value: "tec" },
    { label: "Design", value: "des" },
    { label: "Social Media", value: "soc" },
    { label: "Event Management", value: "eve" }

] as const
import User from "@/models/user"
import { useSession } from "next-auth/react"
import { Suspense } from "react"
import { useRouter } from "next/navigation"
import { useState, useTransition, FormEvent, ChangeEvent } from "react"
import { usePathname } from "next/navigation"
import { Toast } from "@/components/ui/toast"
import { useToast } from "./ui/use-toast"


const accountFormSchema = z.object({
    dept: z
        .string()
        .min(2, {
            message: "Name must be at least 2 characters.",
        })
        .max(30, {
            message: "Name must not be longer than 30 characters.",
        }),
    name: z
        .string()
        .min(2, {
            message: "Completion value must be at least 2 characters.",
        }),



})

type AccountFormValues = z.infer<typeof accountFormSchema>

// This can come from your database or API.
const defaultValues: Partial<AccountFormValues> = {
    // name: "Your name",
    // dob: new Date("2023-01-23"),
}

type props = {
    reg_no: string,
    email: string,
}

export function GettingUserDetailsForm(params: props) {
    const { status, data: session } = useSession();
    const { toast } = useToast()
    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        defaultValues,
    })
    const router = useRouter()
    const pathname = usePathname()
    const [isPending, startTransition] = useTransition()
    const [isFetching, setIsFetching] = useState(false)
    const [data, setData] = useState({ department: "", name: "", id: "", email: "" })

    const isMutating = isPending || isFetching





    // const onSubmit = (event: React.FormEvent, data: AccountFormValues) => {
    // const onSubmit = async (event: FormEvent<HTMLFormElement>, data: AccountFormValues) => {
    //     event.preventDefault();
    //     let newData: { department: string; name: string; id: string; email?: string } =
    //     {
    //         department: data.department,
    //         name: data.name,
    //         id: data.id,
    //         email: session?.user?.email ?? undefined
    //     }
    //     console.log(newData)
    //     const res = await fetch('http://localhost:3000/api/user', {
    //         method: 'POST',
    //         body: JSON.stringify(newData),
    //         headers: {
    //             'Content-type': 'application/json',
    //         },

    //     })
    //     await res.json()
    //     setIsFetching(false)
    //     setData(newData as any)
    //     startTransition(() => {
    //         router.push("/dashboard")
    //     })            


    async function onSubmit(data: AccountFormValues) {
        // toast({
        //   title: "You submitted the following values:",
        //   description: (
        //     <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
        //       <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        //     </pre>
        //   ),
        // })
        // console.log(data)
        // data.email = params.email
        // data.reg_no = params.reg_no
        let newdata: any = JSON.stringify(data)
        newdata = JSON.parse(newdata)
        newdata.email = params.email
        console.log(params.reg_no)
        newdata.reg_no = params.reg_no
        newdata.user_image = session?.user?.image

        setIsFetching(true)
        const res = await fetch('/api/userFirstTime', {
            method: 'POST',
            body: JSON.stringify(newdata),
            headers: {
                'Content-type': 'application/json',
            },

        })
        setIsFetching(false)
        const res2 = await res.json()
        console.log("Response is", res2)
        if(res2.newUser.role==="admin"){

            toast({
                title: `Updated successfully as admin! Going to home...`,
                description:"Please wait..."
            })
            
            setTimeout(() => {
                router.push(`/`)
            }, 2000);
            
            
        }
        else if(res2.newUser.role==="core"){
            toast({
                title: `Updated successfully as core! Going to home...`,
                description:"Please wait..."
            })
            
            setTimeout(() => {
                router.push(`/`)
            }, 2000);
        }

        else{
            toast({
                title: `Updated successfully! Going to home...`,
                description:"Please wait..."
            })
    
            setTimeout(() => {
                router.push(`/`)
            }, 2000);
        }
    }


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* <form method="POST" action={'http://localhost:3000/api/user'} > */}
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Your Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Your Name" {...field} />
                            </FormControl>
                            <FormDescription>
                                Enter your name.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {/* <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Your for this website</FormLabel>
                            <FormControl>
                                <Input placeholder="Your ID" {...field} />
                            </FormControl>
                            <FormDescription>
                                Enter your ID.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Your email for this website</FormLabel>
                            <FormControl>
                                <Input placeholder={session?.user?.email ?? "You are not allowed to enter email, sign up first "} {...field} />
                            </FormControl>
                            <FormDescription>
                                Enter your email.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                /> */}
                <FormField
                    control={form.control}
                    name="dept"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Select Department</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                                "w-[200px] justify-between",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            {field.value
                                                ? departments.find(
                                                    (department) => department.value === field.value
                                                )?.label
                                                : "Select category"}
                                            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search language..." />
                                        <CommandEmpty>No completion found.</CommandEmpty>
                                        <CommandGroup>
                                            {departments.map((department) => (
                                                <CommandItem
                                                    value={department.label}
                                                    key={department.value}
                                                    onSelect={() => {
                                                        form.setValue("dept", department.value)
                                                    }}
                                                >
                                                    <CheckIcon
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            department.value === field.value
                                                                ? "opacity-100"
                                                                : "opacity-0"
                                                        )}
                                                    />
                                                    {department.label}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <FormDescription>
                                Choose the primary department you have been alotted.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>

                    )}
                />

               

                {isFetching ? (
                    <Button disabled>
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
                        Updating
                    </Button>
                ) : (
                    <Button onClick={()=>onSubmit}>
                        Update Details
                    </Button>
                )}

            </form>
        </Form>

    )
}
