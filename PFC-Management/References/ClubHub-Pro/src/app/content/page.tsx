"use client"
import React, { use } from 'react'

import { GettingUserDetailsForm } from '@/components/gettingUserDetailsForm';
import { Button } from "@/components/ui/button"
import { signIn, signOut } from "next-auth/react"
import { useSession } from "next-auth/react"
import { Suspense } from "react"
import { useRouter } from "next/navigation"
import { useState, useTransition, FormEvent, ChangeEvent } from "react"
import { usePathname } from "next/navigation"
import { useEffect } from 'react';
import { useMemo } from 'react';
import { Menu, Sheet } from 'lucide-react';
import { Menubar } from '@radix-ui/react-menubar';
import { MenubarDemo } from '@/components/navbar';
import { Hero } from '@/components/hero';
import { TableDemo } from '@/components/viewTasksAssigned';
import { TableCompletedDemo } from '@/components/viewTasksCompleted';
import { TableVerifiedDemo } from '@/components/viewTasksVerified';
import { AddTaskForm } from '@/components/addTaskForm';
import { SubmitTaskForm } from '@/components/submitTaskForm';
import { AvatarDemo } from '@/components/avatarCustom';
import { AssignedTaskTableUser } from '@/components/assign_table_user/TableFinal';

import { ApprovedTaskTableUser } from '@/components/approve_table_user/TableFinal';
import { CompletedTaskTableUser } from '@/components/completed_table_user/TableFinal';
import { Progress } from "@/components/ui/progress";
import Image from 'next/image'
import logo from '../bw_cyscom.png'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import Footer from '@/components/footer';



export default function Page() {


  const [data, setData] = useState<{ email?: string }>()
  const [user_id, setUserId] = useState<any>()

  const [assignedTasks, setAssignedTasks] = useState<any[]>()
  const [completedTasks, setCompletedTasks] = useState<any[]>()
  const [approvedTasks, setapprovedTasks] = useState<any[]>()
  const [user_details, setUserDetails] = useState<any>()

  const [isLoading, setLoading] = useState(true)
  const { status, data: session } = useSession();

  const [progress, setProgress] = React.useState(2);

  // React.useEffect(() => {
  //   // This effect sets the progress to 66 after 500ms.
  //   const timer = setTimeout(() => setProgress(95), 2000);
  //   return () => clearTimeout(timer);
  // }, []);

  // Function to dynamically change the progress value
  const changeProgressValue = (newValue: any) => {
    setProgress(newValue);
  };

  useEffect(() => {
    // async function fetchUserData() {
    setProgress(100)
    let id = ''
    let dept = ''
    // if no session, go to /
    if (session === null || undefined) {
      console.log("session is null or undefined")
      window.location.href = "/"
    }
    if (isLoading) {
      fetchUserData().then(datanew => {
        if (datanew === null || undefined) {
          console.log("data is null or undefined")
        }
        else {
          setData(data as any)
          setUserDetails(datanew as any)
          console.log("data from client is: ", datanew.reg_no)
          setUserId(datanew.reg_no)
          id = datanew.reg_no
          dept = datanew.dept
          if (dept !="con"){
            window.location.href = "/"
          }
          setProgress(25)

        }
        // setLoading(false)
      }).then(() => {

        fetchAssignedTasks(id).then(data => {
          if (data === null || undefined) {
            console.log("data is null or undefined")
          }
          else {

            setAssignedTasks(data as any)
            console.log(data)

          }
          setLoading(false)
          setProgress(60)

        })
      }).then(() => {
        fetchCompletedtasks(id).then(data => {
          if (data === null || undefined) {
            console.log("data is null or undefined")
          }
          else {
            setCompletedTasks(data as any)
            console.log(data)

          }
          setLoading(false)
          setProgress(80)

        })
      }).then(() => {
        fetchApprovedTasks(id).then(data => {
          if (data === null || undefined) {
            console.log("data is null or undefined")
          }
          else {
            setapprovedTasks(data as any)
            console.log(data)

          }
          setLoading(false)
          setProgress(100)

        })
      })
      setProgress(0)

    }
  }, [[approvedTasks, completedTasks, assignedTasks, isLoading, session, user_details]])

  // useEffect(() => {
  //   if (isLoading) {
  //     fetchUserData().then(data => {
  //       if (data === null || undefined) {
  //         console.log("data is null or undefined")
  //       } else {
  //         setData(data as any)
  //         console.log("data is",  data)
  //       }
  //       setLoading(false)
  //     })
  //   }
  // }, [isLoading])



  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [isFetching, setIsFetching] = useState(false)













  async function fetchUserData() {
    // console.log(session?.user?.email)
    setIsFetching(true)

    let newdata: any = await fetch(`/api/getUserDetails`, {
      method: 'POST',
      body: JSON.stringify({
        email: session?.user?.email
      })
    })
    newdata = await newdata?.json()
    if (newdata === null || undefined) {
      console.log("data is null or undefined")
    } else if (newdata?.role === "admin") {
      router.push("/content/admin")
      console.log("data is", newdata)
    }
    // console.log("the data is", newdata.id)
    setIsFetching(false)
    // console.log(newdata)
    return newdata
  }


  const fetchAssignedTasks = async (id: any) => {
    console.log("data inside fetchAssignedTasks is:", id)
    setIsFetching(true)

    // let newdata = await fetch('url/api/getUserDetails', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     email: session?.user?.email
    //   })
    // })
    // let newdataa = await newdata?.json()
    // console.log("User Details: ", newdataa)

    console.log(id)

    let response = await fetch(`/api/getAssignedTasksUser`, {
      method: 'POST',
      body: JSON.stringify({
        assignee_id: id
      })
    })

    let data = await response?.json()
    data = data.map((task: any) => {
      task.deadline = task.deadline.split('T')[0]
      // reverse it from right to left
      task.deadline = task.deadline.split('-').reverse().join('-')

      return task
    })
    console.log("Assigned Tasks: ", data)
    setIsFetching(false)
    return data



  }

  const fetchCompletedtasks = async (id: any) => {
    console.log("data inside fetchCompletedTasks is:", id)
    setIsFetching(true)

    // let newdata = await fetch('url/api/getUserDetails', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     email: session?.user?.email
    //   })
    // })
    // let newdataa = await newdata?.json()
    // console.log("User Details: ", newdataa)

    console.log(id)

    let response = await fetch(`/api/getCompletedTasksUser`, {
      method: 'POST',
      body: JSON.stringify({
        assignee_id: id
      })
    })

    let data = await response?.json()
    data = data.map((task: any) => {
      task.deadline = task.deadline.split('T')[0]
      // reverse it from right to left
      task.deadline = task.deadline.split('-').reverse().join('-')

      return task
    })
    console.log("Completed Tasks: ", data)
    setIsFetching(false)
    return data
  }

  const fetchApprovedTasks = async (id: any) => {
    console.log("data inside fetchApprovedTasks is:", id)
    setIsFetching(true)

    // let newdata = await fetch('url/api/getUserDetails', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     email: session?.user?.email
    //   })
    // })
    // let newdataa = await newdata?.json()
    // console.log("User Details: ", newdataa)

    console.log(id)

    let response = await fetch(`/api/getApprovedTasksUser`, {
      method: 'POST',
      body: JSON.stringify({
        assignee_id: id
      })
    })

    let data = await response?.json()
    data = data.map((task: any) => {
      task.deadline = task.deadline.split('T')[0]
      // reverse it from right to left
      task.deadline = task.deadline.split('-').reverse().join('-')

      return task
    })
    console.log("Verified Tasks: ", data)
    setIsFetching(false)
    return data
  }

  // for refresh button
  const handleRefrech = async () => {
    startTransition(() => {
      setIsFetching(true)
    })
    await fetchUserData()
    await fetchAssignedTasks(session?.user?.email)
    setIsFetching(false)
  }



  if (status === "authenticated" && assignedTasks !== undefined && completedTasks !== undefined && approvedTasks !== undefined && user_details !== undefined) {
    // console.log(session)
    // let newdata = fetchUserData()
    // console.log(newdata)



    // changeProgressValue(95)

    return (
      <div className="mx-auto    ">

        <div className="grid grid-cols-3 justify-center items-center border-b-2 w-[100%] border-white  bg-black">
          <div className="flex items-center pl-4">
            <Image src={logo} alt="CYSCOM" width={40} height={40} />
          </div>

          <div className="flex items-center justify-center">
            <div>
              <MenubarDemo
                name={user_details.name}
                email={user_details.email}
                role={user_details.role}
                dept={user_details.dept}
                id={user_details.id}
              />
            </div>
            <div>
              <AvatarDemo
                id={user_details.name.slice(0, 1)}
                img_url={session?.user?.image ?? ""}
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Button className="mb-5 mt-5 mr-2" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
        </div>
        {/* <Button onClick={() => fetchUserData()}>Fetch user data</Button> */}
        <div>{data?.email}</div>

        {/* update their name, id and department */}
        <div>
          {/* <GettingUserDetailsForm /> */}
          {/* forms and everything else */}
          <div className="mx-auto p-4 pt-12">
            <div className="mx-auto lg:flex-row justify-center">
            <Hero points={user_details.points} no_assigned_tasks={assignedTasks.length} no_completed_tasks={completedTasks.length} no_approved_tasks={approvedTasks.length} name={user_details.name} />
            </div>
            {/* <div className="mx-auto justify-center p-5"> */}
            {/* <TableDemo tasks={assignedTasks as any} /> */}
            {/* <TableVerifiedDemo tasks={completedTasks as any} /> */}
            {/* <AddTaskForm email={session?.user?.email ?? ""} /> */}
            {/* <SubmitTaskForm email={session?.user?.email ?? ""} /> */}
            {/* <DialogDemo /> */}
            {/* </div> */}
            {/* <div className="mx-auto justify-center p-5"> */}

            {/* <TableCompletedDemo tasks={completedTasks as any} /> */}


            {/* </div> */}
            {/* <div className="mx-auto justify-center p-5">  */}

            {/* <TableVerifiedDemo tasks={approvedTasks as any} />  */}
            {/* <ApprovedTaskTableUser tasks={approvedTasks} /> */}

            {/* </div> */}

            {/* <div className="mx-auto justify-center p-5">  */}

            {/* <TableVerifiedDemo tasks={approvedTasks as any} />  */}

            {/* </div> */}


            {/* <div className="mx-auto justify-center p-5"> */}

            {/* <DataTableDemo /> */}
            {/* <AssignedTaskTableUser tasks={assignedTasks} /> */}
            {/* </div> */}

            <div className="mx-auto justify-center p-5">

              {/* <DataTableDemo /> */}
              <h2 className="text-4xl font-bold tracking-tight">View Tasks</h2>
              <br />

              <Tabs defaultValue="assigned">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="assigned">Assigned</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                </TabsList>
                <TabsContent value="assigned">
                  <AssignedTaskTableUser tasks={assignedTasks} email={session.user?.email as string} />

                </TabsContent>
                <TabsContent value="completed">
                  <CompletedTaskTableUser tasks={completedTasks} />

                </TabsContent>
                <TabsContent value="approved">
                  <ApprovedTaskTableUser tasks={approvedTasks} />

                </TabsContent>
              </Tabs>

              <Footer />
            </div>



          </div>

        </div>
        <br />
        <br />



      </div>
    );
  }
  else if (status === "authenticated") {
    return (
      <div>
        <Progress value={progress} className="w-[60%] mx-auto align-center sm:m-96 sm:w-[60%] m-20 md:m-32 md:w-[70%] lg:w-[80%]" />

      </div>
    );
  }


  else {

    // go to / route
   return(
    <div>Loading</div>
   )
  }

}
