import { CalendarDays } from "lucide-react"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card"
import { AvatarDemo } from "./avatarCustom"

type props = {
   
    task_description: string,
}

export function HoverCardForDesc(params: props) {
    return (
        <HoverCard>
            <HoverCardTrigger>
                
                    <p className=" bg-slate-950">{params.task_description.slice(0,15)}...</p>
                
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
                <div className="flex justify-between space-x-4">
                    
                    <div className="space-y-1">
                    
                        <h4 className="text-sm font-semibold">{params.task_description}</h4>
                        
                    </div>
                </div>

            </HoverCardContent>
        </HoverCard >
    )
}
