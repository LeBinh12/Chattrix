import { motion } from "framer-motion";

interface AuthFormProps {
  title: string;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}

export default function AuthForm({ title, onSubmit, children }: AuthFormProps) {
  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={onSubmit}
      className="w-full"
    >
      {/* Header */}
      <div className="mb-8">
        <p className="text-3xl font-bold text-[#00568c] mb-4 text-center">
          {title}
        </p>
        <div className="h-1 w-20 bg-gradient-to-r from-[#00568c] to-[#003d63] rounded-full mx-auto" />
      </div>
      
      {/* Form Content */}
      <div className="space-y-5">
        {children}
      </div>
    </motion.form>
  );
}
