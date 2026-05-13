interface Props {
  error: string;
  message: string;
}

export default function AuthAlerts({ error, message }: Props) {
  return (
    <>
      {error ? (
        <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {message}
        </div>
      ) : null}
    </>
  );
}
