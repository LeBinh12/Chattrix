interface AuthFormProps {
  title: string;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}

export default function AuthForm({ title, onSubmit, children }: AuthFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="max-w-xl w-full mx-auto bg-white shadow-xl rounded-2xl p-8 border border-gray-100"
    >
      <h2 className="text-3xl font-bold mb-6 text-center text-[#2665b1]">
        {title}
      </h2>
      {children}
    </form>
  );
}
