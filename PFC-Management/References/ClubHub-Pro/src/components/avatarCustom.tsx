import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from "@/components/ui/avatar"

type props = {
  id:string,
  img_url:string,

}
  
  export function AvatarDemo(props:props) {
    return (
      
      <Avatar className="border-solid border-4 border-blue-200">
        <AvatarImage alt="img" src={props.img_url} />
        <AvatarFallback>{props.id}</AvatarFallback>
      </Avatar>
      
    )
  }
  