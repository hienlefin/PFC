import type { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Admin Panel',
  description: 'Admin Panel for leads and co-leads',
}

export default function Template({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>
}