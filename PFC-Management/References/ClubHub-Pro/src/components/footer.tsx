import React from 'react'
import { Icons } from './Icon'
import { GitHubLogoIcon, TwitterLogoIcon, InstagramLogoIcon, DiscordLogoIcon, LinkedInLogoIcon } from '@radix-ui/react-icons'



export default function Footer() {
    return (
        <div className='border-t-2 border-white'>
            <div className="flex border-spacing-1 bg-blend-color-dodge font-light align-middle justify-center">
                <footer className=" text-white p-6">
                    <div className="flex justify-center items-center">
                        <div className="container mx-auto pr-3">
                            Socials:
                        </div>

                        <a href="https://github.com/cyscomvit"><GitHubLogoIcon width={25} height={25} className='mx-2' /></a>
                        <a href="#"><TwitterLogoIcon width={25} height={25} className='mx-2' /></a>
                        <a href="https://www.instagram.com/cyscomvit/"><InstagramLogoIcon width={25} height={25} className='mx-2' /></a>
                        <a href="https://lnk.bio/go?d=https%3A%2F%2Fdiscord.gg%2FGR9Q4AZspB&hash=2388cac7ee446eabd8b19f2b87ae62ce&id=2766525&ext=-1341316&timezone=America%2FNew_York&type=1"><DiscordLogoIcon width={25} height={25} className='mx-2' /></a>
                        <a href="https://lnk.bio/go?d=https%3A%2F%2Fwww.linkedin.com%2Fcompany%2Fcyscomvit&hash=bd3a6779ee09c73cf4ea70909b0a93c1&id=2766552&ext=-1341316&timezone=America%2FNew_York&type=1"><LinkedInLogoIcon width={25} height={25} className='mx-2' /></a>

                        {/* <Image src={DiscordLogoIcon as string}/> */}
                    </div>
                </footer>


            </div>
            <div className="container text-center ">

                {"© 2023 CYSCOM All rights reserved"}
                <br />
                {"    CYBERSECURITY STUDENT COMMUNITY"}
            </div>
            <br />
     
        </div>
    )
}