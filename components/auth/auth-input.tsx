import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AuthInputProps {
  id?: string
  label: string
  placeholder?: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  helperText?: string
}

export function AuthInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  helperText,
}: AuthInputProps) {
  const inputId = id || label.replace(/\s+/g, "-").toLowerCase()
  return (
    <div className="space-y-2">
      <Label className="text-gray-700" htmlFor={inputId}>
        {label}
      </Label>
      <Input
        id={inputId}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="h-12 rounded-2xl border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
      />
      {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
    </div>
  )
}
