"use client"
import React from 'react'
import { useSession } from "next-auth/react";
import { GettingUserDetailsForm } from '@/components/gettingUserDetailsForm';
import { Button } from "@/components/ui/button"
import { signIn } from "next-auth/react"
import { Suspense } from 'react';

export default function Page() {
  const { status, data: session } = useSession();
  // return (
  // )

  function extractRegNo(name: string) {
    const regex = /\b(\d{2}[A-Z]{3}\d{4})\b/;
    const match = name.match(regex);

    if (match) {
      const extractedValue = match[1];
      // console.log(extractedValue);
      return extractedValue;
    } else {
      console.log("No match found");
      return "Not found"
    }
  }
  if (status === "authenticated" && session?.user?.name!==null) {
    console.log(session)
    return (
      <div className="shadow-xl p-8 rounded-md flex flex-col gap-3">

        {/* update their name, id and department */}
        <div className="flex flex-col gap-2">
          <p className="text-xl font-semibold">Welcome {session?.user?.name}</p>
          <p className="text-md font-semibold">Please update your details to continue</p>
        </div>
        <br />
        
        <div>
          <GettingUserDetailsForm reg_no={extractRegNo(session?.user?.name??"")} email={session?.user?.email??""}  />
        </div>
      </div>
    );
  } else {

    return <Button onClick={() => signIn('google')}>Google auth</Button>
  }

}
