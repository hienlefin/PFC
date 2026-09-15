import type { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'User Panel',
  description: 'User Panel for members of the club',
}

export default function Template({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>
}