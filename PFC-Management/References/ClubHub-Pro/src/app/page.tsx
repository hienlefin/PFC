"use client"

import * as React from "react"
import { MoonIcon, SunIcon } from "@radix-ui/react-icons"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import Link from "next/link"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MenubarDemo } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { AddTaskForm } from "@/components/addTaskForm"
import { Separator } from "@/components/ui/separator"
import { TableDemo } from "@/components/viewTasksAssigned"
import { TableVerifiedDemo } from "@/components/viewTasksVerified"

import { signIn, signOut } from "next-auth/react"
import { useSession } from "next-auth/react";
// import { Router } from "next/router"
import { useRouter } from "next/navigation"
import { UserAuthForm } from "@/components/userAuthForms"
// import router from "next/router"
import { AvatarDemo } from "@/components/avatarCustom"
import Image from "next/image"
import logo from "../app/bw_cyscom.png"
import { Icons } from "@/components/Icon"
import Footer from "@/components/footer"
import hackoverflow from "../../public/Hackoverflow.jpeg"
import cyber_odessy from "../../public/Cyber_odessy.jpeg"
import hackerspace from "../../public/Hackerspace.jpeg"
export default function ModeToggle() {
  const { setTheme } = useTheme()

  const [user_details, setUserDetails] = useState<any>()

  const [isLoading, setLoading] = useState(true)

  const [url_user, setUrlUser] = useState('')
  const { status, data: session } = useSession();
  useEffect(() => {
    // async function fetchUserData() {
    let id = ''
    if (isLoading) {
      fetchUserData().then(datanew => {
        if (datanew === null || undefined) {
          console.log("data is null or undefined")
        }
        else {
          // setData(data as any)
          setUserDetails(datanew as any)
          console.log("data from client is: ", datanew.id)
          // setUserId(datanew.id)
          id = datanew.id

        }
        setLoading(false)
      })
    }
  }
  )





  {/* <div className="mx-auto flex justify-center sticky"> */ }

  {/* </div> */ }
  {/* <div className="mx-auto flex justify-center"> */ }
  {/* <Hero /> */ }
  {/* </div> */ }
  {/* <div className="mx-auto flex justify-center"> */ }
  {/* <MainForms /> */ }
  {/* <div className="space-y-6"> */ }
  {/* <AddTaskForm /> */ }
  {/* </div> */ }

  {/* </div> */ }

  {/* <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex"> */ }
  {/* <div className="flex items-center justify-between space-y-2"> */ }
  {/* <div> */ }
  {/* <h2 className="text-2xl font-bold tracking-tight">Welcome back!</h2> */ }
  {/* <p className="text-muted-foreground"> */ }
  {/* Here&apos;s a list of your tasks for this month! */ }
  {/* </p> */ }
  {/* </div> */ }
  {/* </div> */ }
  {/* <TableDemo tasks={taskNames} /> */ }
  {/* <TableVerifiedDemo tasks={taskCompleted}/> */ }


  {/* </div> */ }
  const router = useRouter()
  let url = ''


  async function fetchUserData() {
    // console.log(session?.user?.email)
    // setIsFetching(true)


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
      if (newdata?.dept === "dev") {

        setUrlUser(`${newdata.dept}/admin`)
      }
      else if (newdata?.dept === "con") {
        setUrlUser(`content/admin`)
      }
      else if (newdata?.dept === "tec") {
        setUrlUser(`tech/admin`)
      }
      else if (newdata?.dept === "des") {
        setUrlUser(`design/admin`)
      }
      else if (newdata?.dept === "soc") {
        setUrlUser(`social/admin`)
      }


      // router.push("/dev/admin")
      // console.log("data is", newdata)
    }
    else if (newdata?.role === "core") {
      if (newdata?.dept === "dev") {

        setUrlUser(`${newdata.dept}/admin`)
      }
      else if (newdata?.dept === "con") {
        setUrlUser(`content/admin`)
      }
      else if (newdata?.dept === "tec") {
        setUrlUser(`tech/admin`)
      }
      else if (newdata?.dept === "des") {
        setUrlUser(`design/admin`)
      }
      else if (newdata?.dept === "soc") {
        setUrlUser(`social/admin`)
      }


      // router.push("/dev/admin")
      // console.log("data is", newdata)
    }
    else if (newdata?.role === "user") {
      if (newdata?.dept === "dev") {
        setUrlUser(`${newdata.dept}`)
      }
      else if (newdata?.dept === "con") {
        setUrlUser(`content`)
      }
      else if (newdata?.dept === "tec") {
        setUrlUser(`tech`)
      }
      else if (newdata?.dept === "des") {
        setUrlUser(`design`)
      }
      else if (newdata?.dept === "soc") {
        setUrlUser(`social`)
      }


      // router.push("/dev/admin")
      // console.log("data is", newdata)
    }
    // console.log("the data is", newdata.id)
    // setIsFetching(false)
    // console.log(newdata)
    return newdata
  }

  function getValueLabel(value: string) {
    switch (value) {
      case "dev":
        return "dev";
      case "con":
        return "content";
      case "tec":
        return "tech";
      case "des":
        return "design";
      case "soc":
        return "social";
      case "eve":
        return "event";
      default:
        return "";
    }
  }


  async function userStatus(email: string) {
    const res = await fetch('/api/getUserDetails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email }),
    })
    const data = await res.json()
    if (data) {
      if (data.completedSignUp === false) {
        router.push('/firstTime')
      }
      else if (data.completedSignUp === true) {
        // router.push(`${data.dept}`)
        // router.push(getValueLabel(data.dept))
        console.log("The user completed sign up")



      }
    }
  }

  // what shall we display??
  // upcoming meetings
  // upcoming events
  // infographics, blogs, news
  // infographics and news will be in form of photos
  // blog will be a thumbnail, and a description and a link pointing to it...
  if (status === "authenticated" && user_details !== undefined) {
    userStatus(session?.user?.email || "")
    console.log(session)
    return (
      <div className="mx-auto">
        {/* <MenubarDemo  />  */}
        <div className="grid grid-cols-3 justify-center items-center border-b-2 w-[100%] border-white bg-black">
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


        <div className="flex-1 space-y-4  pt-10 pb-4">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-5xl font-bold tracking-tight flex mx-auto">Good day! Here is something to exicte you up!</h2>
          </div>
          
            




          <h1 className="flex font-bold text-3xl mx-auto lg:justify-center pt-3 ">HACKERSPACE</h1>

          <div className="lg:flex lg:flex-col pt-5 lg:col-span-2 md:flex-col lg:justify-center items-center  ">
            <div className="flex flex-row p-1">


              <Image src={hackerspace} alt="blog-poster" width={750} height={750} className="flex mx-auto lg:mx-0 border mt-4 " />
            </div>

            <div className="flex flex-col col-span-2 justify-center ">

              <p className="container flex  md:mx-auto lg:mx-0 font-light mt-4">{"Yet another successful event by CYSCOM! HACKERSPACE was an immersive one-day workshop led by the renowned ethical hacker, Renganathan. It was followed by a CTF session which involved active participation from all the attendees. Top performers were awarded with monetory rewards and various goodies were given to all the participants."}</p>

            </div>
          </div>

          <br />

          <h1 className="flex font-bold text-3xl mx-auto lg:justify-center pt-2 ">Cyber Odyssey</h1>

          <div className="lg:flex lg:flex-col pt-5 lg:col-span-2 md:flex-col lg:justify-center items-center  ">
            <div className="flex flex-row p-1">

              <Image src={cyber_odessy} alt="news-poster" width={750} height={750} className="flex mx-auto lg:mx-0 border mt-4 " />
            </div>

            <div className="flex flex-col col-span-2 p-4 justify-center ">

              <p className="container flex  md:mx-auto lg:mx-0 font-light mt-4">

                {"Cheers to the phenomenal triumph of CYBER ODYSSEY! Our cyber awareness hint and hunt game witnessed an overwhelming turnout, with a remarkable 100+ participants actively engaging in the event. Explore the digital frontier with us as we celebrate the grand success of Cyber Odyssey, where each participant played a crucial role in enhancing their cybersecurity acumen. Its not just a game; it's a collective effort towards a more secure online world."}</p>

            </div>
          </div>

          <br />

          <h1 className="flex font-bold text-3xl mx-auto lg:justify-center pt-2 ">HackOverFlow</h1>

          <div className="lg:flex lg:flex-col pt-5 lg:col-span-2 md:flex-col lg:justify-center items-center  ">
            <div className="flex flex-row p-1">

              <Image src={hackoverflow} alt="info-poster" width={750} height={750} className="flex mx-auto lg:mx-0 border mt-4 " />
            </div>

            <div className="flex flex-col col-span-2 p-4 justify-center ">

              <p className=" container flex  md:mx-auto lg:mx-0 font-light mt-4">{"Hats off to the spectacular 24-hour extravaganza of ingenuity and innovation at CYSCOM's MEGA HACKATHON & IDEATHON! This incredible event brought together a diverse pool of talent, where participants unleashed their creativity to craft ingenious and effective solutions for real-world challenges. The atmosphere was charged with enthusiasm as participants collaborated and competed in a fun-filled marathon of hacking and ideation. Kudos to all the brilliant minds who transformed ideas into solutions during this mega event! Your contributions have undoubtedly left a lasting mark on the intersection of talent and innovation."}</p>

            </div>
          </div>
          <br />
          <br />









        </div>



        {/* <div className="flex flex-col mx-auto justify-center p-5">
         
        </div> */}

        {/* <Link href={`${user_details.dept}`}> Go to your Department</Link> */}

        <div className="flex flex-row-reverse p-4 lg:p-10">

          <Link href={url_user}>
            <Button className="flex">
              <Icons.logo className="mr-2 h-4 w-4" />
              Go to your Department
            </Button>
          </Link>

        </div>

        <Footer />

      </div>


    );
  } else {

    // return <Button onClick={() => signIn('google')}>Google auth</Button>
    return (
      <>

        <div className="container relative  items-center justify-center grid ">


          <div className="lg:p-8">
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
              <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Sign In!
                </h1>

              </div>
              <UserAuthForm />



            </div>
          </div>
        </div>
      </>
    )
  }






}
