export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-500 via-primary-300 to-primary-100">
      <div className="card p-8 animate-pulse w-full max-w-sm">
        <div className="h-16 w-16 mx-auto mb-4 rounded-xl bg-primary-200 dark:bg-primary-700/50" />
        <div className="h-6 bg-primary-200 dark:bg-primary-700/50 rounded w-3/4 mx-auto mb-2" />
        <div className="h-4 bg-primary-200 dark:bg-primary-700/50 rounded w-1/2 mx-auto" />
        <div className="mt-6 space-y-3">
          <div className="h-10 bg-primary-200 dark:bg-primary-700/50 rounded-lg w-full" />
          <div className="h-10 bg-primary-200 dark:bg-primary-700/50 rounded-lg w-full" />
        </div>
      </div>
    </div>
  );
}
