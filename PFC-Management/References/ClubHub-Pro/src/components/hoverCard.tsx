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
    name: string,
    img_url: string,
    task_name: string,
    task_description: string,
}

export function HoverCardForImage(params: props) {
    return (
        <HoverCard>
            <HoverCardTrigger asChild>
                <Button variant="link">
                    <AvatarDemo id={params.name.slice(0, 1)} img_url={params.img_url} />
                </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
                <div className="flex justify-between space-x-4">
                    <Avatar>
                        <AvatarImage src={params.img_url} />
                        <AvatarFallback>{params.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h4 className="text-sm font-semibold">{params.name}</h4>
                        <h4 className="text-sm font-semibold">{params.task_name}</h4>
                        <p className="text-sm">
                           {params.task_description}
                           {/* Fake Task description hehehehe */}
                        </p>
                        
                    </div>
                </div>

            </HoverCardContent>
        </HoverCard >
    )
}
