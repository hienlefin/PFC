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
import { Menu } from 'lucide-react';
import { Menubar } from '@radix-ui/react-menubar';
import { MenubarDemo } from '@/components/navbar';
import { Hero } from '@/components/hero';
import { AddTaskForm } from '@/components/addTaskForm';
import { TableVerifiedDemo } from '@/components/viewTasksVerified';
import { TableDemo } from '@/components/viewTasksAssigned';
import { ApproveTaskForm } from '@/components/approveTaskForm';
import { id } from 'date-fns/locale';
import { TableCompletedDemo } from '@/components/viewTasksCompleted';
import { SubmitTaskForm } from '@/components/submitTaskForm';
import { Avatar } from '@/components/ui/avatar';
import { AvatarDemo } from '@/components/avatarCustom';
import { Separator } from '@radix-ui/react-dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssignedTaskTableUser } from '@/components/assign_table_user/TableFinal';
import { CompletedTaskTableUser } from '@/components/completed_table_user/TableFinal';
import { ApprovedTaskTableUser } from '@/components/approve_table_user/TableFinal';
import { AssignTaskTableAdmin } from '@/components/assign_table_admin/TableFinal';
import { CompletedTaskTableAdmin } from '@/components/completed_table_admin/TableFinal';
import { ApprovedTaskTableAdmin } from '@/components/approve_table_admin/TableFinal';
// import { AddMeetForm } from '@/components/addMeetForm';
import { Progress } from '@/components/ui/progress';
import { set } from 'mongoose';
import Image from 'next/image';
import logo from "../../bw_cyscom.png"
import Footer from '@/components/footer';


export default function Page() {

  const [data, setData] = useState<{ email?: string }>()
  const [isLoading, setLoading] = useState(true)
  const { status, data: session } = useSession();
  const [user_id, setUserId] = useState<any>()
  const [user_details, setUserDetails] = useState<any>()

  const [assignedTasks, setAssignedTasks] = useState<any[]>()
  const [completedTasks, setCompletedTasks] = useState<any[]>()
  const [approvedTasks, setapprovedTasks] = useState<any[]>()
  const [users, setUsers] = useState<any[]>()
  // const [normalUsers, setNormalUsers] = useState<any[]>()


  const [points, setPoints] = useState<any>()

  const [progress, setProgress] = useState<any>(0)

  // in future add logic for points here and update the state variable
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
    else
    if (isLoading) {
      fetchUserData().then(datanew => {
        if (datanew === null || undefined) {
          console.log("data is null or undefined")
        }
        else {
          setData(data as any)
          setUserDetails(datanew as any)
          console.log("data from client is: ", datanew.id)
          setUserId(datanew.id)
          id = datanew.reg_no
          dept = datanew.dept
          if(dept === "con" && datanew.role === "admin"){
            console.log("admin of content")
          }
          else if(dept === "con" && datanew.role === "core"){
            console.log("core of content")
          }
          else if(datanew.role === "core"){
            console.log("core of non content")
          }
          else if(dept === "con" && datanew.role === "user"){
            window.location.href = "/content"
          }
          else{
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
      }).then(() => {
        fetchAllUsers().then(data => {
          if (data === null || undefined) {
            console.log("data is null or undefined")
          }
          else {
            setUsers(data as any)
            console.log(data)

          }
          setLoading(false)
          setProgress(100)

        })
      })
      setProgress(0)

    }
    // timer = setTimeout(() => setProgress(95), 1000);
    //  clearTimeout(timer);

  }, [approvedTasks, completedTasks, assignedTasks, isLoading, session, user_details])

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




  // so in the admin page, he/she can view the tasks assigned, completed and verified
  // by them. They can also assign new tasks to users, and verify it once completed
  // so 3 tables - viewTasks, viewCompletedTasks, viewVerifiedTasks(same for user)



  // async function fetchUserData() {
  //     // console.log(session?.user?.email)
  //     setIsFetching(true)

  //     let newdata: any = await fetch('url/api/getUserDetails', {
  //         method: 'POST',
  //         body: JSON.stringify({
  //             email: session?.user?.email
  //         })
  //     })
  //     newdata = await newdata?.json()
  //     if (newdata?.role === "user") {
  //         // router.push("/admin")
  //         console.log("Admin page")
  //         console.log(newdata)
  //     }
  //     else if (newdata?.role === "admin") {
  //         // let url = newdata?.dept as string
  //         // router.replace(`/${url}`)
  //         setIsFetching(false)
  //         // console.log(newdata)
  //         setData(newdata)
  //         return newdata
  //     }
  // }

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
    } else if (newdata?.role === "user") {
      //   router.push("/admin")
      // router.replace(`${newdata?.dept}`}`)
      router.replace('/content')
      console.log("data is", newdata)
    }
    // console.log("the data is", newdata.id)
    setIsFetching(false)
    // console.log(newdata)
    return newdata
  }

  const fetchAssignedTasks = async (assigner_id: any) => {
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

    let response = await fetch(`/api/getAssignedTasksAdmin`, {
      method: 'POST',
      body: JSON.stringify({
        assigner_id: assigner_id
      })
    })

    let data = await response?.json()
    // remove time part from date
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

  const fetchCompletedtasks = async (assigner_id: any) => {
    console.log("data inside fetchCompletedTasks is:", assigner_id)
    setIsFetching(true)

    // let newdata = await fetch('url/api/getUserDetails', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     email: session?.user?.email
    //   })
    // })
    // let newdataa = await newdata?.json()
    // console.log("User Details: ", newdataa)

    console.log(assigner_id)

    let response = await fetch(`/api/getCompletedTasksAdmin`, {
      method: 'POST',
      body: JSON.stringify({
        assigner_id: assigner_id
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



  const fetchApprovedTasks = async (assigner_id: any) => {
    console.log("data inside fetchApprovedTasks is:", assigner_id)
    setIsFetching(true)

    // let newdata = await fetch('url/api/getUserDetails', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     email: session?.user?.email
    //   })
    // })
    // let newdataa = await newdata?.json()
    // console.log("User Details: ", newdataa)

    console.log(assigner_id)

    let response = await fetch(`/api/getApprovedTasksAdmin`, {
      method: 'POST',
      body: JSON.stringify({
        assigner_id: assigner_id
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

  const fetchAllUsers = async () => {
    setIsFetching(true)

    let response = await fetch(`/api/getAllUsers`, {
      method: 'GET',
    })

    let data = await response?.json()
    console.log("All Users: ", data)
    setIsFetching(false)
    return data
  }




  if (status === "authenticated" && assignedTasks !== undefined && completedTasks !== undefined && approvedTasks !== undefined && users !== undefined && user_details !== undefined) {


    // console.log(session)
    // let newdata = fetchUserData()
    // console.log(newdata)
    return (

      <div className='mx-auto'>
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



        {/* <div className="flex flex-row items-center border-b-2 w-[100%] border-white bg-slate-950">
          <div className='flex items-center'>
            <Image src={logo} alt="CYSCOM" width={40} height={40} className='mx-auto' />
          </div>
          <div className=" flex items-center">
            <MenubarDemo name={user_details.name} email={user_details.email} role={user_details.role} dept={user_details.dept} id={user_details.id} />
            <AvatarDemo id={user_details.name.slice(0, 1)} img_url={session?.user?.image ?? ""} />

          </div>
          <div className='flex items-center '>

            <Button className='m-5 mr-auto ' onClick={() => signOut()}>Sign out</Button>
          </div>
        </div> */}



        {/* <Button onClick={() => fetchUserData()}>Fetch user data</Button> */}

        {/* update their name, id and department */}




        {/* forms and everything else */}
        <div className="mx-auto p-4 pt-12">
          <div className="mx-auto flex lg:flex-row ">
          <Hero points={'∞'} no_assigned_tasks={assignedTasks.length} no_completed_tasks={completedTasks.length} no_approved_tasks={approvedTasks.length} name={user_details.name} />
          </div>
          <div className="mx-auto  justify-center">
            <br />
            <div className="mx-auto justify-center p-5">
              {/* <TableDemo tasks={assignedTasks as any} /> */}
              {/* <TableVerifiedDemo tasks={completedTasks as any} /> */}
              {/* <AddTaskForm email={session?.user?.email ?? ""} /> */}
              {/* <SubmitTaskForm email={session?.user?.email ?? ""} /> */}

            </div>
            <div className="mx-auto justify-center p-5">

              {/* <DataTableDemo /> */}
              <h2 className="text-4xl font-bold tracking-tight">Manage Tasks!</h2>
              <br />


              <Tabs defaultValue="assigned">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="assigned">Assigned</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                </TabsList>
                <TabsContent value="assigned">
                  {/* <AssignedTaskTableAdmin tasks={assignedTasks} email={session.user?.email as string} /> */}
                  <AssignTaskTableAdmin tasks={assignedTasks} email={session?.user?.email as string} />

                </TabsContent>
                <TabsContent value="completed">
                  {/* <CompletedTaskTableAdmin tasks={completedTasks} /> */}
                  <CompletedTaskTableAdmin tasks={completedTasks} email={session?.user?.email as string} />

                </TabsContent>
                <TabsContent value="approved">
                  {/* <ApprovedTaskTableAdmin tasks={approvedTasks} /> */}
                  <ApprovedTaskTableAdmin tasks={approvedTasks} />

                </TabsContent>
              </Tabs>
              <br />
              <br />
              <h2 className="text-4xl font-bold tracking-tight">Assign Work</h2>
              <br />

              <Tabs defaultValue="assignTask">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="assignTask">Assign Task</TabsTrigger>
                  <TabsTrigger value="scheduleMeet">Schedule Meet</TabsTrigger>
                </TabsList>
                <TabsContent value="assignTask">
                  <br />

                  <AddTaskForm email={session?.user?.email ?? ""} users={users as any} />

                </TabsContent>
                <TabsContent value="scheduleMeet">
                  <br />

                  <h1 className="">Coming Soon</h1>

                  {/* <AddMeetForm assigner_id={user_details.reg_no} assigner_name={user_details.name} department={user_details.dept} assigner_image_url={user_details.user_image} /> */}
                </TabsContent>

              </Tabs>





            </div>

            <br />
            <br />

            <Footer />

          </div>
        </div>


      </div>

    )
  }

  else if (status === "authenticated") {
    return (
      <div>
        <Progress value={progress} className="w-[60%] mx-auto align-center sm:m-96 sm:w-[60%] m-20 md:m-32 md:w-[70%] lg:w-[80%]" />
      </div>
    )
  }


  else {

   return (
    <div>Loading</div>
   )
  }

}
