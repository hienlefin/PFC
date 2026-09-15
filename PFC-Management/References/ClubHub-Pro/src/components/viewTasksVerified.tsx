import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"



import React from 'react'

// interface Props {
//     tasks: {
//       taskId: string;
//       taskNames: string;
//       category: string;
//       priority: string;
//       date_to_be_completed: Date;
//     }[];
//   }

// interface Props {
//     _id: string;
//     assigner_id: string;
//     assigner_name: string;
//     task_id: string;
//     task_name: string;
//     category: string;
//     priority: string;
//     deadline: Date;
//     isCompleted: boolean;
//     isApproved: boolean;
//     points: number;
//     createdAt: Date;
//     updatedAt: Date;
// }


type Props = {
    tasks: any[];
};

// we will display the following:
// task_id, priority, category, task_name, deadline, points
export const TableVerifiedDemo: React.FC<Props> = ({ tasks }) => {
    function formattedDate(mongoDate:string){

        const mongodbDateString = mongoDate;
    
        // Create a new Date object from the MongoDB date string
        const date = new Date(mongodbDateString);
    
        // Get the individual date components (day, month, and year)
        const day = date.getUTCDate();
        const month = date.getUTCMonth() + 1; // Months are 0-indexed, so add 1
        const year = date.getUTCFullYear();
    
        // Format the date components as "dd-mm-yyyy"
        const formattedDate = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
        return formattedDate
    }
    return (
        <Table>
            <TableCaption>A list of your tasks verified.</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Task ID</TableHead>
                    <TableHead className="w-[100px]">Priority</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Task Name</TableHead>
                    <TableHead className="text-right">Date To Be Completed</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tasks.map((task) => (
                    <TableRow key={task.taskId}>
                        <TableCell className="font-medium">{task.task_id}</TableCell>
                        <TableCell className="font-medium">{task.priority}</TableCell>
                        <TableCell>{task.category}</TableCell>
                        <TableCell>{task.task_name}</TableCell>
                        <TableCell className="text-right">{formattedDate(task.deadline)}</TableCell>
                        <TableCell className="text-right">{task.points}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>

        //     <table>
        //   <thead>
        //     <tr>
        //       <th>Task ID</th>
        //       <th>Task Name</th>
        //       <th>Category</th>
        //       <th>Priority</th>
        //       <th>Date Completed</th>
        //     </tr>
        //   </thead>
        //   <tbody>
        //     {tasks.map((task) => (
        //       <tr key={task.taskId}>
        //         <td>{task.taskId}</td>
        //         <td>{task.taskNames}</td>
        //         <td>{task.category}</td>
        //         <td>{task.priority}</td>
        //         <td>{task.date_to_be_completed.toLocaleString()}</td>
        //       </tr>
        //     ))}
        //   </tbody>
        // </table>
    )
}
