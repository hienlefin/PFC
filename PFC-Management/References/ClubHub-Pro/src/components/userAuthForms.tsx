"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Icons } from "@/components/Icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "next-auth/react"
import { set } from "mongoose"

// import { Icons } from "next/dist/lib/metadata/types/metadata-types"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> { }

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
    }, 3000)
  }

  async function signInFunction(){
    setIsLoading(true)
    await signIn('google')
    setIsLoading(false)
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Continue with Google
          </span>
        </div>
      </div>
      {/* <Button variant="outline" type="button" disabled={isLoading} onClick={()=>signIn('google')}>
        {isLoading ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.google className="mr-2 h-4 w-4" />
        )}{" "}
        Google
      </Button> */}

      {isLoading ? (
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
          Please wait for few seconds
        </Button>
      ) : (
        <Button variant="outline" type="button" onClick={()=>signInFunction()}>
          Sign In
        </Button>
      )}
    </div>
  )
}