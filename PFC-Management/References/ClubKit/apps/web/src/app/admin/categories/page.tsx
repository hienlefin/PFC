import AdminCategoryView from "@/components/dash/admin/categories/CategoryView";

export default function Page() {
	return (
		<div className="mx-auto max-w-6xl pt-4 text-foreground">
			<div className="mb-5 grid grid-cols-2 px-5">
				<h1 className="font-foreground text-3xl font-bold tracking-tight">
					Categories
				</h1>
			</div>
			<div className="px-5">
				<AdminCategoryView />
			</div>
		</div>
	);
}
