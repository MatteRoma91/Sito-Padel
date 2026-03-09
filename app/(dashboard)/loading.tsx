export default function DashboardLoading() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-8 bg-primary-200 dark:bg-primary-700/50 rounded-lg w-3/4 mb-6" />
      <div className="space-y-4">
        <div className="h-4 bg-primary-200 dark:bg-primary-700/50 rounded w-full" />
        <div className="h-4 bg-primary-200 dark:bg-primary-700/50 rounded w-5/6" />
        <div className="h-4 bg-primary-200 dark:bg-primary-700/50 rounded w-4/5" />
        <div className="h-4 bg-primary-200 dark:bg-primary-700/50 rounded w-full" />
        <div className="h-4 bg-primary-200 dark:bg-primary-700/50 rounded w-2/3" />
      </div>
      <div className="mt-8 flex gap-3">
        <div className="h-10 bg-primary-200 dark:bg-primary-700/50 rounded-lg w-24" />
        <div className="h-10 bg-primary-200 dark:bg-primary-700/50 rounded-lg w-32" />
      </div>
    </div>
  );
}
